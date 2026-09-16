import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { computeLineAmounts } from '../common/utils/invoice-math.util';
import { InventoryService } from '../inventory/inventory.service';
import { CreateInvoiceDto } from '../invoicing/invoices/dto/create-invoice.dto';
import { InvoiceResponseDto } from '../invoicing/invoices/dto/invoice-response.dto';
import { InvoicesService } from '../invoicing/invoices/invoices.service';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { CreateQuotationItemDto } from './dto/create-quotation-item.dto';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { InvoiceQuotationDto } from './dto/invoice-quotation.dto';
import { QueryQuotationsDto } from './dto/query-quotations.dto';
import { QuotationResponseDto } from './dto/quotation-response.dto';
import { UpdateQuotationItemsDto } from './dto/update-quotation-items.dto';
import { QuotationItem } from './entities/quotation-item.entity';
import { Quotation } from './entities/quotation.entity';

interface ResolvedLine {
  product: Product;
  quantity: number;
  taxRate: number;
  discount?: number;
  /** Snapshot of product.salePrice at this exact moment — the locked price. */
  unitPrice: number;
}

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(Quotation)
    private readonly quotationsRepository: Repository<Quotation>,
    @InjectRepository(QuotationItem)
    private readonly quotationItemsRepository: Repository<QuotationItem>,
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
    private readonly cashRegisterService: CashRegisterService,
    private readonly invoicesService: InvoicesService,
  ) {}

  async create(
    dto: CreateQuotationDto,
    userId: string,
  ): Promise<QuotationResponseDto> {
    // Stock is leaving the store today, same as a real sale.
    await this.cashRegisterService.assertOpenToday();

    const resolved = await this.resolveNewLines(dto.items);
    const number = await this.resolveNextNumber();

    // Decrement stock first — if this fails partway, no quotation row gets
    // created at all (same accepted trade-off as InvoicesService.create():
    // better an orphaned partial stock change to investigate than a
    // quotation record that overstates what actually left the store).
    for (const item of resolved) {
      await this.inventoryService.createMovement(
        {
          productId: item.product.id,
          quantity: -item.quantity,
          notes: this.movementNote(number, 'creación'),
        },
        userId,
      );
    }

    const totalAmount = this.sumTotal(resolved);
    const quotation = this.quotationsRepository.create({
      number,
      ...this.customerColumns(dto),
      notes: dto.notes ?? null,
      totalAmount,
      createdBy: { id: userId } as Quotation['createdBy'],
      updatedBy: { id: userId } as Quotation['updatedBy'],
    });
    const saved = await this.quotationsRepository.save(quotation);

    const items = resolved.map((item) =>
      this.quotationItemsRepository.create({
        quotation: { id: saved.id } as Quotation,
        product: { id: item.product.id } as Product,
        quantity: item.quantity,
        taxRate: item.taxRate,
        discount: item.discount ?? null,
        unitPrice: item.unitPrice,
      }),
    );
    await this.quotationItemsRepository.save(items);

    return this.findOne(saved.id);
  }

  async findAll(
    query: QueryQuotationsDto,
  ): Promise<PaginatedResponseDto<QuotationResponseDto>> {
    const qb = this.quotationsRepository
      .createQueryBuilder('quotation')
      .leftJoinAndSelect('quotation.invoice', 'invoice')
      .orderBy('quotation.createdAt', 'DESC');

    if (query.status === 'open') {
      qb.andWhere(
        'quotation.invoicedAt IS NULL AND quotation.cancelledAt IS NULL',
      );
    } else if (query.status === 'invoiced') {
      qb.andWhere('quotation.invoicedAt IS NOT NULL');
    } else if (query.status === 'cancelled') {
      qb.andWhere('quotation.cancelledAt IS NOT NULL');
    }

    const [quotations, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      data: quotations.map((q) => QuotationResponseDto.fromEntity(q)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string): Promise<QuotationResponseDto> {
    const quotation = await this.loadWithItems(id);
    return QuotationResponseDto.fromEntity(quotation, true);
  }

  /**
   * Full-replace of a quotation's items. Diffs old vs. new by product id
   * and applies exactly one inventory movement per product whose net
   * quantity changed — a line dropped to a lower quantity (or removed
   * entirely) returns the difference to stock, a raised quantity (or a
   * brand-new line) takes more out, matching a real return/additional
   * sale. Every line in the new list gets its `unitPrice` re-snapshotted
   * from the product's current price — an edit is a fresh checkpoint,
   * the same as creating the quotation was.
   */
  async updateItems(
    id: string,
    dto: UpdateQuotationItemsDto,
    userId: string,
  ): Promise<QuotationResponseDto> {
    const quotation = await this.loadWithItems(id);
    this.assertOpen(quotation);

    const newLines = await Promise.all(
      dto.items.map(async (itemDto) => ({
        itemDto,
        product: await this.productsService.findOne(itemDto.productId),
      })),
    );

    const oldQtyByProduct = new Map<string, number>();
    for (const item of quotation.items) {
      oldQtyByProduct.set(
        item.product.id,
        (oldQtyByProduct.get(item.product.id) ?? 0) + item.quantity,
      );
    }
    const newQtyByProduct = new Map<string, number>();
    const productsById = new Map<string, Product>();
    for (const { itemDto, product } of newLines) {
      newQtyByProduct.set(
        itemDto.productId,
        (newQtyByProduct.get(itemDto.productId) ?? 0) + itemDto.quantity,
      );
      productsById.set(product.id, product);
    }
    for (const item of quotation.items) {
      if (!productsById.has(item.product.id)) {
        productsById.set(item.product.id, item.product);
      }
    }

    const productIds = new Set([
      ...oldQtyByProduct.keys(),
      ...newQtyByProduct.keys(),
    ]);
    const deltas: Array<{ productId: string; delta: number }> = [];
    for (const productId of productIds) {
      const delta =
        (newQtyByProduct.get(productId) ?? 0) -
        (oldQtyByProduct.get(productId) ?? 0);
      if (delta !== 0) {
        deltas.push({ productId, delta });
      }
    }

    for (const { productId, delta } of deltas) {
      if (delta > 0) {
        const product = productsById.get(productId)!;
        if (product.stock < delta) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.reference}. Stock actual: ${product.stock}, adicional solicitado: ${delta}.`,
          );
        }
      }
    }

    for (const { productId, delta } of deltas) {
      await this.inventoryService.createMovement(
        {
          productId,
          quantity: -delta,
          notes: this.movementNote(quotation.number, 'ajuste'),
        },
        userId,
      );
    }

    await this.quotationItemsRepository.delete({
      quotation: { id: quotation.id },
    });
    const newItems = newLines.map(({ itemDto, product }) =>
      this.quotationItemsRepository.create({
        quotation: { id: quotation.id } as Quotation,
        product: { id: product.id } as Product,
        quantity: itemDto.quantity,
        taxRate: itemDto.taxRate,
        discount: itemDto.discount ?? null,
        unitPrice: Number(product.salePrice),
      }),
    );
    await this.quotationItemsRepository.save(newItems);

    const totalAmount = this.sumTotal(
      newLines.map(({ itemDto, product }) => ({
        product,
        quantity: itemDto.quantity,
        taxRate: itemDto.taxRate,
        discount: itemDto.discount,
        unitPrice: Number(product.salePrice),
      })),
    );
    await this.quotationsRepository.update(quotation.id, {
      totalAmount,
      updatedBy: { id: userId },
    });

    return this.findOne(quotation.id);
  }

  /**
   * Converts a quotation into a real invoice using its locked-in prices
   * (see QuotationItem's docstring) — stock was already decremented when
   * the quotation was created/edited, so InvoicesService.create() is told
   * to skip its own stock check/decrement entirely (see that method's
   * docstring for why re-running the check would be wrong, not just
   * redundant).
   */
  async invoice(
    id: string,
    dto: InvoiceQuotationDto,
    userId: string,
  ): Promise<InvoiceResponseDto> {
    const quotation = await this.loadWithItems(id);
    this.assertOpen(quotation);

    if (!dto.useSameCustomer && !dto.customer) {
      throw new BadRequestException(
        'Debes indicar los datos del cliente al que se factura.',
      );
    }

    const customer = dto.useSameCustomer
      ? {
          customerIdentificationType: quotation.customerIdentificationType,
          customerIdentification: quotation.customerIdentification,
          customerPartyType: quotation.customerPartyType,
          customerTaxLevelCode: quotation.customerTaxLevelCode,
          customerRegimen: quotation.customerRegimen ?? undefined,
          customerCompanyName: quotation.customerCompanyName ?? undefined,
          customerFirstName: quotation.customerFirstName ?? undefined,
          customerFamilyName: quotation.customerFamilyName ?? undefined,
          customerCountryCode: quotation.customerCountryCode,
          customerDepartment: quotation.customerDepartment,
          customerCity: quotation.customerCity,
          customerAddressLine: quotation.customerAddressLine,
          customerEmail: quotation.customerEmail,
        }
      : dto.customer!;

    const createInvoiceDto: CreateInvoiceDto = {
      paymentDate: dto.paymentDate,
      paymentMeans: dto.paymentMeans,
      paymentMeansType: dto.paymentMeansType,
      ...customer,
      items: quotation.items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        taxRate: Number(item.taxRate),
        discount: item.discount ?? undefined,
        unitPriceOverride: item.unitPrice,
      })),
      notes: dto.notes,
    };

    const invoice = await this.invoicesService.create(
      createInvoiceDto,
      userId,
      {
        skipInventoryEffects: true,
      },
    );

    // .save() (not .update()) — TypeORM's QueryDeepPartialEntity inference
    // trips on Invoice's `unknown`-typed JSONB columns when a relation to
    // it is included in an .update() payload.
    await this.quotationsRepository.save({
      id: quotation.id,
      invoicedAt: new Date(),
      invoice: { id: invoice.id } as Quotation['invoice'],
      updatedBy: { id: userId } as Quotation['updatedBy'],
    });

    return invoice;
  }

  /** Returns every line's stock to inventory and closes the quotation. */
  async cancel(id: string, userId: string): Promise<QuotationResponseDto> {
    const quotation = await this.loadWithItems(id);
    this.assertOpen(quotation);

    for (const item of quotation.items) {
      await this.inventoryService.createMovement(
        {
          productId: item.product.id,
          quantity: item.quantity,
          notes: this.movementNote(quotation.number, 'cancelada — devolución'),
        },
        userId,
      );
    }

    await this.quotationsRepository.update(quotation.id, {
      cancelledAt: new Date(),
      updatedBy: { id: userId },
    });

    return this.findOne(quotation.id);
  }

  private async resolveNewLines(
    itemDtos: CreateQuotationItemDto[],
  ): Promise<ResolvedLine[]> {
    return Promise.all(
      itemDtos.map(async (itemDto) => {
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
          discount: itemDto.discount,
          unitPrice: Number(product.salePrice),
        };
      }),
    );
  }

  private sumTotal(lines: ResolvedLine[]): number {
    return lines.reduce(
      (sum, line) =>
        sum +
        computeLineAmounts(
          line.unitPrice,
          line.quantity,
          line.taxRate,
          line.discount ?? 0,
        ).total,
      0,
    );
  }

  private customerColumns(dto: CreateQuotationDto) {
    return {
      customerIdentificationType: dto.customerIdentificationType,
      customerIdentification: dto.customerIdentification,
      customerIdentificationDv: dto.customerIdentificationDv ?? null,
      customerPartyType: dto.customerPartyType,
      customerTaxLevelCode: dto.customerTaxLevelCode,
      customerRegimen: dto.customerRegimen ?? null,
      customerCompanyName: dto.customerCompanyName ?? null,
      customerFirstName: dto.customerFirstName ?? null,
      customerFamilyName: dto.customerFamilyName ?? null,
      customerCountryCode: dto.customerCountryCode,
      customerDepartment: dto.customerDepartment,
      customerCity: dto.customerCity,
      customerAddressLine: dto.customerAddressLine,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone ?? null,
    };
  }

  private async loadWithItems(id: string): Promise<Quotation> {
    const quotation = await this.quotationsRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'invoice'],
    });
    if (!quotation) {
      throw new NotFoundException('Cotización no encontrada.');
    }
    return quotation;
  }

  private assertOpen(quotation: Quotation): void {
    if (quotation.cancelledAt) {
      throw new BadRequestException('Esta cotización ya fue cancelada.');
    }
    if (quotation.invoicedAt) {
      throw new BadRequestException('Esta cotización ya fue facturada.');
    }
  }

  private async resolveNextNumber(): Promise<number> {
    const result = await this.quotationsRepository
      .createQueryBuilder('quotation')
      .select('MAX(quotation.number)', 'max')
      .getRawOne<{ max: string | null }>();
    return result?.max ? Number(result.max) + 1 : 1;
  }

  private movementNote(number: number, suffix: string): string {
    return `Cotización COT-${String(number).padStart(4, '0')} — ${suffix}`;
  }
}
