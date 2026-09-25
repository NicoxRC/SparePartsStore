import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { escapeLike } from '../common/utils/escape-like.util';
import { assertLineKind } from '../common/utils/custom-line.util';
import {
  computeLineAmounts,
  resolveTaxRate,
  STANDARD_TAX_RATE,
} from '../common/utils/invoice-math.util';
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
  /** null for a one-off line typed on the quotation (not a catalog product). */
  product: Product | null;
  /** The one-off line's name; null for a product line. */
  description: string | null;
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
      // A one-off line has no product, so no stock leaves.
      if (!item.product) continue;
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
        product: item.product ? { id: item.product.id } : null,
        description: item.product ? null : item.description,
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

    if (query.search) {
      qb.andWhere(
        `(CAST(quotation.number AS TEXT) ILIKE :search ESCAPE '\\' OR
          quotation.customerCompanyName ILIKE :search ESCAPE '\\' OR
          quotation.customerFirstName ILIKE :search ESCAPE '\\' OR
          quotation.customerFamilyName ILIKE :search ESCAPE '\\' OR
          quotation.customerIdentification ILIKE :search ESCAPE '\\')`,
        { search: `%${escapeLike(query.search)}%` },
      );
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
   * sale. A line whose product was already on the quotation KEEPS the
   * `unitPrice` it was quoted at — the customer's price must not move just
   * because the product's price changed afterward (or because someone
   * edited the quotation). Only a product added by this edit is priced at
   * the product's current price.
   */
  async updateItems(
    id: string,
    dto: UpdateQuotationItemsDto,
    userId: string,
  ): Promise<QuotationResponseDto> {
    const quotation = await this.loadWithItems(id);
    this.assertOpen(quotation);

    const newLines = await Promise.all(
      dto.items.map(async (itemDto) => {
        assertLineKind(itemDto);
        return {
          itemDto,
          // null for a one-off line: nothing in the catalog, nothing in stock.
          product: itemDto.productId
            ? await this.productsService.findOne(itemDto.productId)
            : null,
        };
      }),
    );

    const oldQtyByProduct = new Map<string, number>();
    for (const item of quotation.items) {
      if (!item.product) continue;
      oldQtyByProduct.set(
        item.product.id,
        (oldQtyByProduct.get(item.product.id) ?? 0) + item.quantity,
      );
    }
    const newQtyByProduct = new Map<string, number>();
    const productsById = new Map<string, Product>();
    for (const { itemDto, product } of newLines) {
      if (!product) continue;
      newQtyByProduct.set(
        product.id,
        (newQtyByProduct.get(product.id) ?? 0) + itemDto.quantity,
      );
      productsById.set(product.id, product);
    }
    for (const item of quotation.items) {
      if (item.product && !productsById.has(item.product.id)) {
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

    const quotedPriceByProduct = new Map<string, number>();
    for (const item of quotation.items) {
      if (item.product && !quotedPriceByProduct.has(item.product.id)) {
        quotedPriceByProduct.set(item.product.id, item.unitPrice);
      }
    }
    const priceFor = (product: Product): number =>
      quotedPriceByProduct.get(product.id) ?? Number(product.salePrice);

    // One list drives both what is saved and the total, so they can't drift.
    const finalLines: ResolvedLine[] = newLines.map(({ itemDto, product }) => ({
      product,
      description: product ? null : (itemDto.description as string),
      quantity: itemDto.quantity,
      taxRate: product ? resolveTaxRate(product) : STANDARD_TAX_RATE,
      discount: itemDto.discount,
      unitPrice: product
        ? priceFor(product)
        : (itemDto.customUnitPrice as number),
    }));

    await this.quotationItemsRepository.delete({
      quotation: { id: quotation.id },
    });
    const newItems = finalLines.map((line) =>
      this.quotationItemsRepository.create({
        quotation: { id: quotation.id } as Quotation,
        product: line.product ? { id: line.product.id } : null,
        description: line.description,
        quantity: line.quantity,
        taxRate: line.taxRate,
        discount: line.discount ?? null,
        unitPrice: line.unitPrice,
      }),
    );
    await this.quotationItemsRepository.save(newItems);

    const totalAmount = this.sumTotal(finalLines);
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
  ): Promise<InvoiceResponseDto[]> {
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
      items: quotation.items.map((item) =>
        item.product
          ? {
              productId: item.product.id,
              quantity: item.quantity,
              taxRate: Number(item.taxRate),
              discount: item.discount ?? undefined,
              unitPriceOverride: item.unitPrice,
            }
          : {
              // A one-off line goes to the invoice as typed.
              description: item.description ?? '',
              customUnitPrice: item.unitPrice,
              quantity: item.quantity,
              discount: item.discount ?? undefined,
            },
      ),
      notes: dto.notes,
    };

    const invoices = await this.invoicesService.create(
      createInvoiceDto,
      userId,
      {
        skipInventoryEffects: true,
      },
    );

    // A "Consumidor final" sale may have been split into several invoices;
    // the quotation keeps a single link, to the first one.
    // .save() (not .update()) — TypeORM's QueryDeepPartialEntity inference
    // trips on Invoice's `unknown`-typed JSONB columns when a relation to
    // it is included in an .update() payload.
    await this.quotationsRepository.save({
      id: quotation.id,
      invoicedAt: new Date(),
      invoice: { id: invoices[0].id } as Quotation['invoice'],
      updatedBy: { id: userId } as Quotation['updatedBy'],
    });

    return invoices;
  }

  /** Returns every line's stock to inventory and closes the quotation. */
  async cancel(id: string, userId: string): Promise<QuotationResponseDto> {
    const quotation = await this.loadWithItems(id);
    this.assertOpen(quotation);

    for (const item of quotation.items) {
      // Nothing left the store for a one-off line, so nothing comes back.
      if (!item.product) continue;
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
      itemDtos.map(async (itemDto): Promise<ResolvedLine> => {
        assertLineKind(itemDto);
        if (!itemDto.productId) {
          // One-off line: as typed, always with standard IVA, no stock.
          return {
            product: null,
            description: itemDto.description as string,
            quantity: itemDto.quantity,
            taxRate: STANDARD_TAX_RATE,
            discount: itemDto.discount,
            unitPrice: itemDto.customUnitPrice as number,
          };
        }
        const product = await this.productsService.findOne(itemDto.productId);
        if (product.stock < itemDto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.reference}. Stock actual: ${product.stock}, solicitado: ${itemDto.quantity}.`,
          );
        }
        return {
          product,
          description: null,
          quantity: itemDto.quantity,
          taxRate: resolveTaxRate(product),
          discount: itemDto.discount,
          unitPrice: itemDto.unitPriceOverride ?? Number(product.salePrice),
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
    // .withDeleted() disables TypeORM's automatic "deleted_at IS NULL" filter
    // for the quotation and every joined entity, so a line whose product was
    // later soft-deleted still resolves instead of coming back null (same
    // pattern as ProductsService.findOne() for department/group/brand).
    // The quotation's own soft-delete filter is re-added below.
    const quotation = await this.quotationsRepository
      .createQueryBuilder('quotation')
      .withDeleted()
      .leftJoinAndSelect('quotation.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      // The printed quotation shows each part's brand and who sold it.
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('quotation.createdBy', 'createdBy')
      .leftJoinAndSelect('quotation.invoice', 'invoice')
      .where('quotation.id = :id', { id })
      .andWhere('quotation.deletedAt IS NULL')
      .getOne();
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
