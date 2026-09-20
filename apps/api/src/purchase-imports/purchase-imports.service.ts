import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Repository } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { SaleType } from '../common/enums/sale-type.enum';
import { isUniqueViolation } from '../common/utils/database-error.util';
import { escapeLike } from '../common/utils/escape-like.util';
import { Department } from '../departments/entities/department.entity';
import { Group } from '../groups/entities/group.entity';
import { InventoryService } from '../inventory/inventory.service';
import { Product } from '../products/entities/product.entity';
import {
  normalizeProductDescription,
  normalizeProductReference,
} from '../products/product-normalize.util';
import { ProductsService } from '../products/products.service';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SuppliersService } from '../suppliers/suppliers.service';
import { ApplyClassificationDto } from './dto/apply-classification.dto';
import {
  ConfirmPurchaseImportResponseDto,
  derivePurchaseImportStatus,
  PurchaseImportDetailDto,
  PurchaseImportItemDto,
  PurchaseImportSummaryDto,
} from './dto/purchase-import-response.dto';
import { QueryPurchaseImportsDto } from './dto/query-purchase-imports.dto';
import { UpdatePurchaseImportItemDto } from './dto/update-purchase-import-item.dto';
import {
  PurchaseImportItem,
  PurchaseImportMatchType,
} from './entities/purchase-import-item.entity';
import { PurchaseImport } from './entities/purchase-import.entity';
import {
  DraftLine,
  LineIssue,
  validateDraft,
} from './purchase-import-validation';
import {
  ParsedPurchaseInvoice,
  PurchaseInvoiceXmlParser,
} from './xml/purchase-invoice-xml.parser';

export interface UploadedXmlFile {
  buffer: Buffer;
  originalname: string;
}

type ProductMatch = {
  productId: string | null;
  matchType: PurchaseImportMatchType | null;
};

@Injectable()
export class PurchaseImportsService {
  constructor(
    @InjectRepository(PurchaseImport)
    private readonly importsRepository: Repository<PurchaseImport>,
    @InjectRepository(PurchaseImportItem)
    private readonly itemsRepository: Repository<PurchaseImportItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Department)
    private readonly departmentsRepository: Repository<Department>,
    @InjectRepository(Group)
    private readonly groupsRepository: Repository<Group>,
    @InjectRepository(Brand)
    private readonly brandsRepository: Repository<Brand>,
    private readonly xmlParser: PurchaseInvoiceXmlParser,
    private readonly suppliersService: SuppliersService,
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
  ) {}

  // ---------------------------------------------------------------- upload

  async upload(
    file: UploadedXmlFile,
    createdById: string,
  ): Promise<PurchaseImportDetailDto> {
    const parsed = this.xmlParser.parse(file.buffer);

    // CUFE first, so nothing is created for a document we already know.
    if (parsed.cufe) {
      const byCufe = await this.importsRepository.findOne({
        where: { cufe: parsed.cufe, discardedAt: IsNull() },
      });
      if (byCufe) throw this.duplicateException(byCufe);
    }

    const supplier = await this.suppliersService.findOrCreateByNit(
      parsed.supplier,
      createdById,
    );

    const bySupplierAndNumber = await this.importsRepository.findOne({
      where: {
        supplierId: supplier.id,
        invoiceNumber: parsed.invoiceNumber,
        discardedAt: IsNull(),
      },
    });
    if (bySupplierAndNumber) {
      throw this.duplicateException(bySupplierAndNumber);
    }

    const matches = await this.matchByReference(
      parsed.lines.map((line) => line.reference),
    );

    try {
      const saved = await this.importsRepository.manager.transaction(
        async (manager) =>
          this.insertDraft(
            manager,
            parsed,
            supplier,
            file.originalname,
            createdById,
            matches,
          ),
      );
      return await this.findOne(saved.id);
    } catch (error) {
      if (isUniqueViolation(error)) {
        const existing = await this.importsRepository.findOne({
          where: [
            { supplierId: supplier.id, invoiceNumber: parsed.invoiceNumber },
            ...(parsed.cufe ? [{ cufe: parsed.cufe }] : []),
          ].map((where) => ({ ...where, discardedAt: IsNull() })),
        });
        if (existing) throw this.duplicateException(existing);
      }
      throw error;
    }
  }

  private async insertDraft(
    manager: EntityManager,
    parsed: ParsedPurchaseInvoice,
    supplier: Supplier,
    filename: string,
    createdById: string,
    matches: Map<string, string>,
  ): Promise<PurchaseImport> {
    const header = await manager.save(
      PurchaseImport,
      manager.create(PurchaseImport, {
        supplierId: supplier.id,
        invoiceNumber: parsed.invoiceNumber,
        issueDate: parsed.issueDate,
        cufe: parsed.cufe,
        sourceFilename: filename.slice(0, 255),
        createdBy: { id: createdById } as PurchaseImport['createdBy'],
      }),
    );

    const items = parsed.lines.map((line) => {
      const productId = line.reference
        ? (matches.get(line.reference) ?? null)
        : null;
      return manager.create(PurchaseImportItem, {
        purchaseImportId: header.id,
        lineNumber: line.lineNumber,
        reference: line.reference,
        description: line.description,
        xmlQuantity: line.xmlQuantity,
        quantity: line.quantity,
        unitCost: line.unitCost,
        productId,
        matchType: productId ? 'exact' : null,
      });
    });
    await manager.save(PurchaseImportItem, items);
    return header;
  }

  private duplicateException(existing: PurchaseImport): ConflictException {
    return new ConflictException({
      code: 'PURCHASE_IMPORT_DUPLICATE',
      message: 'Esta factura ya fue cargada.',
      existingImportId: existing.id,
      existingStatus: derivePurchaseImportStatus(existing),
    });
  }

  /** reference -> product id for every reference that exists in the active catalog. */
  private async matchByReference(
    references: Array<string | null>,
    repository: Repository<Product> = this.productsRepository,
  ): Promise<Map<string, string>> {
    const distinct = [
      ...new Set(references.filter((ref): ref is string => !!ref)),
    ];
    if (distinct.length === 0) return new Map();
    const products = await repository.find({
      where: { reference: In(distinct) },
    });
    return new Map(products.map((product) => [product.reference, product.id]));
  }

  // ------------------------------------------------------------------ read

  async findAll(
    query: QueryPurchaseImportsDto,
  ): Promise<PaginatedResponseDto<PurchaseImportSummaryDto>> {
    const { page, limit, status, supplierId, search } = query;
    const qb = this.importsRepository
      .createQueryBuilder('imp')
      // createdBy may have been soft-deleted since; the name should still show.
      .withDeleted()
      .leftJoinAndSelect('imp.supplier', 'supplier')
      .leftJoinAndSelect('imp.createdBy', 'createdBy')
      .loadRelationCountAndMap('imp.lineCount', 'imp.items');

    if (status === 'draft') {
      qb.andWhere('imp.confirmedAt IS NULL AND imp.discardedAt IS NULL');
    } else if (status === 'confirmed') {
      qb.andWhere('imp.confirmedAt IS NOT NULL');
    } else if (status === 'discarded') {
      qb.andWhere('imp.discardedAt IS NOT NULL');
    }

    if (supplierId) {
      qb.andWhere('imp.supplierId = :supplierId', { supplierId });
    }

    if (search) {
      qb.andWhere(
        "(imp.invoiceNumber ILIKE :search ESCAPE '\\' OR supplier.name ILIKE :search ESCAPE '\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }

    // Drafts are grouped by supplier on the client, so they come sorted by it.
    if (status === 'draft') {
      qb.orderBy('supplier.name', 'ASC').addOrderBy('imp.createdAt', 'DESC');
    } else {
      qb.orderBy('imp.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [imports, total] = await qb.getManyAndCount();

    return {
      data: imports.map((imp) =>
        PurchaseImportSummaryDto.fromEntity(
          imp,
          (imp as PurchaseImport & { lineCount?: number }).lineCount ?? 0,
        ),
      ),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<PurchaseImportDetailDto> {
    const imp = await this.importsRepository
      .createQueryBuilder('imp')
      // A linked product may have been soft-deleted since the link was made;
      // the reviewer must still see it (flagged) rather than a missing row.
      .withDeleted()
      .leftJoinAndSelect('imp.supplier', 'supplier')
      .leftJoinAndSelect('imp.createdBy', 'createdBy')
      .leftJoinAndSelect('imp.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .where('imp.id = :id', { id })
      .orderBy('item.lineNumber', 'ASC')
      .getOne();
    if (!imp) {
      throw new NotFoundException('Purchase import not found');
    }

    const isDraft = derivePurchaseImportStatus(imp) === 'draft';
    const validation = validateDraft(
      imp.items.map((item) => this.toDraftLine(item)),
    );

    const detail = new PurchaseImportDetailDto();
    Object.assign(
      detail,
      PurchaseImportSummaryDto.fromEntity(imp, imp.items.length),
    );
    detail.cufe = imp.cufe;
    detail.readyToConfirm = isDraft && validation.readyToConfirm;
    detail.items = imp.items.map((item) =>
      PurchaseImportItemDto.fromEntity(
        item,
        isDraft ? (validation.issuesByLine.get(item.id) ?? []) : [],
      ),
    );
    return detail;
  }

  private toDraftLine(item: PurchaseImportItem): DraftLine {
    return {
      id: item.id,
      lineNumber: item.lineNumber,
      quantity: item.quantity,
      reference: item.reference,
      description: item.description,
      productId: item.productId,
      linkedProductDeleted: !!item.product?.deletedAt,
      newDepartmentId: item.newDepartmentId,
      newGroupId: item.newGroupId,
      newBrandId: item.newBrandId,
      newSalePrice: item.newSalePrice,
    };
  }

  // --------------------------------------------------------- draft editing

  async updateItem(
    importId: string,
    itemId: string,
    dto: UpdatePurchaseImportItemDto,
  ): Promise<PurchaseImportDetailDto> {
    await this.loadDraft(importId);
    const item = await this.loadItem(importId, itemId);

    const patch: Partial<PurchaseImportItem> = {};

    if (dto.reference !== undefined) patch.reference = dto.reference;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.quantity !== undefined) patch.quantity = dto.quantity;
    if (dto.saleType !== undefined) patch.newSaleType = dto.saleType;
    if (dto.taxExempt !== undefined) patch.newTaxExempt = dto.taxExempt;
    if (dto.salePrice !== undefined) patch.newSalePrice = dto.salePrice;

    if (dto.departmentId !== undefined) {
      await this.assertLookupExists(
        this.departmentsRepository,
        dto.departmentId,
        'department',
      );
      patch.newDepartmentId = dto.departmentId;
    }
    if (dto.groupId !== undefined) {
      await this.assertLookupExists(
        this.groupsRepository,
        dto.groupId,
        'group',
      );
      patch.newGroupId = dto.groupId;
    }
    if (dto.brandId !== undefined) {
      await this.assertLookupExists(
        this.brandsRepository,
        dto.brandId,
        'brand',
      );
      patch.newBrandId = dto.brandId;
    }

    if (typeof dto.productId === 'string') {
      // Manual link — must point at an active product.
      const product = await this.productsRepository.findOne({
        where: { id: dto.productId },
      });
      if (!product) {
        throw new NotFoundException('Invalid productId: product not found');
      }
      patch.productId = product.id;
      patch.matchType = 'manual';
    } else if (dto.productId === null) {
      // "Remove manual link": back to whatever the system would do by itself.
      Object.assign(patch, await this.rematch(dto.reference ?? item.reference));
    } else if (dto.reference !== undefined && item.matchType !== 'manual') {
      Object.assign(patch, await this.rematch(dto.reference));
    }

    if (Object.keys(patch).length > 0) {
      await this.itemsRepository.update({ id: item.id }, patch);
    }
    return this.findOne(importId);
  }

  async deleteItem(
    importId: string,
    itemId: string,
  ): Promise<PurchaseImportDetailDto> {
    await this.loadDraft(importId);
    const item = await this.loadItem(importId, itemId);
    await this.itemsRepository.delete({ id: item.id });
    return this.findOne(importId);
  }

  /**
   * Sets department/group/brand on every NEW line that has that field empty —
   * never overwrites what the reviewer already chose. One brand's distributor
   * can easily send 60 new lines; three selects per line isn't workable.
   */
  async applyClassification(
    importId: string,
    dto: ApplyClassificationDto,
  ): Promise<PurchaseImportDetailDto> {
    if (!dto.departmentId && !dto.groupId && !dto.brandId) {
      throw new BadRequestException(
        'Provide at least one of departmentId, groupId or brandId',
      );
    }
    await this.loadDraft(importId);

    if (dto.departmentId) {
      await this.assertLookupExists(
        this.departmentsRepository,
        dto.departmentId,
        'department',
      );
    }
    if (dto.groupId) {
      await this.assertLookupExists(
        this.groupsRepository,
        dto.groupId,
        'group',
      );
    }
    if (dto.brandId) {
      await this.assertLookupExists(
        this.brandsRepository,
        dto.brandId,
        'brand',
      );
    }

    await this.itemsRepository.manager.transaction(async (manager) => {
      const fill = (
        column: 'new_department_id' | 'new_group_id' | 'new_brand_id',
        value: Partial<PurchaseImportItem>,
      ) =>
        manager
          .createQueryBuilder()
          .update(PurchaseImportItem)
          .set(value)
          .where(
            `purchase_import_id = :importId AND product_id IS NULL AND ${column} IS NULL`,
            { importId },
          )
          .execute();

      if (dto.departmentId) {
        await fill('new_department_id', { newDepartmentId: dto.departmentId });
      }
      if (dto.groupId) {
        await fill('new_group_id', { newGroupId: dto.groupId });
      }
      if (dto.brandId) {
        await fill('new_brand_id', { newBrandId: dto.brandId });
      }
    });

    return this.findOne(importId);
  }

  async discard(
    importId: string,
    userId: string,
  ): Promise<PurchaseImportDetailDto> {
    await this.loadDraft(importId);

    // Conditional update so a discard racing a confirm can't win after it.
    const result = await this.importsRepository
      .createQueryBuilder()
      .update(PurchaseImport)
      .set({ discardedAt: new Date(), discardedById: userId })
      .where(
        'id = :importId AND confirmed_at IS NULL AND discarded_at IS NULL',
        { importId },
      )
      .execute();
    if (!result.affected) {
      throw this.notDraftException();
    }
    return this.findOne(importId);
  }

  // --------------------------------------------------------------- confirm

  async confirm(
    importId: string,
    userId: string,
  ): Promise<ConfirmPurchaseImportResponseDto> {
    return this.importsRepository.manager.transaction(async (manager) => {
      // Lock the header so a double tap (or two reviewers) can't apply twice.
      const header = await manager.findOne(PurchaseImport, {
        where: { id: importId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!header) {
        throw new NotFoundException('Purchase import not found');
      }
      if (derivePurchaseImportStatus(header) !== 'draft') {
        throw this.notDraftException();
      }

      const supplier = await manager.findOneOrFail(Supplier, {
        where: { id: header.supplierId },
        withDeleted: true,
      });
      const items = await manager.find(PurchaseImportItem, {
        where: { purchaseImportId: importId },
        order: { lineNumber: 'ASC' },
      });

      const { resolved, relinked } = await this.reResolve(manager, items);

      const validation = validateDraft(
        resolved.map(({ item, product }) => ({
          ...this.toDraftLine(item),
          productId: product ? product.id : item.productId,
          linkedProductDeleted:
            item.productId !== null && (!product || !!product.deletedAt),
        })),
      );
      if (!validation.readyToConfirm) {
        throw new BadRequestException({
          code: 'PURCHASE_IMPORT_INVALID',
          message: 'La factura tiene líneas pendientes por revisar.',
          problems: this.toProblems(items, validation.issuesByLine),
        });
      }

      const notes = `Compra proveedor ${supplier.name} — factura ${header.invoiceNumber} (importación XML)`;
      const restocked = new Set<string>();
      let createdProducts = 0;
      let unitsAdded = 0;
      let suppliersAssigned = 0;

      for (const { item, product, wasRelinked } of resolved) {
        // Validated above: every line has an integer quantity >= 1.
        const quantity = item.quantity as number;
        let productId: string;

        if (product) {
          productId = product.id;
          restocked.add(product.id);
          if (!product.supplier) {
            // "Fill the blank": an existing product keeps its original supplier.
            await manager.query(
              'UPDATE "products" SET "supplier_id" = $1 WHERE "id" = $2',
              [supplier.id, product.id],
            );
            product.supplier = supplier;
            suppliersAssigned += 1;
          }
        } else {
          const created = await this.createProductFromLine(
            manager,
            item,
            supplier,
            userId,
          );
          productId = created;
          createdProducts += 1;
          suppliersAssigned += 1;
        }

        await this.inventoryService.createMovement(
          { productId, quantity, notes },
          userId,
          manager,
        );
        unitsAdded += quantity;

        await manager.update(
          PurchaseImportItem,
          { id: item.id },
          {
            productId,
            createdProduct: !product,
            ...(wasRelinked ? { matchType: 'exact' as const } : {}),
          },
        );
      }

      const confirmedAt = new Date();
      await manager.update(
        PurchaseImport,
        { id: importId },
        { confirmedAt, confirmedById: userId },
      );

      const response = new ConfirmPurchaseImportResponseDto();
      response.id = importId;
      response.status = 'confirmed';
      response.confirmedAt = confirmedAt.toISOString();
      response.createdProducts = createdProducts;
      response.restockedProducts = restocked.size;
      response.unitsAdded = unitsAdded;
      response.suppliersAssigned = suppliersAssigned;
      response.relinked = relinked;
      return response;
    });
  }

  /**
   * Re-resolves every line against the catalog as it is NOW: a product may
   * have been created (or deleted) by someone else since upload. A "new" line
   * whose reference now exists is restocked instead — the parts did arrive,
   * only the sale-price data becomes moot — and reported back as relinked.
   */
  private async reResolve(manager: EntityManager, items: PurchaseImportItem[]) {
    const linkedIds = items
      .map((item) => item.productId)
      .filter((id): id is string => !!id);
    const linked = linkedIds.length
      ? await manager.find(Product, {
          where: { id: In(linkedIds) },
          withDeleted: true,
          relations: { supplier: true },
        })
      : [];
    const linkedById = new Map(linked.map((product) => [product.id, product]));

    const newReferences = items
      .filter((item) => !item.productId && item.reference)
      .map((item) => item.reference as string);
    const byReference = new Map<string, Product>();
    if (newReferences.length > 0) {
      const found = await manager.find(Product, {
        where: { reference: In([...new Set(newReferences)]) },
        relations: { supplier: true },
      });
      for (const product of found) byReference.set(product.reference, product);
    }

    const relinked: Array<{ lineNumber: number; reference: string }> = [];
    const resolved = items.map((item) => {
      if (item.productId) {
        return {
          item,
          product: linkedById.get(item.productId) ?? null,
          wasRelinked: false,
        };
      }
      const existing = item.reference ? byReference.get(item.reference) : null;
      if (existing) {
        relinked.push({
          lineNumber: item.lineNumber,
          reference: item.reference as string,
        });
        return { item, product: existing, wasRelinked: true };
      }
      return { item, product: null, wasRelinked: false };
    });

    return { resolved, relinked };
  }

  private async createProductFromLine(
    manager: EntityManager,
    item: PurchaseImportItem,
    supplier: Supplier,
    userId: string,
  ): Promise<string> {
    try {
      // stock 0 on purpose: the movement that follows is what adds the units,
      // so every unit of stock has a movement in the audit trail.
      const created = await this.productsService.create(
        {
          reference: normalizeProductReference(item.reference as string),
          description: normalizeProductDescription(item.description as string),
          salePrice: item.newSalePrice as number,
          saleType: item.newSaleType ?? SaleType.NORMAL,
          stock: 0,
          departmentId: item.newDepartmentId as string,
          groupId: item.newGroupId as string,
          brandId: item.newBrandId as string,
          taxExempt: item.newTaxExempt,
          supplierId: supplier.id,
        },
        userId,
        manager,
      );
      return created.id;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException({
          code: 'PRODUCT_REFERENCE_TAKEN',
          message: `La referencia ${item.reference} ya existe en el catálogo; revisa la factura y vuelve a confirmar.`,
        });
      }
      throw error;
    }
  }

  private toProblems(
    items: PurchaseImportItem[],
    issuesByLine: Map<string, LineIssue[]>,
  ) {
    if (items.length === 0) {
      return [{ itemId: null, lineNumber: null, issue: 'NO_LINES' }];
    }
    return items.flatMap((item) =>
      (issuesByLine.get(item.id) ?? []).map((issue) => ({
        itemId: item.id,
        lineNumber: item.lineNumber,
        issue,
      })),
    );
  }

  // --------------------------------------------------------------- helpers

  private async loadDraft(importId: string): Promise<PurchaseImport> {
    const imp = await this.importsRepository.findOne({
      where: { id: importId },
    });
    if (!imp) {
      throw new NotFoundException('Purchase import not found');
    }
    if (derivePurchaseImportStatus(imp) !== 'draft') {
      throw this.notDraftException();
    }
    return imp;
  }

  private async loadItem(
    importId: string,
    itemId: string,
  ): Promise<PurchaseImportItem> {
    const item = await this.itemsRepository.findOne({
      where: { id: itemId, purchaseImportId: importId },
    });
    if (!item) {
      throw new NotFoundException('Purchase import line not found');
    }
    return item;
  }

  private notDraftException(): ConflictException {
    return new ConflictException({
      code: 'PURCHASE_IMPORT_NOT_DRAFT',
      message: 'Esta importación ya no es un borrador.',
    });
  }

  private async rematch(reference: string | null): Promise<ProductMatch> {
    if (!reference) return { productId: null, matchType: null };
    const matches = await this.matchByReference([reference]);
    const productId = matches.get(reference) ?? null;
    return { productId, matchType: productId ? 'exact' : null };
  }

  private async assertLookupExists(
    repository: Repository<Department | Group | Brand>,
    id: string | null,
    label: string,
  ): Promise<void> {
    if (id === null) return;
    const found = await repository.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException(`Invalid ${label}Id: ${label} not found`);
    }
  }
}
