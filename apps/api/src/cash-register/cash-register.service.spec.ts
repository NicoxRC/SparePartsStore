import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { In, QueryFailedError, Repository } from 'typeorm';
import { CreditNote } from '../invoicing/credit-notes/entities/credit-note.entity';
import { DebitNote } from '../invoicing/debit-notes/entities/debit-note.entity';
import { Invoice } from '../invoicing/invoices/entities/invoice.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { CashRegisterService } from './cash-register.service';
import { CashMovement } from './entities/cash-movement.entity';
import { CashRegister } from './entities/cash-register.entity';

describe('CashRegisterService', () => {
  let service: CashRegisterService;
  let cashRegisterRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock<Partial<CashRegister>, [Partial<CashRegister>]>;
    save: jest.Mock<Promise<CashRegister>, [Partial<CashRegister>]>;
    findAndCount: jest.Mock;
  };
  let cashMovementRepository: {
    create: jest.Mock<Partial<CashMovement>, [Partial<CashMovement>]>;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let invoicesRepository: { createQueryBuilder: jest.Mock };
  let quotationsRepository: { createQueryBuilder: jest.Mock };
  let debitNotesRepository: { find: jest.Mock };
  let creditNotesRepository: { find: jest.Mock };
  let invoiceQueryBuilder: {
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    select: jest.Mock;
    where: jest.Mock;
    getRawOne: jest.Mock;
    getMany: jest.Mock;
  };
  let quotationQueryBuilder: {
    select: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getRawOne: jest.Mock;
  };
  let movementQueryBuilder: {
    select: jest.Mock;
    where: jest.Mock;
    getRawOne: jest.Mock;
  };

  const openRegister: CashRegister = {
    id: 'reg-1',
    registerDate: '2026-09-16',
    registerNumber: 1,
    openedAt: new Date('2026-09-16T13:05:00.000Z'), // 08:05am Bogotá
    openedBy: { id: 'user-1' } as CashRegister['openedBy'],
    openingAmount: 50000,
    closedAt: null,
    closedBy: null,
    totalAmount: null,
    totalOwed: null,
    totalCash: null,
    totalCard: null,
    totalTransfer: null,
    expectedCash: null,
    countedCash: null,
    cashDiscrepancy: null,
    movements: [],
  };

  const invoiceWith = (
    totalAmount: number,
    paymentMeans: string,
  ): Partial<Invoice> => ({
    totalAmount,
    requestPayload: { invoice: { payment_means: paymentMeans } },
  });

  beforeEach(() => {
    invoiceQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sum: '150000' }),
      getMany: jest
        .fn()
        .mockResolvedValue([
          invoiceWith(100000, 'CASH'),
          invoiceWith(50000, 'BANK_TRANSFER'),
        ]),
    };
    quotationQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sum: '40000' }),
    };
    movementQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sum: '0' }),
    };
    cashRegisterRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn<Partial<CashRegister>, [Partial<CashRegister>]>(
        (entity) => entity,
      ),
      save: jest.fn<Promise<CashRegister>, [Partial<CashRegister>]>((entity) =>
        Promise.resolve({ ...openRegister, ...entity }),
      ),
      findAndCount: jest.fn(),
    };
    cashMovementRepository = {
      create: jest.fn<Partial<CashMovement>, [Partial<CashMovement>]>(
        (entity) => entity,
      ),
      save: jest.fn().mockResolvedValue({ id: 'move-1' }),
      createQueryBuilder: jest.fn(() => movementQueryBuilder),
    };
    invoicesRepository = {
      createQueryBuilder: jest.fn(() => invoiceQueryBuilder),
    };
    quotationsRepository = {
      createQueryBuilder: jest.fn(() => quotationQueryBuilder),
    };
    debitNotesRepository = { find: jest.fn().mockResolvedValue([]) };
    creditNotesRepository = { find: jest.fn().mockResolvedValue([]) };

    service = new CashRegisterService(
      cashRegisterRepository as unknown as Repository<CashRegister>,
      cashMovementRepository as unknown as Repository<CashMovement>,
      invoicesRepository as unknown as Repository<Invoice>,
      quotationsRepository as unknown as Repository<Quotation>,
      debitNotesRepository as unknown as Repository<DebitNote>,
      creditNotesRepository as unknown as Repository<CreditNote>,
    );

    jest.useFakeTimers().setSystemTime(new Date('2026-09-16T18:00:00.000Z')); // 1pm Bogotá
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('open', () => {
    it('creates a register for today with the given opening amount when none exists yet', async () => {
      cashRegisterRepository.findOne
        .mockResolvedValueOnce(null) // pre-check
        .mockResolvedValueOnce(openRegister); // findWithRelations

      await service.open('user-1', 1, 50000);

      expect(cashRegisterRepository.findOne).toHaveBeenCalledWith({
        where: { registerDate: '2026-09-16', registerNumber: 1 },
      });
      const created = cashRegisterRepository.create.mock.calls[0][0];
      expect(created.openingAmount).toBe(50000);
      expect(created.registerNumber).toBe(1);
      expect(cashRegisterRepository.save).toHaveBeenCalled();
    });

    it('opens Caja 2 on a day Caja 1 is already open — each till has its own register', async () => {
      // Only Caja 2's own register is looked up, so Caja 1's doesn't block it.
      cashRegisterRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...openRegister, registerNumber: 2 });

      const result = await service.open('user-2', 2, 80000);

      expect(cashRegisterRepository.findOne).toHaveBeenCalledWith({
        where: { registerDate: '2026-09-16', registerNumber: 2 },
      });
      expect(
        cashRegisterRepository.create.mock.calls[0][0].registerNumber,
      ).toBe(2);
      expect(result.registerNumber).toBe(2);
    });

    it('rejects with ConflictException when today is already open', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(openRegister);

      await expect(service.open('user-1', 1, 50000)).rejects.toThrow(
        ConflictException,
      );
      expect(cashRegisterRepository.save).not.toHaveBeenCalled();
    });

    it('maps a DB-level unique violation to ConflictException as a race-condition safety net', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(null);
      cashRegisterRepository.save.mockRejectedValueOnce(
        new QueryFailedError('INSERT INTO cash_registers ...', [], {
          code: '23505',
        } as unknown as Error),
      );

      await expect(service.open('user-1', 1, 50000)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('close', () => {
    it('rejects with NotFoundException when nothing was opened today', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.close('user-1', 1, 150000)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects with ConflictException when today is already closed', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce({
        ...openRegister,
        closedAt: new Date('2026-09-16T23:00:00.000Z'),
      });

      await expect(service.close('user-1', 1, 150000)).rejects.toThrow(
        ConflictException,
      );
    });

    it('auto-computes the collected/owed totals, the payment-method breakdown, expected cash and the discrepancy', async () => {
      cashRegisterRepository.findOne
        .mockResolvedValueOnce({ ...openRegister })
        .mockResolvedValueOnce({ ...openRegister, closedAt: new Date() });

      await service.close('user-1', 1, 149000);

      const saved = cashRegisterRepository.save.mock
        .calls[0][0] as CashRegister;
      expect(saved.totalAmount).toBe(150000);
      expect(saved.totalOwed).toBe(40000);
      // invoiceQueryBuilder.getMany() mock: 100000 CASH + 50000 BANK_TRANSFER
      expect(saved.totalCash).toBe(100000);
      expect(saved.totalCard).toBe(0);
      expect(saved.totalTransfer).toBe(50000);
      // openingAmount (50000) + totalCash (100000) + net movements (0)
      expect(saved.expectedCash).toBe(150000);
      expect(saved.countedCash).toBe(149000);
      expect(saved.cashDiscrepancy).toBe(-1000);
      expect(saved.closedAt).not.toBeNull();
      expect(saved.closedBy).toEqual({ id: 'user-1' });
    });

    it('nets cash movements into expectedCash — entradas add, salidas subtract', async () => {
      movementQueryBuilder.getRawOne.mockResolvedValue({ sum: '-20000' });
      cashRegisterRepository.findOne
        .mockResolvedValueOnce({ ...openRegister })
        .mockResolvedValueOnce({ ...openRegister, closedAt: new Date() });

      await service.close('user-1', 1, 130000);

      const saved = cashRegisterRepository.save.mock
        .calls[0][0] as CashRegister;
      // 50000 opening + 100000 cash sales - 20000 net movements
      expect(saved.expectedCash).toBe(130000);
      expect(saved.cashDiscrepancy).toBe(0);
    });

    it("includes the register's debit/credit notes in the response for visibility, without folding them into expectedCash", async () => {
      debitNotesRepository.find.mockResolvedValue([
        {
          id: 'debit-1',
          number: 3,
          prefix: 'NDE',
          totalAmount: 15000,
          createdAt: new Date('2026-09-16T20:00:00.000Z'),
          invoice: { number: 1225, prefix: 'FVE' },
        },
      ]);
      creditNotesRepository.find.mockResolvedValue([
        {
          id: 'credit-1',
          number: 1,
          prefix: 'NCE',
          totalAmount: 5000,
          createdAt: new Date('2026-09-16T21:00:00.000Z'),
          invoice: { number: 1226, prefix: 'FVE' },
        },
      ]);
      cashRegisterRepository.findOne
        .mockResolvedValueOnce({ ...openRegister })
        .mockResolvedValueOnce({ ...openRegister, closedAt: new Date() });

      const result = await service.close('user-1', 1, 150000);

      expect(result.notes).toEqual([
        expect.objectContaining({
          id: 'debit-1',
          type: 'debit',
          totalAmount: 15000,
        }),
        expect.objectContaining({
          id: 'credit-1',
          type: 'credit',
          totalAmount: 5000,
        }),
      ]);
      // Not part of the reconciliation math — see the comment on
      // CashRegister.totalCash.
      const saved = cashRegisterRepository.save.mock
        .calls[0][0] as CashRegister;
      expect(saved.expectedCash).toBe(150000);
    });

    it("adds up only what was made in that register — another till's sales the same day stay out", async () => {
      cashRegisterRepository.findOne
        .mockResolvedValueOnce({ ...openRegister })
        .mockResolvedValueOnce({ ...openRegister, closedAt: new Date() });

      await service.close('user-1', 1, 150000);

      const ownRegister = { cashRegisterId: 'reg-1' };
      expect(invoiceQueryBuilder.where).toHaveBeenCalledWith(
        'invoice.cash_register_id = :cashRegisterId',
        ownRegister,
      );
      expect(quotationQueryBuilder.where).toHaveBeenCalledWith(
        'quotation.cash_register_id = :cashRegisterId',
        ownRegister,
      );
      expect(movementQueryBuilder.where).toHaveBeenCalledWith(
        'movement.cash_register_id = :cashRegisterId',
        ownRegister,
      );
      const ownNotes = {
        where: { cashRegister: { id: 'reg-1' } },
        relations: ['invoice'],
      };
      expect(debitNotesRepository.find).toHaveBeenCalledWith(ownNotes);
      expect(creditNotesRepository.find).toHaveBeenCalledWith(ownNotes);
    });

    it('only counts quotations still open — excludes ones already invoiced or cancelled', async () => {
      cashRegisterRepository.findOne
        .mockResolvedValueOnce({ ...openRegister })
        .mockResolvedValueOnce({ ...openRegister, closedAt: new Date() });

      await service.close('user-1', 1, 150000);

      expect(quotationQueryBuilder.andWhere).toHaveBeenCalledWith(
        'quotation.invoicedAt IS NULL',
      );
      expect(quotationQueryBuilder.andWhere).toHaveBeenCalledWith(
        'quotation.cancelledAt IS NULL',
      );
    });
  });

  describe('closePast', () => {
    const past = { ...openRegister, id: 'reg-old', registerDate: '2026-09-10' };

    it('404s when the register does not exist', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.closePast('nope', 'user-1', [1, 2])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('409s when it is already closed', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce({
        ...past,
        closedAt: new Date('2026-09-10T23:00:00.000Z'),
      });

      await expect(
        service.closePast('reg-old', 'user-1', [1, 2]),
      ).rejects.toThrow(ConflictException);
    });

    it("refuses today's register — that one closes the normal way", async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce({ ...openRegister });

      await expect(
        service.closePast('reg-1', 'user-1', [1, 2]),
      ).rejects.toThrow(BadRequestException);
      expect(cashRegisterRepository.save).not.toHaveBeenCalled();
    });

    it("refuses a register of a till the caller doesn't work at", async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce({
        ...past,
        registerNumber: 2,
      });

      await expect(
        service.closePast('reg-old', 'user-1', [1], 149000),
      ).rejects.toThrow(ForbiddenException);
      expect(cashRegisterRepository.save).not.toHaveBeenCalled();
    });

    it("computes that register's totals and uses the given counted cash", async () => {
      cashRegisterRepository.findOne
        .mockResolvedValueOnce({ ...past })
        .mockResolvedValueOnce({ ...past, closedAt: new Date() });

      await service.closePast('reg-old', 'user-1', [1, 2], 149000);

      const saved = cashRegisterRepository.save.mock
        .calls[0][0] as CashRegister;
      expect(saved.totalAmount).toBe(150000);
      expect(saved.expectedCash).toBe(150000);
      expect(saved.countedCash).toBe(149000);
      expect(saved.cashDiscrepancy).toBe(-1000);
      expect(saved.closedBy).toEqual({ id: 'user-1' });
      // The queries were run for the old register, not for today's.
      expect(invoiceQueryBuilder.where).toHaveBeenCalledWith(
        expect.any(String),
        { cashRegisterId: 'reg-old' },
      );
    });

    it('takes the expected cash as counted when nothing was counted, so there is no discrepancy', async () => {
      cashRegisterRepository.findOne
        .mockResolvedValueOnce({ ...past })
        .mockResolvedValueOnce({ ...past, closedAt: new Date() });

      await service.closePast('reg-old', 'user-1', [1, 2]);

      const saved = cashRegisterRepository.save.mock
        .calls[0][0] as CashRegister;
      expect(saved.countedCash).toBe(150000);
      expect(saved.cashDiscrepancy).toBe(0);
    });
  });

  describe('reopen', () => {
    it("nulls closedAt/closedBy and every total close() had frozen on today's register", async () => {
      const closedToday: CashRegister = {
        ...openRegister,
        closedAt: new Date('2026-09-16T23:00:00.000Z'),
        closedBy: { id: 'user-1' } as CashRegister['closedBy'],
        totalAmount: 150000,
        totalOwed: 40000,
        totalCash: 100000,
        totalCard: 0,
        totalTransfer: 50000,
        expectedCash: 150000,
        countedCash: 149000,
        cashDiscrepancy: -1000,
      };
      cashRegisterRepository.findOne
        .mockResolvedValueOnce(closedToday)
        .mockResolvedValueOnce({ ...openRegister });

      await service.reopen(1);

      const saved = cashRegisterRepository.save.mock
        .calls[0][0] as CashRegister;
      expect(saved.closedAt).toBeNull();
      expect(saved.closedBy).toBeNull();
      expect(saved.totalAmount).toBeNull();
      expect(saved.totalOwed).toBeNull();
      expect(saved.totalCash).toBeNull();
      expect(saved.totalCard).toBeNull();
      expect(saved.totalTransfer).toBeNull();
      expect(saved.expectedCash).toBeNull();
      expect(saved.countedCash).toBeNull();
      expect(saved.cashDiscrepancy).toBeNull();
      // Untouched — a reopen never re-derives the original open.
      expect(saved.openedAt).toEqual(closedToday.openedAt);
      expect(saved.openingAmount).toBe(closedToday.openingAmount);
    });

    it('rejects with NotFoundException when nothing was opened today', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.reopen(1)).rejects.toThrow(NotFoundException);
      expect(cashRegisterRepository.save).not.toHaveBeenCalled();
    });

    it('rejects with ConflictException when today is still open', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce({ ...openRegister });

      await expect(service.reopen(1)).rejects.toThrow(ConflictException);
      expect(cashRegisterRepository.save).not.toHaveBeenCalled();
    });

    it("looks up the given till's register, not another one closed the same day", async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.reopen(2)).rejects.toThrow(NotFoundException);
      expect(cashRegisterRepository.findOne).toHaveBeenCalledWith({
        where: { registerDate: '2026-09-16', registerNumber: 2 },
      });
    });
  });

  describe('updateCountedCash', () => {
    it('recomputes the discrepancy from the stored expectedCash on a closed register', async () => {
      cashRegisterRepository.findOne
        .mockResolvedValueOnce({
          ...openRegister,
          closedAt: new Date(),
          expectedCash: 150000,
          countedCash: 149000,
          cashDiscrepancy: -1000,
        })
        .mockResolvedValueOnce({ ...openRegister, closedAt: new Date() });

      await service.updateCountedCash('reg-1', 150000, [1, 2]);

      const saved = cashRegisterRepository.save.mock
        .calls[0][0] as CashRegister;
      expect(saved.countedCash).toBe(150000);
      expect(saved.cashDiscrepancy).toBe(0);
    });

    it('rejects with NotFoundException when the register does not exist', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateCountedCash('missing', 100, [1, 2]),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects with BadRequestException when the register is still open', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce({
        ...openRegister,
      });

      await expect(
        service.updateCountedCash('reg-1', 100, [1, 2]),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuses a register of a till the caller doesn't work at", async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce({
        ...openRegister,
        closedAt: new Date(),
        expectedCash: 150000,
      });

      await expect(
        service.updateCountedCash('reg-1', 100, [2]),
      ).rejects.toThrow(ForbiddenException);
      expect(cashRegisterRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('addMovement', () => {
    it("creates a cash movement against that till's open register", async () => {
      cashRegisterRepository.findOne
        .mockResolvedValueOnce({ ...openRegister })
        .mockResolvedValueOnce({ ...openRegister });

      await service.addMovement(
        { amount: -30000, reason: 'Pago a proveedor' },
        'user-1',
        1,
      );

      const created = cashMovementRepository.create.mock.calls[0][0];
      expect(created.amount).toBe(-30000);
      expect(created.reason).toBe('Pago a proveedor');
      expect(created.cashRegister).toEqual({ id: 'reg-1' });
      expect(cashMovementRepository.save).toHaveBeenCalled();
    });

    it('rejects with BadRequestException when there is no open register today', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.addMovement({ amount: 10000, reason: 'Cambio' }, 'user-1', 1),
      ).rejects.toThrow(BadRequestException);
      expect(cashMovementRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('assertOpenToday', () => {
    it('returns the open register so the caller can tie its document to it', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(openRegister);

      await expect(service.assertOpenToday(1)).resolves.toBe(openRegister);
    });

    it("throws when only another till is open — Caja 1 being open doesn't cover Caja 2", async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.assertOpenToday(2)).rejects.toThrow(
        'La Caja 2 no está abierta hoy',
      );
      expect(cashRegisterRepository.findOne).toHaveBeenCalledWith({
        where: { registerDate: '2026-09-16', registerNumber: 2 },
      });
    });

    it('throws BadRequestException when nothing is open today', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.assertOpenToday(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when today is already closed', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce({
        ...openRegister,
        closedAt: new Date(),
      });

      await expect(service.assertOpenToday(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('treats "today" as the Bogotá calendar day even late at night UTC', async () => {
      // 11:30pm Bogotá on Sep 16 is already 04:30am UTC on Sep 17 — a naive
      // server-local/UTC "today" would look up the wrong date.
      jest.setSystemTime(new Date('2026-09-17T04:30:00.000Z'));
      cashRegisterRepository.findOne.mockResolvedValueOnce(openRegister);

      await service.assertOpenToday(1);

      expect(cashRegisterRepository.findOne).toHaveBeenCalledWith({
        where: { registerDate: '2026-09-16', registerNumber: 1 },
      });
    });
  });

  describe('getDayInvoicesReport', () => {
    it('404s for an unknown register', async () => {
      cashRegisterRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getDayInvoicesReport('nope', [1, 2]),
      ).rejects.toThrow(NotFoundException);
    });

    it("refuses a register of a till the caller doesn't work at", async () => {
      cashRegisterRepository.findOne.mockResolvedValue({
        ...openRegister,
        registerNumber: 2,
      });

      await expect(service.getDayInvoicesReport('reg-1', [1])).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("reports the register's own invoices, matched the same way the closing totals are", async () => {
      cashRegisterRepository.findOne.mockResolvedValue({
        ...openRegister,
        registerDate: '2026-09-18',
      });
      invoiceQueryBuilder.getMany.mockResolvedValue([
        {
          ...invoiceWith(119000, 'CASH'),
          number: 5,
          prefix: 'FEE',
          dataicoNumber: 'FEE5',
        },
      ]);

      const report = await service.getDayInvoicesReport('reg-1', [1, 2]);

      expect(report.registerDate).toBe('2026-09-18');
      expect(report.invoices).toEqual([
        { number: 'FEE5', total: 119000, paymentMeans: 'CASH' },
      ]);
      expect(invoiceQueryBuilder.where).toHaveBeenLastCalledWith(
        'invoice.cash_register_id = :cashRegisterId',
        { cashRegisterId: 'reg-1' },
      );
      expect(invoiceQueryBuilder.orderBy).toHaveBeenCalledWith(
        'invoice.createdAt',
        'ASC',
      );
      expect(invoiceQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'invoice.number',
        'ASC',
      );
    });
  });

  describe('getTodayStatus', () => {
    it('returns isOpen: false with nulls and the previous closing cash as a placeholder when nothing was opened today', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(null);
      cashRegisterRepository.findOne.mockResolvedValueOnce({
        ...openRegister,
        closedAt: new Date(),
        countedCash: 149000,
      });

      const status = await service.getTodayStatus(2);

      expect(status).toEqual({
        isOpen: false,
        register: null,
        totalSoFar: null,
        totalOwedSoFar: null,
        expectedCashSoFar: null,
        previousClosingCash: 149000,
      });
      // Both lookups stay within Caja 2 — the placeholder is what was left
      // in *that* drawer, not in the other one.
      const lookups = cashRegisterRepository.findOne.mock.calls as [
        { where: { registerNumber: number } },
      ][];
      expect(lookups.map(([options]) => options.where.registerNumber)).toEqual([
        2, 2,
      ]);
    });

    it('returns live totalSoFar/totalOwedSoFar/expectedCashSoFar previews while open, without persisting them', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce(openRegister);

      const status = await service.getTodayStatus(1);

      expect(status.isOpen).toBe(true);
      expect(status.totalSoFar).toBe(150000);
      expect(status.totalOwedSoFar).toBe(40000);
      // 50000 opening + 100000 cash sales + 0 net movements
      expect(status.expectedCashSoFar).toBe(150000);
      expect(status.previousClosingCash).toBeNull();
      expect(cashRegisterRepository.save).not.toHaveBeenCalled();
    });

    it('returns totalSoFar/totalOwedSoFar/expectedCashSoFar: null once closed', async () => {
      cashRegisterRepository.findOne.mockResolvedValueOnce({
        ...openRegister,
        closedAt: new Date(),
        totalAmount: 150000,
        totalOwed: 40000,
      });

      const status = await service.getTodayStatus(1);

      expect(status.isOpen).toBe(false);
      expect(status.totalSoFar).toBeNull();
      expect(status.totalOwedSoFar).toBeNull();
      expect(status.expectedCashSoFar).toBeNull();
    });
  });

  describe('getTodayStoreSummary', () => {
    it('adds up every till of today while at least one is open', async () => {
      cashRegisterRepository.find.mockResolvedValue([
        { ...openRegister, closedAt: new Date() },
        { ...openRegister, id: 'reg-2', registerNumber: 2 },
      ]);

      const summary = await service.getTodayStoreSummary();

      expect(cashRegisterRepository.find).toHaveBeenCalledWith({
        where: { registerDate: '2026-09-16' },
      });
      // The mocked sums (150000 collected, 40000 owed) once per till.
      expect(summary).toEqual({
        isOpen: true,
        totalSoFar: 300000,
        totalOwedSoFar: 80000,
        // Each till on its own too — the closed one keeps its figures.
        registers: [
          { registerNumber: 1, isOpen: false, collected: 150000, owed: 40000 },
          { registerNumber: 2, isOpen: true, collected: 150000, owed: 40000 },
        ],
      });
    });

    it('lists a till that was not opened today with no figures', async () => {
      cashRegisterRepository.find.mockResolvedValue([{ ...openRegister }]);

      const summary = await service.getTodayStoreSummary();

      expect(summary.totalSoFar).toBe(150000);
      expect(summary.registers[1]).toEqual({
        registerNumber: 2,
        isOpen: false,
        collected: null,
        owed: null,
      });
    });

    it('reports closed, with no totals, when every till of today is closed', async () => {
      cashRegisterRepository.find.mockResolvedValue([
        { ...openRegister, closedAt: new Date() },
      ]);

      await expect(service.getTodayStoreSummary()).resolves.toMatchObject({
        isOpen: false,
        totalSoFar: null,
        totalOwedSoFar: null,
      });
    });

    it('reports closed when no till was opened today', async () => {
      cashRegisterRepository.find.mockResolvedValue([]);

      const summary = await service.getTodayStoreSummary();

      expect(summary.isOpen).toBe(false);
    });
  });

  describe('findAll', () => {
    it("lists only the caller's tills, newest day first", async () => {
      cashRegisterRepository.findAndCount.mockResolvedValue([
        [{ ...openRegister, registerNumber: 2 }],
        1,
      ]);

      const result = await service.findAll({ page: 1, limit: 20 }, [2]);

      const options = cashRegisterRepository.findAndCount.mock.calls[0] as [
        { where: unknown; order: unknown },
      ];
      expect(options[0].where).toEqual({ registerNumber: In([2]) });
      expect(options[0].order).toEqual({
        registerDate: 'DESC',
        registerNumber: 'ASC',
      });
      expect(result.data[0].registerNumber).toBe(2);
      expect(result.meta.total).toBe(1);
    });
  });
});
