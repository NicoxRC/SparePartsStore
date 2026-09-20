import { NotFoundException } from '@nestjs/common';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  const data = { nit: '900123456', dv: '7', name: '  Proveedor Uno  ' };

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((value: object) => value),
      save: jest.fn((value: object) =>
        Promise.resolve({ id: 's-1', ...value }),
      ),
      createQueryBuilder: jest.fn(),
    };
    service = new SuppliersService(repo as unknown as Repository<Supplier>);
  });

  describe('findOrCreateByNit', () => {
    it('returns the existing supplier untouched (its name is never overwritten)', async () => {
      const existing = { id: 's-0', nit: '900123456', name: 'RENOMBRADO' };
      repo.findOne.mockResolvedValue(existing);

      const result = await service.findOrCreateByNit(data, 'user-1');

      expect(result).toBe(existing);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('creates a missing supplier with an uppercased, trimmed name', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findOrCreateByNit(data, 'user-1');

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nit: '900123456',
          dv: '7',
          name: 'PROVEEDOR UNO',
        }),
      );
      expect(result.id).toBe('s-1');
    });

    it('truncates an overlong name to 255 chars', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.findOrCreateByNit(
        { ...data, name: 'N'.repeat(300) },
        'user-1',
      );

      const created = (
        repo.create.mock.calls as Array<[{ name: string }]>
      )[0][0];
      expect(created.name).toHaveLength(255);
    });

    it('re-reads the winner when a concurrent upload created it first', async () => {
      const winner = { id: 's-w', nit: '900123456' };
      repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
      repo.save.mockRejectedValue(
        new QueryFailedError('insert', [], { code: '23505' } as never),
      );

      await expect(service.findOrCreateByNit(data, 'user-1')).resolves.toBe(
        winner,
      );
    });

    it('rethrows a unique violation when the row still cannot be found', async () => {
      const error = new QueryFailedError('insert', [], {
        code: '23505',
      } as never);
      repo.findOne.mockResolvedValue(null);
      repo.save.mockRejectedValue(error);

      await expect(service.findOrCreateByNit(data, 'user-1')).rejects.toBe(
        error,
      );
    });

    it('rethrows an unrelated error', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockRejectedValue(new Error('boom'));

      await expect(service.findOrCreateByNit(data, 'user-1')).rejects.toThrow(
        'boom',
      );
    });

    it("uses the given manager's repository", async () => {
      const managerRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'from-manager' }),
      };
      const manager = {
        getRepository: jest.fn().mockReturnValue(managerRepo),
      } as unknown as EntityManager;

      const result = await service.findOrCreateByNit(data, 'user-1', manager);

      expect(result).toEqual({ id: 'from-manager' });
      expect(repo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('renames the supplier and records who', async () => {
      const supplier = { id: 's-1', name: 'OLD', updatedBy: null };
      repo.findOne.mockResolvedValue(supplier);
      repo.save.mockImplementation((value: object) =>
        Promise.resolve({
          createdAt: new Date(),
          updatedAt: new Date(),
          ...value,
        }),
      );

      const result = await service.update('s-1', { name: 'NEW' }, 'user-1');

      expect(result.name).toBe('NEW');
      expect(supplier.updatedBy).toEqual({ id: 'user-1' });
    });

    it('404s for an unknown supplier', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update('nope', { name: 'X' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    let qb: Record<string, jest.Mock>;

    beforeEach(() => {
      qb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);
    });

    it('escapes LIKE metacharacters in the search and searches name and NIT', async () => {
      await service.findAll({ page: 1, limit: 20, search: '100%' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringMatching(/name ILIKE.*nit ILIKE/),
        { search: '%100\\%%' },
      );
    });

    it('orders by name and paginates', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 45]);

      const result = await service.findAll({ page: 2, limit: 20 });

      expect(qb.orderBy).toHaveBeenCalledWith('supplier.name', 'ASC');
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(result.meta).toEqual({
        total: 45,
        page: 2,
        limit: 20,
        totalPages: 3,
      });
    });
  });
});
