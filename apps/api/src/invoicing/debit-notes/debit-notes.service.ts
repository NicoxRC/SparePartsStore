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
import { computeLineAmounts } from '../../common/utils/invoice-math.util';
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
import { CreateDebitNoteDto } from './dto/create-debit-note.dto';
import { CreateDebitNoteItemDto } from './dto/create-debit-note-item.dto';
import { DebitNoteResponseDto } from './dto/debit-note-response.dto';
import { QueryDebitNotesDto } from './dto/query-debit-notes.dto';
import { DebitNote } from './entities/debit-note.entity';

/**
 * Dataico's confirmed "nota débito" request shape has no documented
 * success-response example (unlike "Envío Factura" — see
 * docs/phases/PHASE_10_INVOICING_STANDARD.md). This assumes the same
 * general document-response shape as invoices, since it's the same
 * underlying Dataico resource family (dian_status/cufe/uuid/urls/qr/
 * messages) — an assumption, not a guess from nothing, same reasoning
 * already applied to the invoice query endpoint's response. First thing
 * to verify once a real debit note goes through.
 */
interface DataicoDebitNoteResponse {
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

@Injectable()
export class DebitNotesService {
  constructor(
    @InjectRepository(DebitNote)
    private readonly debitNotesRepository: Repository<DebitNote>,
    private readonly dataicoClient: DataicoClientService,
    private readonly dataicoConfig: DataicoConfig,
    private readonly invoicesService: InvoicesService,
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
    private readonly cashRegisterService: CashRegisterService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * A "nota débito" — an additional charge against an already-sent
   * invoice, most often a product the original sale missed. Confirmed
   * request: `POST /debit_notes` with `{ actions, debit_note }`, linking
   * the original invoice by its Dataico uuid (`invoice_id`), no DIAN
   * `resolution_number` in `numbering` (flexible numbering, just this
   * store's own prefix — see `DataicoConfig.debitNotePrefix`).
   *
   * The `customer` block is NOT re-collected from the caller — it's read
   * straight from the target invoice's own stored `request_payload`, so
   * it's guaranteed to match what was legally on that invoice (see
   * `extractCustomer()`).
   *
   * Item tax entries only carry `tax_category`/`tax_rate` (no `tax_base`/
   * `tax_amount` the way invoice items need) — confirmed from a real,
   * non-health-contaminated credit note example sharing this same
   * request family; Dataico evidently computes the base/amount itself
   * for notes.
   */
  async create(
    dto: CreateDebitNoteDto,
    createdById: string,
  ): Promise<DebitNoteResponseDto> {
    await this.cashRegisterService.assertOpenToday();

    const invoice = await this.invoicesService.findOne(dto.invoiceId);
    if (!invoice.dataicoUuid) {
      throw new BadRequestException(
        'Esta factura no tiene un uuid de Dataico registrado — no se puede emitir una nota débito contra ella.',
      );
    }

    const customer = this.extractCustomer(invoice);
    const items = await this.resolveItems(dto.items);

    const issueDate = getStoreToday();
    const prefix = this.dataicoConfig.debitNotePrefix;
    const number = await this.resolveNextNumber(prefix);

    const requestPayload = {
      actions: { send_dian: true, send_email: false },
      debit_note: {
        env: 'PRODUCCION',
        dataico_account_id: this.dataicoConfig.accountId,
        invoice_id: invoice.dataicoUuid,
        issue_date: toDataicoDate(issueDate),
        number,
        numbering: { prefix, flexible: true },
        reason: 'OTROS',
        customer,
        items: items.map((item) => ({
          sku: item.product.reference,
          measuring_unit: '94',
          quantity: item.quantity,
          description: item.product.description,
          price: item.unitPrice,
          taxes:
            item.taxRate > 0
              ? [{ tax_category: 'IVA', tax_rate: item.taxRate }]
              : [],
        })),
      },
    };

    const response = await this.dataicoClient.post<DataicoDebitNoteResponse>(
      '/debit_notes',
      requestPayload,
    );

    // A debit note means more product physically left the store than the
    // original invoice captured — decrement stock the same way a normal
    // sale line does, only after Dataico has actually accepted the note.
    for (const item of items) {
      const movementDto: CreateMovementDto = {
        productId: item.product.id,
        quantity: -item.quantity,
        notes: `Nota débito ${prefix}${number} — corrección factura ${invoice.prefix}${invoice.number}`,
      };
      await this.inventoryService.createMovement(movementDto, createdById);
    }

    const note = this.debitNotesRepository.create({
      number,
      prefix,
      invoice,
      reason: 'OTROS',
      issueDate,
      totalAmount: items.reduce(
        (sum, item) => sum + item.taxBase + item.taxAmount,
        0,
      ),
      requestPayload,
      createdBy: { id: createdById } as DebitNote['createdBy'],
      ...this.mapDataicoResponse(response),
    });

    const saved = await this.debitNotesRepository.save(note);
    saved.invoice = invoice;
    return DebitNoteResponseDto.fromEntity(saved);
  }

  async findAll(
    query: QueryDebitNotesDto,
  ): Promise<PaginatedResponseDto<DebitNoteResponseDto>> {
    const { page, limit, invoiceId } = query;
    const qb = this.debitNotesRepository
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
      data: notes.map((note) => DebitNoteResponseDto.fromEntity(note)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<DebitNote> {
    const note = await this.debitNotesRepository.findOne({
      where: { id },
      relations: ['invoice'],
    });
    if (!note) {
      throw new NotFoundException('Debit note not found');
    }
    return note;
  }

  /**
   * Reads the `customer` block straight out of the target invoice's own
   * stored `request_payload` rather than asking the caller to re-supply
   * it — guarantees the note's customer data matches what was legally on
   * the original invoice, and this app already stores the exact body
   * sent (see `InvoicesService.create()`/`docs/DATABASE.md`).
   */
  private extractCustomer(invoice: Invoice): Record<string, unknown> {
    const payload = invoice.requestPayload as
      | { invoice?: { customer?: Record<string, unknown> } }
      | undefined;
    const customer = payload?.invoice?.customer;
    if (!customer) {
      throw new BadRequestException(
        'No se pudieron recuperar los datos del cliente de la factura original.',
      );
    }
    return customer;
  }

  /** Same stock-check-before-Dataico-call reasoning as InvoicesService.resolveItems(). */
  private async resolveItems(
    itemDtos: CreateDebitNoteItemDto[],
  ): Promise<ResolvedItem[]> {
    return Promise.all(
      itemDtos.map(async (itemDto) => {
        const product = await this.productsService.findOne(itemDto.productId);
        if (product.stock < itemDto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.reference}. Stock actual: ${product.stock}, solicitado: ${itemDto.quantity}.`,
          );
        }

        const { unitPrice, taxBase, taxAmount } = computeLineAmounts(
          Number(product.salePrice),
          itemDto.quantity,
          itemDto.taxRate,
        );

        return {
          product,
          quantity: itemDto.quantity,
          taxRate: itemDto.taxRate,
          unitPrice,
          taxBase,
          taxAmount,
        };
      }),
    );
  }

  private mapDataicoResponse(
    response: DataicoDebitNoteResponse,
  ): Partial<DebitNote> {
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
    const result = await this.debitNotesRepository
      .createQueryBuilder('note')
      .select('MAX(note.number)', 'max')
      .where('note.prefix = :prefix', { prefix })
      .getRawOne<{ max: string | null }>();

    if (result?.max) {
      return Number(result.max) + 1;
    }

    return Number(
      this.configService.get<string>('DEBIT_NOTE_NUMBER_START', '1'),
    );
  }
}
