import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { Invoice } from '../invoicing/invoices/entities/invoice.entity';
import { CashRegisterService } from './cash-register.service';
import { CashRegister } from './entities/cash-register.entity';

describe('CashRegisterService', () => {
  let service: CashRegisterService;
  let cashRegisterRepository: {
    findOne: jest.Mock;
    create: jest.Mock<Partial<CashRegister>, [Partial<CashRegister>]>;
    save: jest.Mock<Promise<CashRegister>, [Partial<CashRegister>]>;
    findAndCount: jest.Mock;
  };
  let invoicesRepository: { createQueryBuilder: jest.Mock };
  let queryBuilder: {
    select: jest.Mock;
    where: jest.Mock;
    getRawOne: jest.Mock;
  };

  const openRegister: CashRegister = {
    id: 'reg-1',
    registerDate: '2026-09-16',
    openedAt: new Date('2026-09-16T13:05:00.000Z'), // 08:05am Bogotá
    openedBy: { id: 'user-1' } as CashRegister['openedBy'],
    closedAt: null,
    closedBy: null,
    totalAmount: null,
  };

  beforeEach(() => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sum: '150000' }),
    };
    cashRegisterRepository = {
      findOne: jest.fn(),
      create: jest.fn<Partial<CashRegister>, [Partial<CashRegister>]>(
        (entity) => entity,
      ),
      save: jest.fn<Promise<CashRegister>, [Partial<CashRegister>]>((entity) =>
        Promise.resolve({ ...openRegister, ...entity }),
      ),
      findAndCount: jest.fn(),
    };
    invoicesRepository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    service = new CashRegisterService(
      cashRegisterRepository as unknown as Repository<CashRegister>,
      invoicesRepository as unknown as Repository<Invoice>,
    );

    jest.useFakeTimers().setSystemTime(new Date('2026-09-16T18:00:00.000Z')); // 1pm Bogotá
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('open', () => {
    it('creates a register for today when none exists yet', async () => {
      cashRegisterRepository.findOne
        .mockResolvedValueOnce(null) // pre-check
        .mockResolvedValueOnce(openRegister); // findWithRelations

      await service.open('user-1');

      expect(cashRegisterRepository.findOne).toHaveBeenCalledWith({
        where: { registerDate: '2026-09-16' },
      });
      expect(cashRegisterRepository.save).toHaveBeenCalled();
    });

    it('rejects with ConflictException when today is already open', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(openRegister);

      await expect(service.open('user-1')).rejects.toThrow(ConflictException);
      expect(cashRegisterRepository.save).not.toHaveBeenCalled();
    });

    it('maps a DB-level unique violation to ConflictException as a race-condition safety net', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(null);
      cashRegisterRepository.save.mockRejectedValueOnce(
        new QueryFailedError('INSERT INTO cash_registers ...', [], {
          code: '23505',
        } as unknown as Error),
      );

      await expect(service.open('user-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('close', () => {
    it('rejects with NotFoundException when nothing was opened today', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.close('user-1')).rejects.toThrow(NotFoundException);
    });

    it('rejects with ConflictException when today is already closed', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce({
        ...openRegister,
        closedAt: new Date('2026-09-16T23:00:00.000Z'),
      });

      await expect(service.close('user-1')).rejects.toThrow(ConflictException);
    });

    it("auto-computes the total from that day's invoices and closes the register", async () => {
      cashRegisterRepository.findOne
        .mockResolvedValueOnce({ ...openRegister })
        .mockResolvedValueOnce({
          ...openRegister,
          closedAt: new Date(),
          totalAmount: 150000,
        });

      await service.close('user-1');

      const saved = cashRegisterRepository.save.mock
        .calls[0][0] as CashRegister;
      expect(saved.totalAmount).toBe(150000);
      expect(saved.closedAt).not.toBeNull();
      expect(saved.closedBy).toEqual({ id: 'user-1' });
    });

    it('queries invoices within the Bogotá-local day, not the UTC day', async () => {
      cashRegisterRepository.findOne
        .mockResolvedValueOnce({ ...openRegister })
        .mockResolvedValueOnce({ ...openRegister, closedAt: new Date() });

      await service.close('user-1');

      // 2026-09-16 in America/Bogota (UTC-5) is
      // [2026-09-16T05:00:00.000Z, 2026-09-17T05:00:00.000Z) in UTC.
      expect(queryBuilder.where).toHaveBeenCalledWith(expect.any(String), {
        start: new Date('2026-09-16T05:00:00.000Z'),
        end: new Date('2026-09-17T05:00:00.000Z'),
      });
    });
  });

  describe('assertOpenToday', () => {
    it('resolves when today has an open register', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(openRegister);

      await expect(service.assertOpenToday()).resolves.toBeUndefined();
    });

    it('throws BadRequestException when nothing is open today', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.assertOpenToday()).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when today is already closed', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce({
        ...openRegister,
        closedAt: new Date(),
      });

      await expect(service.assertOpenToday()).rejects.toThrow(
        BadRequestException,
      );
    });

    it('treats "today" as the Bogotá calendar day even late at night UTC', async () => {
      // 11:30pm Bogotá on Sep 16 is already 04:30am UTC on Sep 17 — a naive
      // server-local/UTC "today" would look up the wrong date.
      jest.setSystemTime(new Date('2026-09-17T04:30:00.000Z'));
      cashRegisterRepository.findOne.mockResolvedValueOnce(openRegister);

      await service.assertOpenToday();

      expect(cashRegisterRepository.findOne).toHaveBeenCalledWith({
        where: { registerDate: '2026-09-16' },
      });
    });
  });

  describe('getTodayStatus', () => {
    it('returns isOpen: false with nulls when nothing was opened today', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(null);

      const status = await service.getTodayStatus();

      expect(status).toEqual({
        isOpen: false,
        register: null,
        totalSoFar: null,
      });
    });

    it('returns a live totalSoFar preview while open, without persisting it', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(openRegister);

      const status = await service.getTodayStatus();

      expect(status.isOpen).toBe(true);
      expect(status.totalSoFar).toBe(150000);
      expect(cashRegisterRepository.save).not.toHaveBeenCalled();
    });

    it('returns totalSoFar: null once closed', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce({
        ...openRegister,
        closedAt: new Date(),
        totalAmount: 150000,
      });

      const status = await service.getTodayStatus();

      expect(status.isOpen).toBe(false);
      expect(status.totalSoFar).toBeNull();
    });
  });
});
