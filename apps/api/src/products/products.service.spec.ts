import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { SaleType } from '../common/enums/sale-type.enum';
import { Department } from '../departments/entities/department.entity';
import { Group } from '../groups/entities/group.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';

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

  const department = { id: 'd-1', name: 'DEP' };
  const group = { id: 'g-1', name: 'GRP' };
  const brand = { id: 'b-1', name: 'BRD' };
  const supplier = { id: 's-1', name: 'PROVEEDOR' };

  const dto: CreateProductDto = {
    reference: 'REF-1',
    description: 'Filtro',
    salePrice: 1650,
    saleType: SaleType.NORMAL,
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
    );
  });

  describe('create', () => {
    it('derives cost from the sale price', async () => {
      await service.create(dto, 'user-1');

      expect(products.create).toHaveBeenCalledWith(
        expect.objectContaining({ cost: 1000 }),
      );
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
    });

    it('leaves the supplier null when none is given', async () => {
      const result = await service.create(dto, 'user-1');

      expect(suppliers.findOne).not.toHaveBeenCalled();
      expect(result.supplier).toBeNull();
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
        saleType: SaleType.NORMAL,
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

    it('persists taxExempt when provided', async () => {
      await service.update('p-1', { taxExempt: true }, 'u');

      expect(existing.taxExempt).toBe(true);
    });

    it('sets a new supplier', async () => {
      suppliers.findOne.mockResolvedValue({ id: 's-2', name: 'OTRO' });

      await service.update('p-1', { supplierId: 's-2' }, 'u');

      expect(existing.supplier).toEqual({ id: 's-2', name: 'OTRO' });
    });

    it('clears the supplier with null', async () => {
      await service.update('p-1', { supplierId: null }, 'u');

      expect(existing.supplier).toBeNull();
      expect(suppliers.findOne).not.toHaveBeenCalled();
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
