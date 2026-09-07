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
import { CreatePosInvoiceDto } from './dto/create-pos-invoice.dto';
import { PosInvoiceResponseDto } from './dto/pos-invoice-response.dto';
import { QueryPosInvoicesDto } from './dto/query-pos-invoices.dto';
import { PosInvoice } from './entities/pos-invoice.entity';

/**
 * NOT confirmed — Dataico never shared a POS Electrónico response
 * example, only requests. Field names below mirror the confirmed
 * standard-invoice response as a reasonable, cheap-to-fix assumption
 * (same conceptual resource — a DIAN-validated document), not a guess
 * about something with zero precedent. See docs/phases/PHASE_12_POS.md.
 */
interface DataicoPosInvoiceResponse {
  number?: string;
  dian_status?: string;
  cufe?: string;
  uuid?: string;
  xml_url?: string;
  pdf_url?: string;
  dian_messages?: string[];
  xml?: string;
  [key: string]: unknown;
}

interface ResolvedItem {
  product: Product;
  quantity: number;
  taxRate: number;
}

const POS_RESOLUTION_SUBTYPE = 'POS';

@Injectable()
export class PosInvoicesService {
  constructor(
    @InjectRepository(PosInvoice)
    private readonly posInvoicesRepository: Repository<PosInvoice>,
    private readonly dataicoClient: DataicoClientService,
    private readonly dataicoConfig: DataicoConfig,
    private readonly resolutionsService: ResolutionsService,
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
  ) {}

  async create(
    dto: CreatePosInvoiceDto,
    createdById: string,
  ): Promise<PosInvoiceResponseDto> {
    const resolution = await this.resolutionsService.findActiveForDocumentType(
      DianResolutionDocumentType.INVOICE,
      POS_RESOLUTION_SUBTYPE,
    );
    if (!resolution) {
      throw new BadRequestException(
        'No hay una resolución DIAN de tipo POS asociada. Asocia una en Resoluciones DIAN (subtipo POS) antes de facturar.',
      );
    }

    const items = await this.resolveItems(dto);

    const requestPayload = {
      number: dto.number,
      'send-dian': true,
      'send-email': false,
      'issue-date': this.toDataicoDate(dto.issueDate),
      items: items.map((item) => ({
        product: {
          sku: item.product.reference,
          description: item.product.description,
        },
        'measuring-unit': '94',
        quantity: item.quantity,
        price: Number(item.product.salePrice),
        description: item.product.description,
        taxes: [{ category: 'IVA', 'precise-rate': item.taxRate }],
      })),
      'dian-resolution': { number: resolution.resolutionNumber },
      numbering: { prefix: resolution.prefix },
      'payment-means': [
        {
          code: dto.paymentMeansCode,
          type: dto.paymentMeansType,
          date: this.toDataicoDate(dto.issueDate),
        },
      ],
      customer: {
        company_name: dto.customerCompanyName ?? '',
        'responsable-iva': dto.responsableIva,
        type: dto.customerType,
        identification: dto.customerIdentification,
        identification_type: dto.customerIdentificationType,
        first_name: dto.customerFirstName ?? '',
        family_name: dto.customerFamilyName ?? '',
        phone: dto.customerPhone ?? '',
        email: dto.customerEmail,
      },
    };

    const response = await this.dataicoClient.post<DataicoPosInvoiceResponse>(
      '/pos-invoices',
      requestPayload,
      this.dataicoConfig.posBaseUrl,
    );

    // Only decrement stock once Dataico has actually accepted the
    // document — same ordering rationale as InvoicesService.create().
    for (const item of items) {
      const movementDto: CreateMovementDto = {
        productId: item.product.id,
        quantity: -item.quantity,
        notes: `Venta POS - ${resolution.prefix}${dto.number}`,
      };
      await this.inventoryService.createMovement(movementDto, createdById);
    }

    const posInvoice = this.posInvoicesRepository.create({
      number: dto.number,
      prefix: resolution.prefix,
      resolutionNumber: resolution.resolutionNumber,
      customerType: dto.customerType,
      customerIdentificationType: dto.customerIdentificationType,
      customerIdentification: dto.customerIdentification,
      customerCompanyName: dto.customerCompanyName ?? null,
      customerFirstName: dto.customerFirstName ?? null,
      customerFamilyName: dto.customerFamilyName ?? null,
      customerPhone: dto.customerPhone ?? null,
      customerEmail: dto.customerEmail,
      issueDate: dto.issueDate,
      totalAmount: items.reduce((sum, item) => {
        const base = Number(item.product.salePrice) * item.quantity;
        return sum + base + Math.round(base * (item.taxRate / 100));
      }, 0),
      requestPayload,
      createdBy: { id: createdById } as PosInvoice['createdBy'],
      ...this.mapDataicoResponse(response),
    });

    const saved = await this.posInvoicesRepository.save(posInvoice);
    return PosInvoiceResponseDto.fromEntity(saved);
  }

  async findAll(
    query: QueryPosInvoicesDto,
  ): Promise<PaginatedResponseDto<PosInvoiceResponseDto>> {
    const { page, limit } = query;

    const [invoices, total] = await this.posInvoicesRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: invoices.map((invoice) =>
        PosInvoiceResponseDto.fromEntity(invoice),
      ),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<PosInvoice> {
    const invoice = await this.posInvoicesRepository.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('POS invoice not found');
    }
    return invoice;
  }

  /**
   * "Consultar factura" — confirmed request (`GET /pos-invoices?number=`),
   * response shape assumed same as create's (see the module note above).
   */
  async refreshStatus(id: string): Promise<PosInvoiceResponseDto> {
    const invoice = await this.findOne(id);
    if (!invoice.dataicoNumber) {
      throw new BadRequestException(
        'Esta factura POS no tiene un número de Dataico registrado — no se puede consultar.',
      );
    }

    const response = await this.dataicoClient.get<DataicoPosInvoiceResponse>(
      `/pos-invoices?number=${encodeURIComponent(invoice.dataicoNumber)}`,
      this.dataicoConfig.posBaseUrl,
    );

    Object.assign(invoice, this.mapDataicoResponse(response));
    const saved = await this.posInvoicesRepository.save(invoice);
    return PosInvoiceResponseDto.fromEntity(saved);
  }

  /**
   * Validates stock for ALL items up front, before calling Dataico — same
   * rationale as InvoicesService: a DIAN-accepted document can't be
   * un-sent.
   */
  private async resolveItems(
    dto: CreatePosInvoiceDto,
  ): Promise<ResolvedItem[]> {
    return Promise.all(
      dto.items.map(async (itemDto) => {
        const product = await this.productsService.findOne(itemDto.productId);
        if (product.stock < itemDto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.reference}. Stock actual: ${product.stock}, solicitado: ${itemDto.quantity}.`,
          );
        }
        return {
          product,
          quantity: itemDto.quantity,
          taxRate: itemDto.taxRate,
        };
      }),
    );
  }

  private mapDataicoResponse(
    response: DataicoPosInvoiceResponse,
  ): Partial<PosInvoice> {
    const responsePayload: Record<string, unknown> = { ...response };
    delete responsePayload.xml;

    return {
      dataicoNumber: response.number ?? null,
      dianStatus: response.dian_status ?? null,
      cufe: response.cufe ?? null,
      dataicoUuid: response.uuid ?? null,
      xmlUrl: response.xml_url ?? null,
      pdfUrl: response.pdf_url ?? null,
      dianMessages: response.dian_messages ?? null,
      responsePayload,
    };
  }

  /** ISO 'YYYY-MM-DD' -> Dataico's confirmed 'DD/MM/YYYY' format. */
  private toDataicoDate(isoDate: string): string {
    const [year, month, day] = isoDate.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
}
