import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  let service: CustomersService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  const baseDto: CreateCustomerDto = {
    identificationType: 'NIT',
    identification: '830033494',
    partyType: 'PERSONA_JURIDICA',
    companyName: 'ACME SAS',
    email: 'billing@acme.com',
  };

  const existingCustomer: Customer = {
    id: 'cust-1',
    identificationType: 'NIT',
    identification: '830033494',
    partyType: 'PERSONA_JURIDICA',
    companyName: 'ACME SAS',
    firstName: null,
    familyName: null,
    taxLevelCode: null,
    regimen: null,
    countryCode: 'CO',
    department: null,
    city: null,
    addressLine: null,
    email: 'billing@acme.com',
    phone: null,
    responsableIva: false,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };

  beforeEach(() => {
    repository = {
      create: jest.fn((entity: Partial<Customer>) => entity as Customer),
      save: jest.fn((entity: Partial<Customer>) =>
        Promise.resolve({
          ...entity,
          id: entity.id ?? 'cust-new',
          createdAt: entity.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        } as Customer),
      ),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    service = new CustomersService(
      repository as unknown as Repository<Customer>,
    );
  });

  describe('create', () => {
    it('creates a customer when the identification is not already in use', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.create(baseDto, 'user-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          identificationType: 'NIT',
          identification: '830033494',
        },
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result.identification).toBe('830033494');
      expect(result.companyName).toBe('ACME SAS');
    });

    it('rejects with ConflictException when the app-level pre-check finds a duplicate', async () => {
      repository.findOne.mockResolvedValue(existingCustomer);

      await expect(service.create(baseDto, 'user-1')).rejects.toThrow(
        ConflictException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('maps a DB-level unique violation to ConflictException as a race-condition safety net', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.save.mockRejectedValue(
        new QueryFailedError('INSERT INTO customers ...', [], {
          code: '23505',
        } as unknown as Error),
      );

      await expect(service.create(baseDto, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the customer does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the customer entity when found', async () => {
      repository.findOne.mockResolvedValue(existingCustomer);

      const result = await service.findOne('cust-1');

      expect(result).toBe(existingCustomer);
    });
  });

  describe('update', () => {
    it('applies only the provided fields and leaves the rest untouched', async () => {
      repository.findOne.mockResolvedValue({ ...existingCustomer });

      const dto: UpdateCustomerDto = { phone: '3001234567' };
      const result = await service.update('cust-1', dto, 'user-2');

      expect(result.phone).toBe('3001234567');
      expect(result.identification).toBe(existingCustomer.identification);
      expect(result.companyName).toBe(existingCustomer.companyName);
      expect(result.email).toBe(existingCustomer.email);
      // The identification pair was untouched, so no duplicate lookup runs.
      expect(repository.findOne).toHaveBeenCalledTimes(1);
    });

    it('rejects with ConflictException when changing identification collides with another customer', async () => {
      repository.findOne
        .mockResolvedValueOnce({ ...existingCustomer })
        .mockResolvedValueOnce({ ...existingCustomer, id: 'other-customer' });

      const dto: UpdateCustomerDto = { identification: '900111222' };

      await expect(service.update('cust-1', dto, 'user-2')).rejects.toThrow(
        ConflictException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
