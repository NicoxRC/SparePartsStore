import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { Department } from '../departments/entities/department.entity';
import { Group } from '../groups/entities/group.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { INITIAL_INVENTORY_SUPPLIER_NIT } from '../suppliers/initial-inventory-supplier.constant';
import { CreateProductDto } from './dto/create-product.dto';
import { SaleType } from '../common/enums/sale-type.enum';
import { Product } from './entities/product.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ProductsService, calculateCost } from './products.service';

type Repo = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  createQueryBuilder?: jest.Mock;
};

const makeRepo = (): Repo => ({
  findOne: jest.fn(),
  create: jest.fn((data: object) => data),
  save: jest.fn((entity: object) =>
    Promise.resolve({
      id: 'p-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...entity,
    }),
  ),
});

describe('ProductsService', () => {
  let service: ProductsService;
  let products: Repo;
  let departments: Repo;
  let groups: Repo;
  let brands: Repo;
  let suppliers: Repo;
  const cloudinary = {
    isProductImageUrl: jest.fn((url: string) => url.startsWith('https://own/')),
  };

  const department = { id: 'd-1', name: 'DEP' };
  const group = { id: 'g-1', name: 'GRP' };
  const brand = { id: 'b-1', name: 'BRD' };
  const supplier = { id: 's-1', name: 'PROVEEDOR', nit: '900123456' };
  const initialInventory = {
    id: 's-0',
    name: 'INVENTARIO INICIAL',
    nit: INITIAL_INVENTORY_SUPPLIER_NIT,
  };

  const dto: CreateProductDto = {
    reference: 'REF-1',
    description: 'Filtro',
    salePrice: 1650,
    stock: 0,
    departmentId: 'd-1',
    groupId: 'g-1',
    brandId: 'b-1',
  };

  beforeEach(() => {
    products = makeRepo();
    departments = makeRepo();
    groups = makeRepo();
    brands = makeRepo();
    suppliers = makeRepo();
    products.findOne.mockResolvedValue(null);
    departments.findOne.mockResolvedValue(department);
    groups.findOne.mockResolvedValue(group);
    brands.findOne.mockResolvedValue(brand);
    suppliers.findOne.mockResolvedValue(supplier);

    service = new ProductsService(
      products as unknown as Repository<Product>,
      departments as unknown as Repository<Department>,
      groups as unknown as Repository<Group>,
      brands as unknown as Repository<Brand>,
      suppliers as unknown as Repository<Supplier>,
      cloudinary as unknown as CloudinaryService,
    );
  });

  describe('create', () => {
    it('saves an image from this store and rejects any other', async () => {
      await service.create({ ...dto, imageUrl: 'https://own/a.jpg' }, 'u');
      expect(products.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ imageUrl: 'https://own/a.jpg' }),
      );

      await expect(
        service.create({ ...dto, imageUrl: 'https://evil/a.jpg' }, 'u'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('persists taxExempt, defaulting to false', async () => {
      await service.create(dto, 'user-1');
      expect(products.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ taxExempt: false }),
      );

      await service.create({ ...dto, taxExempt: true }, 'user-1');
      expect(products.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ taxExempt: true }),
      );
    });

    it('links the supplier when supplierId is given', async () => {
      const result = await service.create(
        { ...dto, supplierId: 's-1' },
        'user-1',
      );

      expect(products.create).toHaveBeenCalledWith(
        expect.objectContaining({ supplier }),
      );
      expect(result.supplier).toEqual({ id: 's-1', name: 'PROVEEDOR' });
      expect(result.costDerived).toBe(false);
    });

    it('falls back to INVENTARIO INICIAL when no supplier is given', async () => {
      suppliers.findOne.mockResolvedValue(initialInventory);

      const result = await service.create(dto, 'user-1');

      expect(suppliers.findOne).toHaveBeenCalledWith({
        where: { nit: INITIAL_INVENTORY_SUPPLIER_NIT },
      });
      expect(result.supplier).toEqual({
        id: 's-0',
        name: 'INVENTARIO INICIAL',
      });
      expect(result.costDerived).toBe(true);
    });

    it('derives the cost from the price, normal by default', async () => {
      const result = await service.create(dto, 'user-1');

      expect(result.saleType).toBe(SaleType.NORMAL);
      expect(result.cost).toBe(1000); // 1650 / 1.65
    });

    it('derives the cost with the neto factor', async () => {
      const result = await service.create(
        { ...dto, salePrice: 1300, saleType: SaleType.NETO },
        'user-1',
      );

      expect(result.cost).toBe(1000); // 1300 / 1.3
    });

    it('uses the cost given by a purchase instead of deriving it', async () => {
      const result = await service.create(dto, 'user-1', undefined, 700);

      expect(result.cost).toBe(700);
    });

    it('rejects an unknown supplierId', async () => {
      suppliers.findOne.mockResolvedValue(null);

      await expect(
        service.create({ ...dto, supplierId: 'nope' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a reference that is already in use', async () => {
      products.findOne.mockResolvedValue({ id: 'other' });

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects an unknown department, group or brand', async () => {
      departments.findOne.mockResolvedValueOnce(null);
      await expect(service.create(dto, 'u')).rejects.toThrow(NotFoundException);

      groups.findOne.mockResolvedValueOnce(null);
      await expect(service.create(dto, 'u')).rejects.toThrow(NotFoundException);

      brands.findOne.mockResolvedValueOnce(null);
      await expect(service.create(dto, 'u')).rejects.toThrow(NotFoundException);
    });

    it("uses the given manager's repositories instead of its own", async () => {
      const managerRepos = new Map<unknown, Repo>([
        [Product, makeRepo()],
        [Department, makeRepo()],
        [Group, makeRepo()],
        [Brand, makeRepo()],
        [Supplier, makeRepo()],
      ]);
      managerRepos.get(Product)!.findOne.mockResolvedValue(null);
      managerRepos.get(Department)!.findOne.mockResolvedValue(department);
      managerRepos.get(Group)!.findOne.mockResolvedValue(group);
      managerRepos.get(Brand)!.findOne.mockResolvedValue(brand);
      const manager = {
        getRepository: jest.fn((entity: unknown) => managerRepos.get(entity)),
      } as unknown as EntityManager;

      await service.create(dto, 'user-1', manager);

      expect(managerRepos.get(Product)!.save).toHaveBeenCalled();
      expect(products.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    let existing: Partial<Product>;

    beforeEach(() => {
      existing = {
        id: 'p-1',
        reference: 'REF-1',
        salePrice: 1650,
        taxExempt: false,
        supplier: supplier as Supplier,
      };
      jest.spyOn(service, 'findOne').mockResolvedValue(existing as Product);
      products.save.mockImplementation((entity: object) =>
        Promise.resolve({
          createdAt: new Date(),
          updatedAt: new Date(),
          department,
          group,
          brand,
          ...entity,
        }),
      );
    });

    describe('imageUrl', () => {
      it('replaces, removes or rejects the photo', async () => {
        existing.imageUrl = 'https://own/old.jpg';

        let result = await service.update(
          'p-1',
          { imageUrl: 'https://own/new.jpg' },
          'u',
        );
        expect(result.imageUrl).toBe('https://own/new.jpg');

        result = await service.update('p-1', { imageUrl: null }, 'u');
        expect(result.imageUrl).toBeNull();

        await expect(
          service.update('p-1', { imageUrl: 'https://evil/a.jpg' }, 'u'),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });

    describe('cost', () => {
      it('recomputes it from the new price for INVENTARIO INICIAL', async () => {
        existing.supplier = initialInventory as Supplier;
        existing.saleType = SaleType.NORMAL;
        existing.cost = 1000;

        const result = await service.update('p-1', { salePrice: 3300 }, 'u');

        expect(result.cost).toBe(2000);
      });

      it('recomputes it when only the sale type changes', async () => {
        existing.supplier = initialInventory as Supplier;
        existing.saleType = SaleType.NORMAL;

        const result = await service.update(
          'p-1',
          { saleType: SaleType.NETO },
          'u',
        );

        expect(result.cost).toBe(calculateCost(1650, SaleType.NETO));
      });

      it('ignores a typed cost for INVENTARIO INICIAL', async () => {
        existing.supplier = initialInventory as Supplier;
        existing.saleType = SaleType.NORMAL;

        const result = await service.update('p-1', { cost: 5 }, 'u');

        expect(result.cost).toBe(1000);
      });

      it("keeps a real supplier's cost when the price changes", async () => {
        existing.cost = 700;

        const result = await service.update('p-1', { salePrice: 9900 }, 'u');

        expect(result.cost).toBe(700);
      });

      it("lets a real supplier's cost be edited directly", async () => {
        existing.cost = 700;

        const result = await service.update('p-1', { cost: 750 }, 'u');

        expect(result.cost).toBe(750);
      });

      it('derives it again when the product moves back to INVENTARIO INICIAL', async () => {
        existing.cost = 700;
        existing.saleType = SaleType.NORMAL;
        suppliers.findOne.mockResolvedValue(initialInventory);

        const result = await service.update('p-1', { supplierId: null }, 'u');

        expect(result.cost).toBe(1000);
      });
    });

    it('persists taxExempt when provided', async () => {
      await service.update('p-1', { taxExempt: true }, 'u');

      expect(existing.taxExempt).toBe(true);
    });

    it('sets a new supplier', async () => {
      suppliers.findOne.mockResolvedValue({ id: 's-2', name: 'OTRO' });

      await service.update('p-1', { supplierId: 's-2' }, 'u');

      expect(existing.supplier).toEqual({ id: 's-2', name: 'OTRO' });
    });

    it('moves the product back to INVENTARIO INICIAL with null', async () => {
      suppliers.findOne.mockResolvedValue(initialInventory);

      await service.update('p-1', { supplierId: null }, 'u');

      expect(suppliers.findOne).toHaveBeenCalledWith({
        where: { nit: INITIAL_INVENTORY_SUPPLIER_NIT },
      });
      expect(existing.supplier).toBe(initialInventory);
    });

    it('updates the stock', async () => {
      const result = await service.update('p-1', { stock: 12 }, 'u');

      expect(existing.stock).toBe(12);
      expect(result.stock).toBe(12);
    });

    it('leaves the supplier untouched when supplierId is omitted', async () => {
      await service.update('p-1', { salePrice: 3300 }, 'u');

      expect(existing.supplier).toBe(supplier);
    });

    it('rejects an unknown supplierId', async () => {
      suppliers.findOne.mockResolvedValue(null);

      await expect(
        service.update('p-1', { supplierId: 'nope' }, 'u'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('filters by supplierId', async () => {
      const qb = {
        withDeleted: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      products.createQueryBuilder = jest.fn().mockReturnValue(qb);

      await service.findAll({ page: 1, limit: 20, supplierId: 's-1' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.supplier_id = :supplierId',
        { supplierId: 's-1' },
      );
    });
  });
});
