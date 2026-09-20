import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashRegisterService } from '../../cash-register/cash-register.service';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import {
  computeLineAmounts,
  resolveTaxRate,
} from '../../common/utils/invoice-math.util';
import { getStoreToday } from '../../common/utils/store-date.util';
import { CreateMovementDto } from '../../inventory/dto/create-movement.dto';
import { InventoryService } from '../../inventory/inventory.service';
import { Product } from '../../products/entities/product.entity';
import { ProductsService } from '../../products/products.service';
import { DataicoClientService } from '../dataico/dataico-client.service';
import { DataicoConfig } from '../dataico/dataico.config';
import { toDataicoDate } from '../dataico/dataico-date.util';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { CreateCreditNoteItemDto } from './dto/create-credit-note-item.dto';
import { CreditNoteResponseDto } from './dto/credit-note-response.dto';
import { QueryCreditNotesDto } from './dto/query-credit-notes.dto';
import { CreditNote } from './entities/credit-note.entity';

/**
 * Dataico's confirmed "nota crédito" request shape has no documented
 * success-response example (unlike "Envío Factura" — see
 * docs/phases/PHASE_10_INVOICING_STANDARD.md). This assumes the same
 * general document-response shape as invoices, since it's the same
 * underlying Dataico resource family (dian_status/cufe/uuid/urls/qr/
 * messages) — an assumption, not a guess from nothing, same reasoning
 * already applied to the invoice query endpoint's response. First thing
 * to verify once a real credit note goes through.
 */
interface DataicoCreditNoteResponse {
  number?: string;
  dian_status?: string;
  customer_status?: string;
  email_status?: string;
  cufe?: string;
  uuid?: string;
  xml_url?: string;
  pdf_url?: string;
  qrcode?: string;
  dian_messages?: string[];
  xml?: string;
  [key: string]: unknown;
}

interface ResolvedItem {
  product: Product;
  quantity: number;
  taxRate: number;
  unitPrice: number;
  taxBase: number;
  taxAmount: number;
}

interface OriginalInvoiceFields {
  customer: Record<string, unknown>;
  paymentMeans: string;
  paymentMeansType: string;
}

@Injectable()
export class CreditNotesService {
  constructor(
    @InjectRepository(CreditNote)
    private readonly creditNotesRepository: Repository<CreditNote>,
    private readonly dataicoClient: DataicoClientService,
    private readonly dataicoConfig: DataicoConfig,
    private readonly invoicesService: InvoicesService,
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
    private readonly cashRegisterService: CashRegisterService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * A "nota crédito" — a return/reduction against an already-sent invoice
   * (a returned product, an overcharge, an error correction). Confirmed
   * request: `POST /credit_notes` with `{ actions, credit_note }`, linking
   * the original invoice by its Dataico uuid (`invoice_id`), no DIAN
   * `resolution_number` in `numbering` (flexible numbering, just this
   * store's own prefix — see `DataicoConfig.creditNotePrefix`).
   *
   * The `customer`/`payment_means`/`payment_means_type` fields are NOT
   * re-collected from the caller — they're read straight from the target
   * invoice's own stored `request_payload`, so they're guaranteed to match
   * what was legally on that invoice (see `extractOriginalInvoiceFields()`).
   * `payment_date` reuses the invoice's own stored `paymentDate` column.
   *
   * Item tax entries only carry `tax_category`/`tax_rate` (no `tax_base`/
   * `tax_amount` the way invoice items need), and `measuring-unit` is
   * hyphenated — both confirmed from the real, non-health-contaminated
   * credit note example this was built against (Dataico evidently
   * computes the item base/amount itself for notes; the hyphen is this
   * resource's own field name, distinct from invoices'/debit notes'
   * `measuring_unit` — see that example's own consistent use across all
   * of its items).
   *
   * Unlike a debit note, a credit note returns merchandise — inventory
   * moves the opposite direction (stock increases, no "insufficient
   * stock" check makes sense here) and `reason` is `'DEVOLUCION'`, the
   * only value confirmed against a real, clean credit note example (the
   * original shared example's `'ANULACION'` came from the health-
   * contaminated fixture — see docs/GLOSSARY.md — and isn't trusted here).
   */
  async create(
    dto: CreateCreditNoteDto,
    createdById: string,
  ): Promise<CreditNoteResponseDto> {
    await this.cashRegisterService.assertOpenToday();

    const invoice = await this.invoicesService.findOne(dto.invoiceId);
    if (!invoice.dataicoUuid) {
      throw new BadRequestException(
        'Esta factura no tiene un uuid de Dataico registrado — no se puede emitir una nota crédito contra ella.',
      );
    }

    const { customer, paymentMeans, paymentMeansType } =
      this.extractOriginalInvoiceFields(invoice);
    const items = await this.resolveItems(dto.items);

    const issueDate = getStoreToday();
    const prefix = this.dataicoConfig.creditNotePrefix;
    const number = await this.resolveNextNumber(prefix);

    const requestPayload = {
      actions: { send_dian: true, send_email: false },
      credit_note: {
        env: 'PRODUCCION',
        dataico_account_id: this.dataicoConfig.accountId,
        invoice_id: invoice.dataicoUuid,
        issue_date: toDataicoDate(issueDate),
        payment_means: paymentMeans,
        payment_means_type: paymentMeansType,
        payment_date: toDataicoDate(invoice.paymentDate ?? issueDate),
        number,
        numbering: { prefix, flexible: true },
        reason: 'DEVOLUCION',
        customer,
        items: items.map((item) => ({
          sku: item.product.reference,
          'measuring-unit': '94',
          quantity: item.quantity,
          description: item.product.description,
          price: item.unitPrice,
          taxes:
            item.taxRate > 0
              ? [{ tax_category: 'IVA', tax_rate: item.taxRate }]
              : [],
        })),
        charges: [],
      },
    };

    const response = await this.dataicoClient.post<DataicoCreditNoteResponse>(
      '/credit_notes',
      requestPayload,
    );

    // A credit note returns merchandise — stock comes back, opposite
    // direction from a debit note/normal sale, only after Dataico has
    // actually accepted the note.
    for (const item of items) {
      const movementDto: CreateMovementDto = {
        productId: item.product.id,
        quantity: item.quantity,
        notes: `Nota crédito ${prefix}${number} — devolución factura ${invoice.prefix}${invoice.number}`,
      };
      await this.inventoryService.createMovement(movementDto, createdById);
    }

    const note = this.creditNotesRepository.create({
      number,
      prefix,
      invoice,
      reason: 'DEVOLUCION',
      issueDate,
      totalAmount: items.reduce(
        (sum, item) => sum + item.taxBase + item.taxAmount,
        0,
      ),
      requestPayload,
      createdBy: { id: createdById } as CreditNote['createdBy'],
      ...this.mapDataicoResponse(response),
    });

    const saved = await this.creditNotesRepository.save(note);
    saved.invoice = invoice;
    return CreditNoteResponseDto.fromEntity(saved);
  }

  async findAll(
    query: QueryCreditNotesDto,
  ): Promise<PaginatedResponseDto<CreditNoteResponseDto>> {
    const { page, limit, invoiceId } = query;
    const qb = this.creditNotesRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.invoice', 'invoice')
      .orderBy('note.createdAt', 'DESC');

    if (invoiceId) {
      qb.andWhere('invoice.id = :invoiceId', { invoiceId });
    }

    const [notes, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: notes.map((note) => CreditNoteResponseDto.fromEntity(note)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<CreditNote> {
    const note = await this.creditNotesRepository.findOne({
      where: { id },
      relations: ['invoice'],
    });
    if (!note) {
      throw new NotFoundException('Credit note not found');
    }
    return note;
  }

  /**
   * Reads `customer`/`payment_means`/`payment_means_type` straight out of
   * the target invoice's own stored `request_payload` rather than asking
   * the caller to re-supply them — guarantees this data matches what was
   * legally on the original invoice, and this app already stores the
   * exact body sent (see `InvoicesService.create()`/`docs/DATABASE.md`).
   */
  private extractOriginalInvoiceFields(
    invoice: Invoice,
  ): OriginalInvoiceFields {
    const payload = invoice.requestPayload as
      | {
          invoice?: {
            customer?: Record<string, unknown>;
            payment_means?: string;
            payment_means_type?: string;
          };
        }
      | undefined;
    const body = payload?.invoice;
    if (!body?.customer || !body.payment_means || !body.payment_means_type) {
      throw new BadRequestException(
        'No se pudieron recuperar los datos de la factura original.',
      );
    }
    return {
      customer: body.customer,
      paymentMeans: body.payment_means,
      paymentMeansType: body.payment_means_type,
    };
  }

  /**
   * No stock-sufficiency check — a credit note returns merchandise, so
   * any quantity is always valid to add back, unlike a debit note or a
   * normal sale where stock can run out.
   */
  private async resolveItems(
    itemDtos: CreateCreditNoteItemDto[],
  ): Promise<ResolvedItem[]> {
    return Promise.all(
      itemDtos.map(async (itemDto) => {
        const product = await this.productsService.findOne(itemDto.productId);
        const taxRate = resolveTaxRate(product);

        const { unitPrice, taxBase, taxAmount } = computeLineAmounts(
          Number(product.salePrice),
          itemDto.quantity,
          taxRate,
        );

        return {
          product,
          quantity: itemDto.quantity,
          taxRate,
          unitPrice,
          taxBase,
          taxAmount,
        };
      }),
    );
  }

  private mapDataicoResponse(
    response: DataicoCreditNoteResponse,
  ): Partial<CreditNote> {
    const responsePayload: Record<string, unknown> = { ...response };
    delete responsePayload.xml;

    return {
      dataicoNumber: response.number ?? null,
      dianStatus: response.dian_status ?? null,
      customerStatus: response.customer_status ?? null,
      emailStatus: response.email_status ?? null,
      cufe: response.cufe ?? null,
      dataicoUuid: response.uuid ?? null,
      xmlUrl: response.xml_url ?? null,
      pdfUrl: response.pdf_url ?? null,
      qrCode: response.qrcode ?? null,
      dianMessages: response.dian_messages ?? null,
      responsePayload,
    };
  }

  /** Same MAX()-read simplification as InvoicesService.resolveNextNumber(). */
  private async resolveNextNumber(prefix: string): Promise<number> {
    const result = await this.creditNotesRepository
      .createQueryBuilder('note')
      .select('MAX(note.number)', 'max')
      .where('note.prefix = :prefix', { prefix })
      .getRawOne<{ max: string | null }>();

    if (result?.max) {
      return Number(result.max) + 1;
    }

    return Number(
      this.configService.get<string>('CREDIT_NOTE_NUMBER_START', '1'),
    );
  }
}
