import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DianResolutionDocumentType } from '../../common/enums/dian-resolution-document-type.enum';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateMovementDto } from '../../inventory/dto/create-movement.dto';
import { InventoryService } from '../../inventory/inventory.service';
import { Product } from '../../products/entities/product.entity';
import { ProductsService } from '../../products/products.service';
import { DataicoClientService } from '../dataico/dataico-client.service';
import { DataicoConfig } from '../dataico/dataico.config';
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
  ) {}

  async create(
    dto: CreateInvoiceDto,
    createdById: string,
  ): Promise<InvoiceResponseDto> {
    const resolution = await this.resolutionsService.findActiveForDocumentType(
      DianResolutionDocumentType.INVOICE,
    );
    if (!resolution) {
      throw new BadRequestException(
        'No hay una resolución DIAN de factura electrónica asociada. Asocia una en Resoluciones DIAN antes de facturar.',
      );
    }

    const items = await this.resolveItems(dto);

    const requestPayload = {
      actions: { send_dian: true, send_email: false },
      invoice: {
        env: 'PRODUCCION',
        dataico_account_id: this.dataicoConfig.accountId,
        operation: 'ESTANDAR',
        invoice_type_code: 'FACTURA_VENTA',
        issue_date: this.toDataicoDate(dto.issueDate),
        order_reference: dto.orderReference ?? '',
        number: dto.number,
        payment_means: dto.paymentMeans,
        payment_means_type: dto.paymentMeansType,
        payment_date: this.toDataicoDate(dto.paymentDate),
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
          price: Number(item.product.salePrice),
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
    // save below fails after Dataico already succeeded.
    for (const item of items) {
      const movementDto: CreateMovementDto = {
        productId: item.product.id,
        quantity: -item.quantity,
        notes: `Venta - Factura ${resolution.prefix}${dto.number}`,
      };
      await this.inventoryService.createMovement(movementDto, createdById);
    }

    const invoice = this.invoicesRepository.create({
      number: dto.number,
      prefix: resolution.prefix,
      resolutionNumber: resolution.resolutionNumber,
      customerIdentificationType: dto.customerIdentificationType,
      customerIdentification: dto.customerIdentification,
      customerCompanyName: dto.customerCompanyName ?? null,
      customerFirstName: dto.customerFirstName ?? null,
      customerFamilyName: dto.customerFamilyName ?? null,
      customerEmail: dto.customerEmail,
      issueDate: dto.issueDate,
      paymentDate: dto.paymentDate,
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
   */
  private async resolveItems(dto: CreateInvoiceDto): Promise<ResolvedItem[]> {
    return Promise.all(
      dto.items.map(async (itemDto) => {
        const product = await this.productsService.findOne(itemDto.productId);
        if (product.stock < itemDto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.reference}. Stock actual: ${product.stock}, solicitado: ${itemDto.quantity}.`,
          );
        }

        const taxBase = Math.round(
          Number(product.salePrice) * itemDto.quantity,
        );
        const taxAmount = Math.round(taxBase * (itemDto.taxRate / 100));

        return {
          product,
          quantity: itemDto.quantity,
          taxRate: itemDto.taxRate,
          taxBase,
          taxAmount,
        };
      }),
    );
  }

  /** ISO 'YYYY-MM-DD' -> Dataico's confirmed 'DD/MM/YYYY' format. */
  private toDataicoDate(isoDate: string): string {
    const [year, month, day] = isoDate.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
}
