import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { SaleType } from '../common/enums/sale-type.enum';
import { Department } from '../departments/entities/department.entity';
import { Group } from '../groups/entities/group.entity';
import { InventoryService } from '../inventory/inventory.service';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SuppliersService } from '../suppliers/suppliers.service';
import { PurchaseImportItem } from './entities/purchase-import-item.entity';
import { PurchaseImport } from './entities/purchase-import.entity';
import { PurchaseImportsService } from './purchase-imports.service';
import {
  ParsedPurchaseInvoice,
  PurchaseInvoiceXmlParser,
} from './xml/purchase-invoice-xml.parser';

type Mock = jest.Mock;

const supplier = {
  id: 'sup-1',
  nit: '900123456',
  name: 'PROVEEDOR UNO',
} as Supplier;

const parsed: ParsedPurchaseInvoice = {
  invoiceNumber: 'SETP1',
  issueDate: '2026-09-01',
  cufe: 'abc',
  supplier: { nit: '900123456', dv: '7', name: 'Proveedor Uno' },
  lines: [
    {
      lineNumber: 1,
      reference: 'REF-A',
      description: 'Filtro',
      xmlQuantity: 2,
      quantity: 2,
      unitCost: 100,
    },
    {
      lineNumber: 2,
      reference: 'REF-B',
      description: 'Bujia',
      xmlQuantity: 1,
      quantity: 1,
      unitCost: 50,
    },
    {
      lineNumber: 3,
      reference: null,
      description: 'Sin codigo',
      xmlQuantity: 1,
      quantity: 1,
      unitCost: null,
    },
  ],
};

function uniqueViolation(): QueryFailedError {
  return new QueryFailedError('insert', [], { code: '23505' } as never);
}

function item(overrides: Partial<PurchaseImportItem> = {}): PurchaseImportItem {
  return {
    id: 'item-1',
    purchaseImportId: 'imp-1',
    lineNumber: 1,
    reference: 'REF-A',
    description: 'Filtro',
    xmlQuantity: 2,
    quantity: 2,
    unitCost: 100,
    productId: null,
    product: null,
    matchType: null,
    newDepartmentId: 'dep',
    newGroupId: 'grp',
    newBrandId: 'brd',
    newSalePrice: 1500,
    newSaleType: SaleType.NORMAL,
    newTaxExempt: false,
    createdProduct: false,
    ...overrides,
  } as PurchaseImportItem;
}

describe('PurchaseImportsService', () => {
  let service: PurchaseImportsService;
  let imports: {
    findOne: Mock;
    createQueryBuilder: Mock;
    manager: { transaction: Mock };
  };
  let items: { findOne: Mock; update: Mock; delete: Mock; manager: object };
  let products: { find: Mock; findOne: Mock };
  let departments: { findOne: Mock };
  let groups: { findOne: Mock };
  let brands: { findOne: Mock };
  let xmlParser: { parse: Mock };
  let suppliersService: { findOrCreateByNit: Mock };
  let productsService: { create: Mock };
  let inventoryService: { createMovement: Mock };
  let manager: {
    findOne: Mock;
    findOneOrFail: Mock;
    find: Mock;
    save: Mock;
    create: Mock;
    update: Mock;
    query: Mock;
    createQueryBuilder: Mock;
    transaction: Mock;
  };

  const draftHeader = (overrides: Partial<PurchaseImport> = {}) =>
    ({
      id: 'imp-1',
      supplierId: 'sup-1',
      invoiceNumber: 'SETP1',
      confirmedAt: null,
      discardedAt: null,
      ...overrides,
    }) as PurchaseImport;

  beforeEach(() => {
    manager = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn().mockResolvedValue(supplier),
      find: jest.fn(),
      save: jest.fn((_entity: unknown, value: unknown) =>
        Promise.resolve(
          Array.isArray(value) ? value : { id: 'imp-1', ...(value as object) },
        ),
      ),
      create: jest.fn((_entity: unknown, value: object) => value),
      update: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
      transaction: jest.fn((callback: (m: EntityManager) => unknown) =>
        callback(manager as unknown as EntityManager),
      ),
    };
    imports = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: {
        transaction: jest.fn((callback: (m: EntityManager) => unknown) =>
          callback(manager as unknown as EntityManager),
        ),
      },
    };
    items = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      manager,
    };
    products = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    departments = { findOne: jest.fn().mockResolvedValue({ id: 'dep' }) };
    groups = { findOne: jest.fn().mockResolvedValue({ id: 'grp' }) };
    brands = { findOne: jest.fn().mockResolvedValue({ id: 'brd' }) };
    xmlParser = { parse: jest.fn().mockReturnValue(parsed) };
    suppliersService = {
      findOrCreateByNit: jest.fn().mockResolvedValue(supplier),
    };
    productsService = {
      create: jest.fn().mockResolvedValue({ id: 'new-prod' }),
    };
    inventoryService = { createMovement: jest.fn().mockResolvedValue({}) };

    service = new PurchaseImportsService(
      imports as unknown as Repository<PurchaseImport>,
      items as unknown as Repository<PurchaseImportItem>,
      products as unknown as Repository<Product>,
      departments as unknown as Repository<Department>,
      groups as unknown as Repository<Group>,
      brands as unknown as Repository<Brand>,
      xmlParser as unknown as PurchaseInvoiceXmlParser,
      suppliersService as unknown as SuppliersService,
      productsService as unknown as ProductsService,
      inventoryService as unknown as InventoryService,
    );
  });

  // ---------------------------------------------------------------- upload

  describe('upload', () => {
    const file = { buffer: Buffer.from('<x/>'), originalname: 'factura.xml' };

    beforeEach(() => {
      imports.findOne.mockResolvedValue(null);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ id: 'imp-1' } as never);
    });

    it('creates a draft, auto-matching only the references that exist', async () => {
      products.find.mockResolvedValue([{ id: 'prod-a', reference: 'REF-A' }]);

      await service.upload(file, 'user-1');

      const savedCall = (
        manager.save.mock.calls as Array<[unknown, unknown]>
      ).find(([entity]) => entity === PurchaseImportItem);
      const saved = savedCall?.[1] as PurchaseImportItem[];
      expect(saved.map((i) => [i.productId, i.matchType])).toEqual([
        ['prod-a', 'exact'],
        [null, null],
        [null, null],
      ]);
      expect(manager.create).toHaveBeenCalledWith(
        PurchaseImport,
        expect.objectContaining({
          supplierId: 'sup-1',
          invoiceNumber: 'SETP1',
          cufe: 'abc',
          sourceFilename: 'factura.xml',
        }),
      );
    });

    it('resolves the supplier from the XML (find-or-create by NIT)', async () => {
      await service.upload(file, 'user-1');

      expect(suppliersService.findOrCreateByNit).toHaveBeenCalledWith(
        parsed.supplier,
        'user-1',
      );
    });

    it('does not query products when no line has a reference', async () => {
      xmlParser.parse.mockReturnValue({
        ...parsed,
        lines: [parsed.lines[2]],
      });

      await service.upload(file, 'user-1');

      expect(products.find).not.toHaveBeenCalled();
    });

    it('rejects a duplicate by CUFE before creating any supplier', async () => {
      imports.findOne.mockResolvedValueOnce(draftHeader({ id: 'old' }));

      await expect(service.upload(file, 'user-1')).rejects.toMatchObject({
        response: {
          code: 'PURCHASE_IMPORT_DUPLICATE',
          existingImportId: 'old',
          existingStatus: 'draft',
        },
      });
      expect(suppliersService.findOrCreateByNit).not.toHaveBeenCalled();
    });

    it('rejects a duplicate by supplier + invoice number', async () => {
      imports.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          draftHeader({ id: 'old', confirmedAt: new Date() }),
        );

      await expect(service.upload(file, 'user-1')).rejects.toMatchObject({
        response: {
          code: 'PURCHASE_IMPORT_DUPLICATE',
          existingImportId: 'old',
          existingStatus: 'confirmed',
        },
      });
    });

    it('only considers non-discarded imports as duplicates', async () => {
      await service.upload(file, 'user-1');

      for (const [query] of imports.findOne.mock.calls as Array<
        [{ where: { discardedAt: unknown } }]
      >) {
        expect(query.where.discardedAt).toBeDefined();
      }
    });

    it('skips the CUFE check when the XML has none', async () => {
      xmlParser.parse.mockReturnValue({ ...parsed, cufe: null });

      await service.upload(file, 'user-1');

      expect(imports.findOne).toHaveBeenCalledTimes(1);
    });

    it('turns a unique-violation race into the same duplicate 409', async () => {
      imports.manager.transaction.mockRejectedValue(uniqueViolation());
      imports.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(draftHeader({ id: 'raced' }));

      await expect(service.upload(file, 'user-1')).rejects.toMatchObject({
        response: { existingImportId: 'raced' },
      });
    });

    it('rethrows an unrelated database error', async () => {
      imports.manager.transaction.mockRejectedValue(new Error('boom'));

      await expect(service.upload(file, 'user-1')).rejects.toThrow('boom');
    });

    it('lets a parser 422 propagate without touching the database', async () => {
      xmlParser.parse.mockImplementation(() => {
        throw new UnprocessableEntityException({ code: 'INVALID_XML' });
      });

      await expect(service.upload(file, 'user-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(imports.findOne).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------ list

  describe('findAll', () => {
    let qb: Record<string, Mock>;

    beforeEach(() => {
      qb = {
        withDeleted: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      imports.createQueryBuilder.mockReturnValue(qb);
    });

    it.each([
      ['draft', 'imp.confirmedAt IS NULL AND imp.discardedAt IS NULL'],
      ['confirmed', 'imp.confirmedAt IS NOT NULL'],
      ['discarded', 'imp.discardedAt IS NOT NULL'],
    ] as const)('filters status %s', async (status, clause) => {
      await service.findAll({ page: 1, limit: 20, status });

      expect(qb.andWhere).toHaveBeenCalledWith(clause);
    });

    it('orders drafts by supplier then newest first', async () => {
      await service.findAll({ page: 1, limit: 20, status: 'draft' });

      expect(qb.orderBy).toHaveBeenCalledWith('supplier.name', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('imp.createdAt', 'DESC');
    });

    it('orders every other listing newest first', async () => {
      await service.findAll({ page: 1, limit: 20, status: 'confirmed' });

      expect(qb.orderBy).toHaveBeenCalledWith('imp.createdAt', 'DESC');
      expect(qb.addOrderBy).not.toHaveBeenCalled();
    });

    it('escapes LIKE metacharacters in the search term', async () => {
      await service.findAll({ page: 1, limit: 20, search: '50%_off' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%50\\%\\_off%' },
      );
    });

    it('filters by supplier and paginates', async () => {
      await service.findAll({ page: 3, limit: 10, supplierId: 'sup-1' });

      expect(qb.andWhere).toHaveBeenCalledWith('imp.supplierId = :supplierId', {
        supplierId: 'sup-1',
      });
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('maps rows with their line count and derived status', async () => {
      qb.getManyAndCount.mockResolvedValue([
        [
          {
            ...draftHeader(),
            supplier,
            issueDate: '2026-09-01',
            sourceFilename: 'f.xml',
            createdAt: new Date('2026-09-02T00:00:00Z'),
            createdBy: { firstName: 'Ana', lastName: 'Perez' },
            lineCount: 4,
          },
        ],
        1,
      ]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.meta.totalPages).toBe(1);
      expect(result.data[0]).toMatchObject({
        status: 'draft',
        lineCount: 4,
        createdByName: 'Ana Perez',
      });
    });
  });

  // ---------------------------------------------------------------- detail

  describe('findOne', () => {
    let qb: Record<string, Mock>;

    const detailImport = (overrides: Partial<PurchaseImport> = {}) => ({
      ...draftHeader(),
      supplier,
      issueDate: '2026-09-01',
      cufe: 'abc',
      sourceFilename: 'f.xml',
      createdAt: new Date(),
      createdBy: null,
      items: [item()],
      ...overrides,
    });

    beforeEach(() => {
      qb = {
        withDeleted: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      };
      imports.createQueryBuilder.mockReturnValue(qb);
    });

    it('404s when the import does not exist', async () => {
      qb.getOne.mockResolvedValue(null);

      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
    });

    it('is ready to confirm when the draft has no issues', async () => {
      qb.getOne.mockResolvedValue(detailImport());

      const detail = await service.findOne('imp-1');

      expect(detail.readyToConfirm).toBe(true);
      expect(detail.items[0].issues).toEqual([]);
      expect(detail.items[0].status).toBe('new');
    });

    it('exposes per-line issues and is not ready while any remain', async () => {
      qb.getOne.mockResolvedValue(
        detailImport({ items: [item({ quantity: null, newSalePrice: null })] }),
      );

      const detail = await service.findOne('imp-1');

      expect(detail.readyToConfirm).toBe(false);
      expect(detail.items[0].issues).toEqual(
        expect.arrayContaining(['MISSING_QUANTITY', 'INVALID_SALE_PRICE']),
      );
    });

    it('flags a linked product that was soft-deleted', async () => {
      qb.getOne.mockResolvedValue(
        detailImport({
          items: [
            item({
              productId: 'p',
              matchType: 'exact',
              product: {
                id: 'p',
                reference: 'R',
                description: 'D',
                stock: 1,
                deletedAt: new Date(),
              } as Product,
            }),
          ],
        }),
      );

      const detail = await service.findOne('imp-1');

      expect(detail.items[0].issues).toEqual(['LINKED_PRODUCT_DELETED']);
      expect(detail.items[0].status).toBe('existing');
    });

    it('reports no issues and never ready for a confirmed import', async () => {
      qb.getOne.mockResolvedValue(
        detailImport({
          confirmedAt: new Date(),
          items: [item({ quantity: null })],
        }),
      );

      const detail = await service.findOne('imp-1');

      expect(detail.status).toBe('confirmed');
      expect(detail.readyToConfirm).toBe(false);
      expect(detail.items[0].issues).toEqual([]);
    });
  });

  // --------------------------------------------------------------- editing

  describe('updateItem', () => {
    beforeEach(() => {
      imports.findOne.mockResolvedValue(draftHeader());
      items.findOne.mockResolvedValue(item());
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ id: 'imp-1' } as never);
    });

    it('404s for a missing import and 409s for a non-draft', async () => {
      imports.findOne.mockResolvedValueOnce(null);
      await expect(service.updateItem('x', 'i', {})).rejects.toThrow(
        NotFoundException,
      );

      imports.findOne.mockResolvedValueOnce(
        draftHeader({ confirmedAt: new Date() }),
      );
      await expect(service.updateItem('x', 'i', {})).rejects.toMatchObject({
        response: { code: 'PURCHASE_IMPORT_NOT_DRAFT' },
      });

      imports.findOne.mockResolvedValueOnce(
        draftHeader({ discardedAt: new Date() }),
      );
      await expect(service.updateItem('x', 'i', {})).rejects.toThrow(
        ConflictException,
      );
    });

    it('404s for a line that is not in this import', async () => {
      items.findOne.mockResolvedValue(null);

      await expect(service.updateItem('imp-1', 'i', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('applies plain field edits', async () => {
      await service.updateItem('imp-1', 'item-1', {
        quantity: 5,
        description: 'Nueva',
        salePrice: 2000,
        saleType: SaleType.NETO,
        taxExempt: true,
      });

      expect(items.update).toHaveBeenCalledWith(
        { id: 'item-1' },
        {
          quantity: 5,
          description: 'Nueva',
          newSalePrice: 2000,
          newSaleType: SaleType.NETO,
          newTaxExempt: true,
        },
      );
    });

    it('does not write when nothing changed', async () => {
      await service.updateItem('imp-1', 'item-1', {});

      expect(items.update).not.toHaveBeenCalled();
    });

    it('re-matches an unlinked line when its reference changes (found)', async () => {
      products.find.mockResolvedValue([{ id: 'prod-x', reference: 'NEW-REF' }]);

      await service.updateItem('imp-1', 'item-1', { reference: 'NEW-REF' });

      expect(items.update).toHaveBeenCalledWith(
        { id: 'item-1' },
        { reference: 'NEW-REF', productId: 'prod-x', matchType: 'exact' },
      );
    });

    it('unlinks when the new reference matches nothing', async () => {
      items.findOne.mockResolvedValue(
        item({ productId: 'old', matchType: 'exact' }),
      );

      await service.updateItem('imp-1', 'item-1', { reference: 'NOPE' });

      expect(items.update).toHaveBeenCalledWith(
        { id: 'item-1' },
        { reference: 'NOPE', productId: null, matchType: null },
      );
    });

    it('keeps a manual link when the reference changes', async () => {
      items.findOne.mockResolvedValue(
        item({ productId: 'manual-p', matchType: 'manual' }),
      );

      await service.updateItem('imp-1', 'item-1', { reference: 'OTHER' });

      expect(products.find).not.toHaveBeenCalled();
      expect(items.update).toHaveBeenCalledWith(
        { id: 'item-1' },
        { reference: 'OTHER' },
      );
    });

    it('links manually to an existing product', async () => {
      products.findOne.mockResolvedValue({ id: 'prod-9' });

      await service.updateItem('imp-1', 'item-1', { productId: 'prod-9' });

      expect(items.update).toHaveBeenCalledWith(
        { id: 'item-1' },
        { productId: 'prod-9', matchType: 'manual' },
      );
    });

    it('rejects a manual link to a missing or soft-deleted product', async () => {
      products.findOne.mockResolvedValue(null);

      await expect(
        service.updateItem('imp-1', 'item-1', { productId: 'gone' }),
      ).rejects.toThrow(NotFoundException);
      expect(items.update).not.toHaveBeenCalled();
    });

    it('removing the manual link re-runs the exact match', async () => {
      items.findOne.mockResolvedValue(
        item({ productId: 'manual-p', matchType: 'manual' }),
      );
      products.find.mockResolvedValue([{ id: 'prod-a', reference: 'REF-A' }]);

      await service.updateItem('imp-1', 'item-1', { productId: null });

      expect(items.update).toHaveBeenCalledWith(
        { id: 'item-1' },
        { productId: 'prod-a', matchType: 'exact' },
      );
    });

    it('removing the manual link with no match leaves the line new', async () => {
      items.findOne.mockResolvedValue(
        item({ productId: 'manual-p', matchType: 'manual' }),
      );

      await service.updateItem('imp-1', 'item-1', { productId: null });

      expect(items.update).toHaveBeenCalledWith(
        { id: 'item-1' },
        { productId: null, matchType: null },
      );
    });

    it('clears a lookup with null without checking it exists', async () => {
      await service.updateItem('imp-1', 'item-1', { departmentId: null });

      expect(departments.findOne).not.toHaveBeenCalled();
      expect(items.update).toHaveBeenCalledWith(
        { id: 'item-1' },
        { newDepartmentId: null },
      );
    });

    it.each([
      ['departmentId', () => departments],
      ['groupId', () => groups],
      ['brandId', () => brands],
    ] as const)('404s for an unknown %s', async (field, repo) => {
      repo().findOne.mockResolvedValue(null);

      await expect(
        service.updateItem('imp-1', 'item-1', { [field]: 'nope' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteItem', () => {
    beforeEach(() => {
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ id: 'imp-1' } as never);
    });

    it('deletes a line of a draft', async () => {
      imports.findOne.mockResolvedValue(draftHeader());
      items.findOne.mockResolvedValue(item());

      await service.deleteItem('imp-1', 'item-1');

      expect(items.delete).toHaveBeenCalledWith({ id: 'item-1' });
    });

    it('refuses on a non-draft', async () => {
      imports.findOne.mockResolvedValue(
        draftHeader({ confirmedAt: new Date() }),
      );

      await expect(service.deleteItem('imp-1', 'item-1')).rejects.toThrow(
        ConflictException,
      );
      expect(items.delete).not.toHaveBeenCalled();
    });

    it('404s for a missing line', async () => {
      imports.findOne.mockResolvedValue(draftHeader());
      items.findOne.mockResolvedValue(null);

      await expect(service.deleteItem('imp-1', 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('applyClassification', () => {
    let qb: Record<string, Mock>;

    beforeEach(() => {
      imports.findOne.mockResolvedValue(draftHeader());
      qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      manager.createQueryBuilder.mockReturnValue(qb);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ id: 'imp-1' } as never);
    });

    it('rejects an empty body', async () => {
      await expect(service.applyClassification('imp-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuses on a non-draft', async () => {
      imports.findOne.mockResolvedValue(
        draftHeader({ discardedAt: new Date() }),
      );

      await expect(
        service.applyClassification('imp-1', { brandId: 'brd' }),
      ).rejects.toThrow(ConflictException);
    });

    it('404s for an unknown lookup and writes nothing', async () => {
      brands.findOne.mockResolvedValue(null);

      await expect(
        service.applyClassification('imp-1', { brandId: 'nope' }),
      ).rejects.toThrow(NotFoundException);
      expect(qb.execute).not.toHaveBeenCalled();
    });

    it('fills only unlinked lines whose field is empty, one update per field', async () => {
      await service.applyClassification('imp-1', {
        departmentId: 'dep',
        brandId: 'brd',
      });

      expect(qb.execute).toHaveBeenCalledTimes(2);
      expect(qb.set).toHaveBeenCalledWith({ newDepartmentId: 'dep' });
      expect(qb.set).toHaveBeenCalledWith({ newBrandId: 'brd' });
      const wheres = qb.where.mock.calls.map(([sql]) => sql as string);
      expect(wheres[0]).toContain('product_id IS NULL');
      expect(wheres[0]).toContain('new_department_id IS NULL');
      expect(wheres[1]).toContain('new_brand_id IS NULL');
    });
  });

  describe('discard', () => {
    let qb: Record<string, Mock>;

    beforeEach(() => {
      imports.findOne.mockResolvedValue(draftHeader());
      qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      imports.createQueryBuilder.mockReturnValue(qb);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ id: 'imp-1' } as never);
    });

    it('discards a draft, recording who', async () => {
      await service.discard('imp-1', 'user-1');

      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({ discardedById: 'user-1' }),
      );
    });

    it('404s for a missing import', async () => {
      imports.findOne.mockResolvedValue(null);

      await expect(service.discard('x', 'u')).rejects.toThrow(
        NotFoundException,
      );
    });

    it.each([{ confirmedAt: new Date() }, { discardedAt: new Date() }])(
      'refuses a non-draft (%o)',
      async (state) => {
        imports.findOne.mockResolvedValue(draftHeader(state));

        await expect(service.discard('imp-1', 'u')).rejects.toThrow(
          ConflictException,
        );
      },
    );

    it('409s when a concurrent confirm won the race', async () => {
      qb.execute.mockResolvedValue({ affected: 0 });

      await expect(service.discard('imp-1', 'u')).rejects.toMatchObject({
        response: { code: 'PURCHASE_IMPORT_NOT_DRAFT' },
      });
    });
  });

  // --------------------------------------------------------------- confirm

  describe('confirm', () => {
    let lines: PurchaseImportItem[];
    let linkedProducts: Array<Partial<Product>>;
    let referenceProducts: Array<Partial<Product>>;

    beforeEach(() => {
      lines = [];
      linkedProducts = [];
      referenceProducts = [];
      manager.findOne.mockResolvedValue(draftHeader());
      manager.find.mockImplementation(
        (entity: unknown, options: { where: Record<string, unknown> }) => {
          if (entity === PurchaseImportItem) return Promise.resolve(lines);
          if (options.where.id) return Promise.resolve(linkedProducts);
          if (options.where.reference)
            return Promise.resolve(referenceProducts);
          return Promise.resolve([]);
        },
      );
    });

    const problemsOf = async (): Promise<
      Array<{ itemId: string | null; lineNumber: number | null; issue: string }>
    > => {
      try {
        await service.confirm('imp-1', 'user-1');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const body = (error as BadRequestException).getResponse() as {
          code: string;
          problems: never[];
        };
        expect(body.code).toBe('PURCHASE_IMPORT_INVALID');
        return body.problems;
      }
      throw new Error('expected confirm to fail');
    };

    const expectNothingWritten = () => {
      expect(productsService.create).not.toHaveBeenCalled();
      expect(inventoryService.createMovement).not.toHaveBeenCalled();
      expect(manager.update).not.toHaveBeenCalled();
    };

    it('404s for a missing import', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(service.confirm('x', 'u')).rejects.toThrow(
        NotFoundException,
      );
    });

    it.each([{ confirmedAt: new Date() }, { discardedAt: new Date() }])(
      'refuses a non-draft (%o)',
      async (state) => {
        manager.findOne.mockResolvedValue(draftHeader(state));

        await expect(service.confirm('imp-1', 'u')).rejects.toMatchObject({
          response: { code: 'PURCHASE_IMPORT_NOT_DRAFT' },
        });
        expectNothingWritten();
      },
    );

    it('locks the header row', async () => {
      lines = [item()];

      await service.confirm('imp-1', 'user-1');

      expect(manager.findOne).toHaveBeenCalledWith(
        PurchaseImport,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
    });

    it('rejects an empty draft with NO_LINES', async () => {
      expect(await problemsOf()).toEqual([
        { itemId: null, lineNumber: null, issue: 'NO_LINES' },
      ]);
      expectNothingWritten();
    });

    it('returns every problem at once and writes nothing', async () => {
      lines = [
        item({ id: 'a', lineNumber: 1, quantity: null }),
        item({ id: 'b', lineNumber: 2, reference: 'B', newSalePrice: 10 }),
      ];

      const problems = await problemsOf();

      expect(problems).toEqual([
        { itemId: 'a', lineNumber: 1, issue: 'MISSING_QUANTITY' },
        { itemId: 'b', lineNumber: 2, issue: 'INVALID_SALE_PRICE' },
      ]);
      expectNothingWritten();
    });

    it('blocks two new lines with the same reference', async () => {
      lines = [
        item({ id: 'a', lineNumber: 1, reference: 'DUP' }),
        item({ id: 'b', lineNumber: 2, reference: 'DUP' }),
      ];

      const problems = await problemsOf();

      expect(problems.map((p) => p.issue)).toEqual([
        'DUPLICATE_NEW_REFERENCE',
        'DUPLICATE_NEW_REFERENCE',
      ]);
    });

    it('flags a linked product that was soft-deleted since linking', async () => {
      lines = [item({ productId: 'p1', matchType: 'manual' })];
      linkedProducts = [{ id: 'p1', deletedAt: new Date(), supplier: null }];

      expect((await problemsOf())[0].issue).toBe('LINKED_PRODUCT_DELETED');
    });

    it('creates missing products (stock 0), restocks existing ones and fills a blank supplier', async () => {
      lines = [
        item({ id: 'new', lineNumber: 1, reference: 'NEW-1', quantity: 4 }),
        item({
          id: 'old',
          lineNumber: 2,
          reference: 'OLD-1',
          quantity: 6,
          productId: 'p-old',
          matchType: 'exact',
        }),
      ];
      linkedProducts = [{ id: 'p-old', deletedAt: null, supplier: null }];

      const result = await service.confirm('imp-1', 'user-1');

      expect(productsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: 'NEW-1',
          stock: 0,
          salePrice: 1500,
          departmentId: 'dep',
          groupId: 'grp',
          brandId: 'brd',
          supplierId: 'sup-1',
        }),
        'user-1',
        manager,
      );
      const notes =
        'Compra proveedor PROVEEDOR UNO — factura SETP1 (importación XML)';
      expect(inventoryService.createMovement).toHaveBeenNthCalledWith(
        1,
        { productId: 'new-prod', quantity: 4, notes },
        'user-1',
        manager,
      );
      expect(inventoryService.createMovement).toHaveBeenNthCalledWith(
        2,
        { productId: 'p-old', quantity: 6, notes },
        'user-1',
        manager,
      );
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "products" SET "supplier_id"'),
        ['sup-1', 'p-old'],
      );
      expect(manager.update).toHaveBeenCalledWith(
        PurchaseImportItem,
        { id: 'new' },
        { productId: 'new-prod', createdProduct: true },
      );
      expect(manager.update).toHaveBeenCalledWith(
        PurchaseImportItem,
        { id: 'old' },
        { productId: 'p-old', createdProduct: false },
      );
      expect(manager.update).toHaveBeenCalledWith(
        PurchaseImport,
        { id: 'imp-1' },
        { confirmedAt: expect.any(Date) as Date, confirmedById: 'user-1' },
      );
      expect(result).toMatchObject({
        id: 'imp-1',
        status: 'confirmed',
        createdProducts: 1,
        restockedProducts: 1,
        unitsAdded: 10,
        suppliersAssigned: 2,
        relinked: [],
      });
    });

    it('never overwrites the supplier of an existing product', async () => {
      lines = [item({ productId: 'p-old', matchType: 'exact' })];
      linkedProducts = [
        { id: 'p-old', deletedAt: null, supplier: { id: 'other' } as Supplier },
      ];

      const result = await service.confirm('imp-1', 'user-1');

      expect(manager.query).not.toHaveBeenCalled();
      expect(result.suppliersAssigned).toBe(0);
    });

    it('assigns the supplier once when two lines restock the same product', async () => {
      lines = [
        item({ id: 'a', lineNumber: 1, productId: 'p', matchType: 'exact' }),
        item({ id: 'b', lineNumber: 2, productId: 'p', matchType: 'manual' }),
      ];
      linkedProducts = [{ id: 'p', deletedAt: null, supplier: null }];

      const result = await service.confirm('imp-1', 'user-1');

      expect(manager.query).toHaveBeenCalledTimes(1);
      expect(result.restockedProducts).toBe(1);
      expect(result.unitsAdded).toBe(4);
    });

    it('restocks a "new" line whose reference appeared before confirm and reports it as relinked', async () => {
      lines = [item({ id: 'x', lineNumber: 7, reference: 'JUST-ADDED' })];
      referenceProducts = [
        {
          id: 'p-late',
          reference: 'JUST-ADDED',
          deletedAt: null,
          supplier: null,
        },
      ];

      const result = await service.confirm('imp-1', 'user-1');

      expect(productsService.create).not.toHaveBeenCalled();
      expect(inventoryService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'p-late' }),
        'user-1',
        manager,
      );
      expect(manager.update).toHaveBeenCalledWith(
        PurchaseImportItem,
        { id: 'x' },
        { productId: 'p-late', createdProduct: false, matchType: 'exact' },
      );
      expect(result.relinked).toEqual([
        { lineNumber: 7, reference: 'JUST-ADDED' },
      ]);
      expect(result.createdProducts).toBe(0);
    });

    it('does not require new-product data on a line that got relinked', async () => {
      lines = [
        item({
          reference: 'JUST-ADDED',
          newSalePrice: null,
          newDepartmentId: null,
        }),
      ];
      referenceProducts = [
        {
          id: 'p-late',
          reference: 'JUST-ADDED',
          deletedAt: null,
          supplier: null,
        },
      ];

      await expect(service.confirm('imp-1', 'user-1')).resolves.toBeDefined();
    });

    it('turns a reference collision on create into a 409 and never confirms', async () => {
      lines = [item()];
      productsService.create.mockRejectedValue(
        new ConflictException('Reference already in use'),
      );

      await expect(service.confirm('imp-1', 'user-1')).rejects.toMatchObject({
        response: { code: 'PRODUCT_REFERENCE_TAKEN' },
      });
      expect(manager.update).not.toHaveBeenCalledWith(
        PurchaseImport,
        expect.anything(),
        expect.anything(),
      );
    });

    it('propagates a movement failure and never marks the import confirmed', async () => {
      lines = [item()];
      inventoryService.createMovement.mockRejectedValue(new Error('db down'));

      await expect(service.confirm('imp-1', 'user-1')).rejects.toThrow(
        'db down',
      );
      expect(manager.update).not.toHaveBeenCalledWith(
        PurchaseImport,
        expect.anything(),
        expect.anything(),
      );
    });

    it('rethrows a non-conflict error from product creation as-is', async () => {
      lines = [item()];
      productsService.create.mockRejectedValue(new NotFoundException('gone'));

      await expect(service.confirm('imp-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
