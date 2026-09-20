import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DianResolutionDocumentType } from '../../common/enums/dian-resolution-document-type.enum';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import {
  computeLineAmounts,
  resolveTaxRate,
} from '../../common/utils/invoice-math.util';
import { getStoreToday } from '../../common/utils/store-date.util';
import { CashRegisterService } from '../../cash-register/cash-register.service';
import { CreateMovementDto } from '../../inventory/dto/create-movement.dto';
import { InventoryService } from '../../inventory/inventory.service';
import { Product } from '../../products/entities/product.entity';
import { ProductsService } from '../../products/products.service';
import { DataicoClientService } from '../dataico/dataico-client.service';
import { DataicoConfig } from '../dataico/dataico.config';
import { toDataicoDate } from '../dataico/dataico-date.util';
import { ResolutionsService } from '../resolutions/resolutions.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { ResendInvoiceDto } from './dto/resend-invoice.dto';
import { Invoice } from './entities/invoice.entity';

/** Dataico's confirmed "Envío Factura" success response, minus `xml` (see Invoice entity). */
interface DataicoInvoiceResponse {
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
  /** Already net of any per-line discount — see resolveItems(). */
  unitPrice: number;
  taxBase: number;
  taxAmount: number;
}

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    private readonly dataicoClient: DataicoClientService,
    private readonly dataicoConfig: DataicoConfig,
    private readonly resolutionsService: ResolutionsService,
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
    private readonly cashRegisterService: CashRegisterService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * `skipInventoryEffects` is internal-only — never set by the public
   * controller. QuotationsService.invoice() sets it when converting an
   * already-decremented quotation into an invoice: the stock for those
   * items left the store when the quotation itself was created/edited,
   * so both the sufficiency check AND the decrement below would be wrong
   * to run a second time here (by now `product.stock` no longer includes
   * those reserved units at all, so a plain sufficiency check would fail
   * a perfectly legitimate sale).
   */
  async create(
    dto: CreateInvoiceDto,
    createdById: string,
    options: { skipInventoryEffects?: boolean } = {},
  ): Promise<InvoiceResponseDto> {
    await this.cashRegisterService.assertOpenToday();

    // subtype: 'ELECTRONICO' is explicit, not incidental — a business can
    // hold more than one resolution under documentType: invoice (this
    // store used to also have a 'POS' one, see docs/phases/PHASE_12_POS.md
    // before its removal), and findActiveForDocumentType() picks whichever
    // matching row was created most recently. Without this filter, a
    // resolution created for a different purpose (even by mistake — the
    // column is a free string, not an enum) could silently become "the"
    // active one for standard invoicing.
    const resolution = await this.resolutionsService.findActiveForDocumentType(
      DianResolutionDocumentType.INVOICE,
      'ELECTRONICO',
    );
    if (!resolution) {
      throw new BadRequestException(
        'No hay una resolución DIAN de factura electrónica asociada. Asocia una en Resoluciones DIAN antes de facturar.',
      );
    }

    const items = await this.resolveItems(dto, options.skipInventoryEffects);

    // "Todos son para el mismo día" — issueDate is never client-supplied,
    // it's always the store's current local (Bogotá) day, the same day
    // gated by the open cash register (see assertOpenToday() above).
    const issueDate = getStoreToday();
    // Only relevant when paying on credit — otherwise it's the same day.
    const paymentDate = dto.paymentDate ?? issueDate;
    const number = await this.resolveNextNumber(resolution.prefix);

    const requestPayload = {
      actions: { send_dian: true, send_email: false },
      invoice: {
        env: 'PRODUCCION',
        dataico_account_id: this.dataicoConfig.accountId,
        operation: 'ESTANDAR',
        invoice_type_code: 'FACTURA_VENTA',
        issue_date: toDataicoDate(issueDate),
        order_reference: '',
        number,
        payment_means: dto.paymentMeans,
        payment_means_type: dto.paymentMeansType,
        payment_date: toDataicoDate(paymentDate),
        numbering: {
          resolution_number: resolution.resolutionNumber,
          prefix: resolution.prefix,
          flexible: true,
        },
        customer: {
          tax_level_code: dto.customerTaxLevelCode,
          regimen: dto.customerRegimen ?? '',
          party_type: dto.customerPartyType,
          party_identification_type: dto.customerIdentificationType,
          party_identification: dto.customerIdentification,
          country_code: dto.customerCountryCode,
          department: dto.customerDepartment,
          city: dto.customerCity,
          address_line: dto.customerAddressLine,
          email: dto.customerEmail,
          first_name: dto.customerFirstName ?? '',
          family_name: dto.customerFamilyName ?? '',
          company_name: dto.customerCompanyName ?? '',
        },
        items: items.map((item) => ({
          sku: item.product.reference,
          measuring_unit: '94',
          quantity: item.quantity,
          description: item.product.description,
          price: item.unitPrice,
          taxes: [
            {
              tax_category: 'IVA',
              tax_rate: item.taxRate,
              tax_base: item.taxBase,
              tax_amount: item.taxAmount,
            },
          ],
          retentions: [],
        })),
        notes: dto.notes ?? [],
      },
    };

    const response = await this.dataicoClient.post<DataicoInvoiceResponse>(
      '/invoices',
      requestPayload,
    );

    // Only decrement stock once Dataico has actually accepted the invoice —
    // see the module-level note on known limitations if this step or the
    // save below fails after Dataico already succeeded. Skipped entirely
    // when converting a quotation — see create()'s docstring.
    if (!options.skipInventoryEffects) {
      for (const item of items) {
        const movementDto: CreateMovementDto = {
          productId: item.product.id,
          quantity: -item.quantity,
          notes: `Venta - Factura ${resolution.prefix}${number}`,
        };
        await this.inventoryService.createMovement(movementDto, createdById);
      }
    }

    const invoice = this.invoicesRepository.create({
      number,
      prefix: resolution.prefix,
      resolutionNumber: resolution.resolutionNumber,
      customerIdentificationType: dto.customerIdentificationType,
      customerIdentification: dto.customerIdentification,
      customerCompanyName: dto.customerCompanyName ?? null,
      customerFirstName: dto.customerFirstName ?? null,
      customerFamilyName: dto.customerFamilyName ?? null,
      customerEmail: dto.customerEmail,
      issueDate,
      paymentDate,
      totalAmount: items.reduce(
        (sum, item) => sum + item.taxBase + item.taxAmount,
        0,
      ),
      requestPayload,
      createdBy: { id: createdById } as Invoice['createdBy'],
      ...this.mapDataicoResponse(response),
    });

    const saved = await this.invoicesRepository.save(invoice);
    return InvoiceResponseDto.fromEntity(saved);
  }

  async findAll(
    query: QueryInvoicesDto,
  ): Promise<PaginatedResponseDto<InvoiceResponseDto>> {
    const { page, limit } = query;

    const [invoices, total] = await this.invoicesRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: invoices.map((invoice) => InvoiceResponseDto.fromEntity(invoice)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.invoicesRepository.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  /**
   * "Reenviar factura" — re-triggers an action (DIAN submission and/or
   * customer email) on an invoice that already exists in Dataico. This
   * does NOT create a new fiscal document; it's for recovering from a
   * failed DIAN submission or a failed email delivery on the SAME
   * invoice, identified by Dataico's own uuid (not our local id, not the
   * business number). Confirmed: `PUT /invoices/{dataico_uuid}` with just
   * `{ actions }` — see docs/phases/PHASE_10_INVOICING_STANDARD.md.
   */
  async resend(id: string, dto: ResendInvoiceDto): Promise<InvoiceResponseDto> {
    const invoice = await this.findOne(id);
    if (!invoice.dataicoUuid) {
      throw new BadRequestException(
        'Esta factura no tiene un uuid de Dataico registrado — no se puede reenviar.',
      );
    }

    const response = await this.dataicoClient.put<DataicoInvoiceResponse>(
      `/invoices/${invoice.dataicoUuid}`,
      {
        actions: {
          send_dian: dto.sendDian ?? true,
          send_email: dto.sendEmail ?? false,
        },
      },
    );

    Object.assign(invoice, this.mapDataicoResponse(response));
    const saved = await this.invoicesRepository.save(invoice);
    return InvoiceResponseDto.fromEntity(saved);
  }

  /**
   * "Consulta Factura" — re-queries Dataico for this invoice's current
   * state by its business number and refreshes the local row. Useful
   * when a resend/create's local save might have raced with a status
   * change on Dataico's side. Confirmed: `GET /invoices?number=`.
   *
   * Does NOT recover an invoice that Dataico accepted but was never
   * saved locally at all (e.g. a crash between the Dataico call and our
   * save) — that edge case is a known limitation, see the phase doc.
   */
  async refreshStatus(id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.findOne(id);
    if (!invoice.dataicoNumber) {
      throw new BadRequestException(
        'Esta factura no tiene un número de Dataico registrado — no se puede consultar.',
      );
    }

    const response = await this.dataicoClient.get<DataicoInvoiceResponse>(
      `/invoices?number=${encodeURIComponent(invoice.dataicoNumber)}`,
    );

    Object.assign(invoice, this.mapDataicoResponse(response));
    const saved = await this.invoicesRepository.save(invoice);
    return InvoiceResponseDto.fromEntity(saved);
  }

  /**
   * Maps the fields this app tracks out of any Dataico invoice response
   * (shared by create/resend/refresh — all three hit the same resource,
   * per the confirmed reference). Strips `xml` before storing it as
   * `responsePayload` — see the Invoice entity's own note on why.
   */
  private mapDataicoResponse(
    response: DataicoInvoiceResponse,
  ): Partial<Invoice> {
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

  /**
   * Loads each item's product, validates sufficient stock for ALL items
   * up front (before calling Dataico) — a legally-sent invoice can't be
   * un-sent, so it's better to fail here than after DIAN has accepted a
   * sale this store can't actually fulfill.
   *
   * `product.salePrice` is confirmed to already include IVA (it's the
   * price the store actually sells at) — `taxRate: 0` on a line is only
   * the flag for the "excluida"/exenta label, not a separate calculation.
   * DIAN invoices report price/tax_base as the pre-tax amount with
   * tax_amount broken out separately, so salePrice is first "unwrapped"
   * back to its pre-tax equivalent before anything else happens.
   *
   * A fixed per-line discount (a flat COP amount, not a percentage) is
   * then subtracted from that pre-tax subtotal, before IVA is computed —
   * confirmed directly: the discount comes off the base, IVA is then
   * calculated on the already-discounted amount. The discounted amount is
   * folded back into a per-unit `unitPrice` (rather than kept as a
   * separate figure) so `price × quantity` on the actual invoice always
   * equals the discounted total — Dataico never sees a "discount" field,
   * only the already-final numbers, per direct instruction.
   *
   * `itemDto.unitPriceOverride`, when present, replaces `product.salePrice`
   * as the gross (IVA-inclusive) starting price — used by
   * QuotationsService.invoice() to honor a quotation's locked-in price
   * instead of the product's current one. `skipStockCheck` is set by the
   * same caller for the same reason — see create()'s docstring.
   */
  private async resolveItems(
    dto: CreateInvoiceDto,
    skipStockCheck = false,
  ): Promise<ResolvedItem[]> {
    return Promise.all(
      dto.items.map(async (itemDto) => {
        const product = await this.productsService.findOne(itemDto.productId);
        if (!skipStockCheck && product.stock < itemDto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.reference}. Stock actual: ${product.stock}, solicitado: ${itemDto.quantity}.`,
          );
        }

        const grossUnitPrice =
          itemDto.unitPriceOverride ?? Number(product.salePrice);
        const taxRate = resolveTaxRate(product);
        const { unitPrice, taxBase, taxAmount } = computeLineAmounts(
          grossUnitPrice,
          itemDto.quantity,
          taxRate,
          itemDto.discount ?? 0,
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

  /**
   * Auto-increments the invoice number, scoped to the resolution's prefix
   * (a DIAN resolution's numbering range is per-prefix). Not client-supplied
   * anymore — continues from the highest number already recorded locally
   * for this prefix, or from `INVOICE_NUMBER_START` if nothing has been
   * recorded yet (the store already has invoices issued before this app's
   * local history starts, so the real sequence can't be inferred from an
   * empty table). No dedicated counter table — this app is the only writer
   * of `invoices.number`, and at this store's scale a simple `MAX()` read
   * is an acceptable simplification over a fully race-proof counter.
   */
  private async resolveNextNumber(prefix: string): Promise<number> {
    const result = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .select('MAX(invoice.number)', 'max')
      .where('invoice.prefix = :prefix', { prefix })
      .getRawOne<{ max: string | null }>();

    if (result?.max) {
      return Number(result.max) + 1;
    }

    return Number(this.configService.get<string>('INVOICE_NUMBER_START', '1'));
  }
}
