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
import { round } from '../../common/utils/invoice-math.util';
import { withNumberingLock } from '../../common/utils/numbering-lock.util';
import { getStoreToday } from '../../common/utils/store-date.util';
import { CreateMovementDto } from '../../inventory/dto/create-movement.dto';
import { InventoryService } from '../../inventory/inventory.service';
import { Product } from '../../products/entities/product.entity';
import { ProductsService } from '../../products/products.service';
import { DataicoClientService } from '../dataico/dataico-client.service';
import { DataicoConfig } from '../dataico/dataico.config';
import { toDataicoDate } from '../dataico/dataico-date.util';
import {
  InvoicedItem,
  readInvoicedItems,
} from '../invoices/invoiced-items.util';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { CreateCreditNoteItemDto } from './dto/create-credit-note-item.dto';
import { CreditNoteResponseDto } from './dto/credit-note-response.dto';
import { QueryCreditNotesDto } from './dto/query-credit-notes.dto';
import { ReturnableLineDto } from './dto/returnable-line.dto';
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
  /** The sku the original invoice carried — what this note credits. */
  sku: string;
  product: Product;
  quantity: number;
  taxRate: number;
  unitPrice: number;
  taxBase: number;
  taxAmount: number;
}

/**
 * DEVOLUCION returns part of an invoice; ANULACION voids all of it. Both
 * seen in Dataico's own credit note examples — ANULACION only in its
 * "Anular FE" requests, which also carry health-sector fields this store
 * doesn't send (see docs/phases/PHASE_10_INVOICING_STANDARD.md).
 */
type CreditNoteReason = 'DEVOLUCION' | 'ANULACION';

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

  /** Issues the note under the numbering lock — see withNumberingLock(). */
  create(
    dto: CreateCreditNoteDto,
    createdById: string,
    cashRegisterNumber: number,
  ): Promise<CreditNoteResponseDto> {
    return withNumberingLock(
      this.creditNotesRepository.manager,
      'credit_notes',
      () => this.issue(dto, createdById, cashRegisterNumber),
    );
  }

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
   * stock" check makes sense here). Only lines of the original invoice can
   * be returned, never more than what's left after earlier notes, and the
   * `reason` is derived, not chosen: the whole invoice at once is an
   * `'ANULACION'`, anything less a `'DEVOLUCION'` (see `resolveReason()`).
   */
  private async issue(
    dto: CreateCreditNoteDto,
    createdById: string,
    cashRegisterNumber: number,
  ): Promise<CreditNoteResponseDto> {
    const cashRegister =
      await this.cashRegisterService.assertOpenToday(cashRegisterNumber);

    const invoice = await this.invoicesService.findOne(dto.invoiceId);
    if (!invoice.dataicoUuid) {
      throw new BadRequestException(
        'Esta factura no tiene un uuid de Dataico registrado — no se puede emitir una nota crédito contra ella.',
      );
    }

    const { customer, paymentMeans, paymentMeansType } =
      this.extractOriginalInvoiceFields(invoice);
    const lines = await this.buildReturnableLines(invoice);
    const items = await this.resolveItems(dto.items, lines);
    const reason = this.resolveReason(items, lines);

    const issueDate = getStoreToday();
    const prefix = this.dataicoConfig.creditNotePrefix;
    const number = await this.resolveNextNumber(prefix);

    const requestPayload = {
      actions: {
        send_dian: this.dataicoConfig.sendDian,
        send_email: this.dataicoConfig.sendEmail,
      },
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
        reason,
        customer,
        items: items.map((item) => ({
          sku: item.sku,
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
        notes: `Nota crédito ${prefix}${number} — ${reason === 'ANULACION' ? 'anulación' : 'devolución'} factura ${invoice.prefix}${invoice.number}`,
      };
      await this.inventoryService.createMovement(movementDto, createdById);
    }

    const note = this.creditNotesRepository.create({
      number,
      prefix,
      invoice,
      reason,
      issueDate,
      totalAmount: round(
        items.reduce((sum, item) => sum + item.taxBase + item.taxAmount, 0),
      ),
      requestPayload,
      cashRegister: { id: cashRegister.id } as CreditNote['cashRegister'],
      createdBy: { id: createdById } as CreditNote['createdBy'],
      ...this.mapDataicoResponse(response),
    });

    const saved = await this.creditNotesRepository.save(note);
    saved.invoice = invoice;
    return CreditNoteResponseDto.fromEntity(saved);
  }

  /** What the credit note form offers for `invoiceId` — see buildReturnableLines(). */
  async findReturnableLines(invoiceId: string): Promise<ReturnableLineDto[]> {
    const invoice = await this.invoicesService.findOne(invoiceId);
    return this.buildReturnableLines(invoice);
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
   * The invoice's lines (one per sku — repeated lines are added up, at the
   * first one's price) with what earlier credit notes against it already
   * returned taken off. Prices come from the invoice's stored
   * `request_payload`: a return is credited at what the customer actually
   * paid, not at today's price. Earlier notes are read the same way, from
   * the items each one sent. Called inside the numbering lock when issuing,
   * so two notes against the same invoice can't both pass the check.
   */
  private async buildReturnableLines(
    invoice: Invoice,
  ): Promise<ReturnableLineDto[]> {
    const invoiced = new Map<string, InvoicedItem>();
    for (const item of readInvoicedItems(invoice.requestPayload)) {
      const existing = invoiced.get(item.sku);
      invoiced.set(
        item.sku,
        existing
          ? { ...existing, quantity: existing.quantity + item.quantity }
          : item,
      );
    }

    const earlierNotes = await this.creditNotesRepository.find({
      where: { invoice: { id: invoice.id } },
    });
    const returned = new Map<string, number>();
    for (const note of earlierNotes) {
      for (const item of readNoteItems(note.requestPayload)) {
        returned.set(item.sku, (returned.get(item.sku) ?? 0) + item.quantity);
      }
    }

    return [...invoiced.values()].map((item) => ({
      sku: item.sku,
      description: item.description,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      invoicedQuantity: item.quantity,
      returnableQuantity: Math.max(
        0,
        item.quantity - (returned.get(item.sku) ?? 0),
      ),
    }));
  }

  /**
   * Each requested line must be on the invoice with enough left to return.
   * The product is looked up by the invoiced sku so its stock can come
   * back. No stock-sufficiency check — a credit note returns merchandise.
   */
  private async resolveItems(
    itemDtos: CreateCreditNoteItemDto[],
    lines: ReturnableLineDto[],
  ): Promise<ResolvedItem[]> {
    const requested = new Map<string, number>();
    for (const itemDto of itemDtos) {
      requested.set(
        itemDto.sku,
        (requested.get(itemDto.sku) ?? 0) + itemDto.quantity,
      );
    }

    return Promise.all(
      [...requested].map(async ([sku, quantity]) => {
        const line = lines.find((candidate) => candidate.sku === sku);
        if (!line) {
          throw new BadRequestException(
            `El producto ${sku} no está en la factura original.`,
          );
        }
        if (quantity > line.returnableQuantity) {
          throw new BadRequestException(
            line.returnableQuantity === 0
              ? `El producto ${sku} ya fue devuelto por completo.`
              : `Del producto ${sku} solo quedan ${line.returnableQuantity} unidades por devolver.`,
          );
        }

        const product = await this.productsService.findByReference(sku);
        if (!product) {
          throw new BadRequestException(
            `El producto ${sku} ya no existe en el inventario, no se puede devolver.`,
          );
        }

        const taxBase = round(line.unitPrice * quantity);
        return {
          sku,
          product,
          quantity,
          taxRate: line.taxRate,
          unitPrice: line.unitPrice,
          taxBase,
          taxAmount: round(taxBase * (line.taxRate / 100)),
        };
      }),
    );
  }

  /**
   * ANULACION only when this note returns the whole invoice in one go —
   * every line at its full invoiced quantity, nothing returned before.
   * Once a partial return exists, the rest goes back as a DEVOLUCION:
   * voiding an invoice that was already partly credited would credit
   * those units twice.
   */
  private resolveReason(
    items: ResolvedItem[],
    lines: ReturnableLineDto[],
  ): CreditNoteReason {
    const isWholeInvoice =
      lines.length > 0 &&
      lines.every(
        (line) =>
          line.returnableQuantity === line.invoicedQuantity &&
          items.some(
            (item) =>
              item.sku === line.sku && item.quantity === line.invoicedQuantity,
          ),
      );
    return isWholeInvoice ? 'ANULACION' : 'DEVOLUCION';
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

/** The `sku`/`quantity` of each item a stored credit note sent. */
function readNoteItems(
  requestPayload: unknown,
): Array<{ sku: string; quantity: number }> {
  const items = (requestPayload as { credit_note?: { items?: unknown } } | null)
    ?.credit_note?.items;
  if (!Array.isArray(items)) return [];

  return (items as Array<{ sku?: unknown; quantity?: unknown }>).flatMap(
    (item) =>
      typeof item?.sku === 'string' && typeof item.quantity === 'number'
        ? [{ sku: item.sku, quantity: item.quantity }]
        : [],
  );
}
