import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { QuotationPayment } from '../quotations/entities/quotation-payment.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { PortfolioService } from './portfolio.service';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let quotationsBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    getMany: jest.Mock;
  };
  let paymentsBuilder: {
    select: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    groupBy: jest.Mock;
    getRawMany: jest.Mock;
  };
  let quotationsRepository: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let paymentsRepository: {
    createQueryBuilder: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let transactionManager: {
    query: jest.Mock;
    findOne: jest.Mock;
    getRepository: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  function quotation(overrides: Partial<Quotation> = {}): Quotation {
    return {
      id: 'q-1',
      number: 1,
      customerIdentificationType: 'CC',
      customerIdentification: '1085000111',
      customerCompanyName: null,
      customerFirstName: 'JAVIER',
      customerFamilyName: 'CANTUCA',
      customerPhone: '3001234567',
      totalAmount: 100000,
      invoicedAt: null,
      completedAt: null,
      cancelledAt: null,
      mergedAt: null,
      createdAt: new Date('2026-10-01T15:00:00.000Z'),
      updatedAt: new Date('2026-10-05T15:00:00.000Z'),
      ...overrides,
    } as Quotation;
  }

  function payment(
    overrides: Partial<QuotationPayment> = {},
  ): QuotationPayment {
    return {
      id: 'pay-1',
      quotation: quotation(),
      amount: 30000,
      paymentMeans: 'CASH',
      notes: null,
      voidedAt: null,
      voidedBy: null,
      createdBy: { firstName: 'Ana', lastName: 'Ruiz' },
      createdAt: new Date('2026-10-10T15:00:00.000Z'),
      ...overrides,
    } as QuotationPayment;
  }

  /** Abonos already paid, as sumPaidByQuotation() reads them. */
  function paidSoFar(rows: Array<{ quotationId: string; paid: string }>) {
    paymentsBuilder.getRawMany.mockResolvedValueOnce(rows);
  }

  beforeEach(() => {
    quotationsBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    paymentsBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    paymentsRepository = {
      createQueryBuilder: jest.fn(() => paymentsBuilder),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(payment()),
    };
    transactionManager = {
      query: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(quotation()),
      getRepository: jest.fn(() => paymentsRepository),
      create: jest.fn((_entity: unknown, values: object) => values),
      save: jest.fn((_entity: unknown, values: object) =>
        Promise.resolve({ id: 'pay-new', ...values }),
      ),
      update: jest.fn().mockResolvedValue(undefined),
    };
    quotationsRepository = {
      createQueryBuilder: jest.fn(() => quotationsBuilder),
      findOne: jest.fn().mockResolvedValue(null),
      manager: {
        transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
          work(transactionManager),
        ),
      },
    };

    service = new PortfolioService(
      quotationsRepository as unknown as Repository<Quotation>,
      paymentsRepository as unknown as Repository<QuotationPayment>,
    );
  });

  describe('getSummary', () => {
    it('groups open quotations by customer, net of abonos, biggest balance first', async () => {
      // Newest first, as the query orders them.
      quotationsBuilder.getMany.mockResolvedValueOnce([
        quotation({
          id: 'q-3',
          number: 3,
          customerFirstName: 'JAVIER JOSÉ',
          totalAmount: 50000,
          createdAt: new Date('2026-10-20T15:00:00.000Z'),
          updatedAt: new Date('2026-10-21T15:00:00.000Z'),
        }),
        quotation({
          id: 'q-2',
          number: 2,
          customerIdentificationType: 'NIT',
          customerIdentification: '900123456',
          customerCompanyName: 'TALLER NORTE S.A.S',
          customerFirstName: null,
          customerFamilyName: null,
          totalAmount: 400000,
        }),
        quotation({ id: 'q-1', number: 1, totalAmount: 100000 }),
      ]);
      paidSoFar([
        { quotationId: 'q-1', paid: '30000' },
        { quotationId: 'q-2', paid: '100000' },
      ]);

      const summary = await service.getSummary({});

      expect(summary.totals).toEqual({
        totalAmount: 550000,
        paidAmount: 130000,
        balance: 420000,
        quotationCount: 3,
      });
      expect(summary.customers).toEqual([
        {
          identificationType: 'NIT',
          identification: '900123456',
          name: 'TALLER NORTE S.A.S',
          phone: '3001234567',
          totals: {
            totalAmount: 400000,
            paidAmount: 100000,
            balance: 300000,
            quotationCount: 1,
          },
          oldestCreatedAt: '2026-10-01T15:00:00.000Z',
          lastChangedAt: '2026-10-05T15:00:00.000Z',
        },
        {
          identificationType: 'CC',
          identification: '1085000111',
          // Named after the most recent quotation.
          name: 'JAVIER JOSÉ CANTUCA',
          phone: '3001234567',
          totals: {
            totalAmount: 150000,
            paidAmount: 30000,
            balance: 120000,
            quotationCount: 2,
          },
          oldestCreatedAt: '2026-10-01T15:00:00.000Z',
          lastChangedAt: '2026-10-21T15:00:00.000Z',
        },
      ]);
    });

    it('only reads open quotations', async () => {
      await service.getSummary({});

      expect(quotationsBuilder.where).toHaveBeenCalledWith(
        'quotation.invoicedAt IS NULL AND quotation.completedAt IS NULL AND quotation.cancelledAt IS NULL AND quotation.mergedAt IS NULL',
      );
    });

    it('returns zeros and no customers when nothing is owed', async () => {
      const summary = await service.getSummary({});

      expect(summary).toEqual({
        totals: {
          totalAmount: 0,
          paidAmount: 0,
          balance: 0,
          quotationCount: 0,
        },
        customers: [],
      });
      // No quotation ids, so no abono query at all.
      expect(paymentsRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('widens the date range to whole Bogotá days', async () => {
      await service.getSummary({ from: '2026-01-01', to: '2026-10-31' });

      expect(quotationsBuilder.andWhere).toHaveBeenCalledWith(
        'quotation.createdAt >= :from',
        { from: new Date('2026-01-01T05:00:00.000Z') },
      );
      expect(quotationsBuilder.andWhere).toHaveBeenCalledWith(
        'quotation.createdAt < :to',
        { to: new Date('2026-11-01T05:00:00.000Z') },
      );
    });

    it('accepts a single-day range', async () => {
      await expect(
        service.getSummary({ from: '2026-10-01', to: '2026-10-01' }),
      ).resolves.toBeDefined();
    });

    it('rejects a range whose start is after its end', async () => {
      await expect(
        service.getSummary({ from: '2026-10-31', to: '2026-01-01' }),
      ).rejects.toThrow(BadRequestException);
      expect(quotationsBuilder.getMany).not.toHaveBeenCalled();
    });

    it('matches digits against the identification prefix', async () => {
      await service.getSummary({ search: ' 1085 ' });

      expect(quotationsBuilder.andWhere).toHaveBeenCalledWith(
        'quotation.customerIdentification LIKE :idPrefix',
        { idPrefix: '1085%' },
      );
    });

    it('filters empresas (NIT) and empleados (anything else)', async () => {
      await service.getSummary({ customerType: 'empresa' });
      expect(quotationsBuilder.andWhere).toHaveBeenCalledWith(
        "quotation.customerIdentificationType = 'NIT'",
      );

      await service.getSummary({ customerType: 'empleado' });
      expect(quotationsBuilder.andWhere).toHaveBeenCalledWith(
        "quotation.customerIdentificationType <> 'NIT'",
      );
    });
  });

  describe('getCustomer', () => {
    it('lists each open quotation oldest first with its abonos; voided ones listed but not counted', async () => {
      const older = quotation({ id: 'q-1', number: 1, totalAmount: 100000 });
      const newer = quotation({
        id: 'q-4',
        number: 4,
        totalAmount: 60000,
        createdAt: new Date('2026-10-15T15:00:00.000Z'),
      });
      quotationsBuilder.getMany.mockResolvedValueOnce([newer, older]);
      paymentsRepository.find.mockResolvedValueOnce([
        payment({ id: 'pay-1', quotation: older, amount: 30000 }),
        payment({
          id: 'pay-2',
          quotation: older,
          amount: 20000,
          voidedAt: new Date('2026-10-11T15:00:00.000Z'),
          voidedBy: { firstName: 'Admin', lastName: '' } as never,
        }),
      ]);

      const result = await service.getCustomer('1085000111', {});

      expect(quotationsBuilder.andWhere).toHaveBeenCalledWith(
        'quotation.customerIdentification = :identification',
        { identification: '1085000111' },
      );
      expect(result.customer).toEqual({
        identificationType: 'CC',
        identification: '1085000111',
        name: 'JAVIER CANTUCA',
        phone: '3001234567',
      });
      expect(result.totals).toEqual({
        totalAmount: 160000,
        paidAmount: 30000,
        balance: 130000,
        quotationCount: 2,
      });
      expect(result.quotations.map((q) => q.number)).toEqual([1, 4]);
      expect(result.quotations[0]).toMatchObject({
        totalAmount: 100000,
        paidAmount: 30000,
        balance: 70000,
      });
      expect(result.quotations[0].payments).toEqual([
        expect.objectContaining({
          id: 'pay-1',
          createdByName: 'Ana Ruiz',
          voidedAt: null,
        }),
        expect.objectContaining({
          id: 'pay-2',
          voidedAt: '2026-10-11T15:00:00.000Z',
          voidedByName: 'Admin',
        }),
      ]);
      expect(result.quotations[1]).toMatchObject({
        paidAmount: 0,
        balance: 60000,
        payments: [],
      });
    });

    it('still names a customer with nothing pending in range', async () => {
      quotationsRepository.findOne.mockResolvedValueOnce(
        quotation({ invoicedAt: new Date() }),
      );

      const result = await service.getCustomer('1085000111', {
        from: '2026-11-01',
      });

      expect(result.customer.name).toBe('JAVIER CANTUCA');
      expect(result.quotations).toEqual([]);
      expect(result.totals.balance).toBe(0);
      expect(paymentsRepository.find).not.toHaveBeenCalled();
    });

    it('answers 404 for someone who never had a quotation', async () => {
      await expect(service.getCustomer('999', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createPayment', () => {
    const dto = { amount: 30000, paymentMeans: 'CASH' as const };

    it('reads the quotation while holding its own lock', async () => {
      transactionManager.findOne.mockImplementationOnce(() => {
        expect(transactionManager.query).toHaveBeenCalledWith(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          ['quotation:q-1'],
        );
        return Promise.resolve(quotation());
      });

      await service.createPayment('q-1', dto, 'user-1');
    });

    it('records a partial abono and leaves the quotation open', async () => {
      paidSoFar([{ quotationId: 'q-1', paid: '20000' }]);

      const result = await service.createPayment(
        'q-1',
        { ...dto, notes: 'El resto el viernes' },
        'user-1',
      );

      expect(transactionManager.save).toHaveBeenCalledWith(QuotationPayment, {
        quotation: { id: 'q-1' },
        amount: 30000,
        paymentMeans: 'CASH',
        notes: 'El resto el viernes',
        voidedAt: null,
        voidedBy: null,
        createdBy: { id: 'user-1' },
      });
      expect(transactionManager.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        paymentId: 'pay-new',
        quotationId: 'q-1',
        balance: 50000,
        quotationCompleted: false,
      });
    });

    it('completes the quotation when the abono pays exactly the balance', async () => {
      paidSoFar([{ quotationId: 'q-1', paid: '70000' }]);

      const result = await service.createPayment('q-1', dto, 'user-1');

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(transactionManager.update).toHaveBeenCalledWith(Quotation, 'q-1', {
        completedAt: expect.any(Date),
        updatedBy: { id: 'user-1' },
      });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      expect(result).toMatchObject({ balance: 0, quotationCompleted: true });
    });

    it('compares in centavos, so a decimal balance can be paid off exactly', async () => {
      transactionManager.findOne.mockResolvedValueOnce(
        quotation({ totalAmount: 0.3 }),
      );
      paidSoFar([{ quotationId: 'q-1', paid: '0.1' }]);

      const result = await service.createPayment(
        'q-1',
        { amount: 0.2, paymentMeans: 'CARD' },
        'user-1',
      );

      expect(result.quotationCompleted).toBe(true);
    });

    it('rejects an abono over the balance, saving nothing', async () => {
      paidSoFar([{ quotationId: 'q-1', paid: '80000' }]);

      await expect(service.createPayment('q-1', dto, 'user-1')).rejects.toThrow(
        'supera el saldo pendiente',
      );
      expect(transactionManager.save).not.toHaveBeenCalled();
    });

    it.each([
      ['invoiced', { invoicedAt: new Date() }],
      ['completed', { completedAt: new Date() }],
      ['cancelled', { cancelledAt: new Date() }],
      ['merged', { mergedAt: new Date() }],
    ])('rejects an abono on a %s quotation', async (_label, closed) => {
      transactionManager.findOne.mockResolvedValueOnce(quotation(closed));

      await expect(service.createPayment('q-1', dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(transactionManager.save).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown quotation', async () => {
      transactionManager.findOne.mockResolvedValueOnce(null);

      await expect(service.createPayment('q-x', dto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('voidPayment', () => {
    function lockedPayment(overrides: Partial<QuotationPayment> = {}) {
      transactionManager.findOne.mockResolvedValueOnce(payment(overrides));
    }

    it('voids an abono on an open quotation, keeping it in the history', async () => {
      lockedPayment();

      const result = await service.voidPayment('pay-1', 'admin-1');

      expect(transactionManager.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        ['quotation:q-1'],
      );
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(transactionManager.update).toHaveBeenCalledWith(
        QuotationPayment,
        'pay-1',
        { voidedAt: expect.any(Date), voidedBy: { id: 'admin-1' } },
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      expect(transactionManager.update).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ quotationId: 'q-1', quotationReopened: false });
    });

    it('reopens a quotation its abonos had completed, without restarting its last-change date', async () => {
      const updatedAt = new Date('2026-10-05T15:00:00.000Z');
      lockedPayment({
        quotation: quotation({ completedAt: new Date(), updatedAt }),
      });
      paidSoFar([{ quotationId: 'q-1', paid: '100000' }]);

      const result = await service.voidPayment('pay-1', 'admin-1');

      expect(transactionManager.update).toHaveBeenCalledWith(Quotation, 'q-1', {
        completedAt: null,
        updatedBy: { id: 'admin-1' },
        updatedAt,
      });
      expect(result.quotationReopened).toBe(true);
    });

    it('refuses when the quotation was completed by hand with a balance left', async () => {
      lockedPayment({ quotation: quotation({ completedAt: new Date() }) });
      paidSoFar([{ quotationId: 'q-1', paid: '30000' }]);

      await expect(service.voidPayment('pay-1', 'admin-1')).rejects.toThrow(
        'completada a mano',
      );
      expect(transactionManager.update).not.toHaveBeenCalled();
    });

    it.each([
      ['invoiced', { invoicedAt: new Date() }],
      ['cancelled', { cancelledAt: new Date() }],
      ['merged', { mergedAt: new Date() }],
    ])('refuses once the quotation was %s', async (_label, closed) => {
      lockedPayment({ quotation: quotation(closed) });

      await expect(service.voidPayment('pay-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(transactionManager.update).not.toHaveBeenCalled();
    });

    it('refuses an abono that was already voided', async () => {
      lockedPayment({ voidedAt: new Date() });

      await expect(service.voidPayment('pay-1', 'admin-1')).rejects.toThrow(
        'ya fue anulado',
      );
    });

    it('answers 409 when a merge moved the abono to another quotation meanwhile', async () => {
      lockedPayment({ quotation: quotation({ id: 'q-9' }) });

      await expect(service.voidPayment('pay-1', 'admin-1')).rejects.toThrow(
        ConflictException,
      );
      expect(transactionManager.update).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown abono', async () => {
      paymentsRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.voidPayment('pay-x', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
