import { Repository } from 'typeorm';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { Invoice } from '../invoicing/invoices/entities/invoice.entity';
import { Product } from '../products/entities/product.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let invoicesRepository: { createQueryBuilder: jest.Mock };
  let quotationsRepository: { createQueryBuilder: jest.Mock };
  let productsRepository: {
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
    find: jest.Mock;
  };
  let cashRegisterService: { getTodayStatus: jest.Mock };
  let invoiceQueryBuilder: {
    select: jest.Mock;
    where: jest.Mock;
    getRawOne: jest.Mock;
  };
  let quotationQueryBuilder: {
    select: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getRawOne: jest.Mock;
  };
  let productQueryBuilder: { select: jest.Mock; getRawOne: jest.Mock };

  beforeEach(() => {
    invoiceQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sum: '100000' }),
    };
    quotationQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sum: '250000', count: '3' }),
    };
    productQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ value: '5000000' }),
    };
    invoicesRepository = {
      createQueryBuilder: jest.fn(() => invoiceQueryBuilder),
    };
    quotationsRepository = {
      createQueryBuilder: jest.fn(() => quotationQueryBuilder),
    };
    productsRepository = {
      count: jest.fn().mockResolvedValue(42),
      createQueryBuilder: jest.fn(() => productQueryBuilder),
      find: jest
        .fn()
        .mockResolvedValue([
          { id: 'p1', reference: 'REP-001', description: 'Filtro', stock: 0 },
        ]),
    };
    cashRegisterService = {
      getTodayStatus: jest.fn().mockResolvedValue({
        isOpen: true,
        register: null,
        totalSoFar: 300000,
        totalOwedSoFar: 50000,
        expectedCashSoFar: 150000,
        previousClosingCash: null,
      }),
    };

    service = new DashboardService(
      invoicesRepository as unknown as Repository<Invoice>,
      quotationsRepository as unknown as Repository<Quotation>,
      productsRepository as unknown as Repository<Product>,
      cashRegisterService as unknown as CashRegisterService,
    );

    jest.useFakeTimers().setSystemTime(new Date('2026-09-17T18:00:00.000Z')); // 1pm Bogotá
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("reflects today's caja status straight from CashRegisterService", async () => {
    const summary = await service.getSummary();

    expect(summary.cashRegisterOpen).toBe(true);
    expect(summary.todayRecaudado).toBe(300000);
    expect(summary.todayAdeudado).toBe(50000);
  });

  it('returns 7 days of sales, oldest first, today included', async () => {
    const summary = await service.getSummary();

    expect(summary.salesLast7Days).toHaveLength(7);
    expect(summary.salesLast7Days[6].date).toBe('2026-09-17');
    expect(summary.salesLast7Days[0].date).toBe('2026-09-11');
    expect(summary.salesLast7Days.every((day) => day.total === 100000)).toBe(
      true,
    );
  });

  it("sums every currently open quotation, not just today's", async () => {
    const summary = await service.getSummary();

    expect(quotationQueryBuilder.where).toHaveBeenCalledWith(
      'quotation.invoicedAt IS NULL',
    );
    expect(quotationQueryBuilder.andWhere).toHaveBeenCalledWith(
      'quotation.cancelledAt IS NULL',
    );
    // No date filter — unlike CashRegisterService's today-scoped "adeudado".
    expect(quotationQueryBuilder.where).not.toHaveBeenCalledWith(
      expect.stringContaining('createdAt'),
      expect.anything(),
    );
    expect(summary.openQuotationsTotal).toBe(250000);
    expect(summary.openQuotationsCount).toBe(3);
  });

  it('reports product totals and out-of-stock products (stock = 0, no invented threshold)', async () => {
    const summary = await service.getSummary();

    expect(summary.totalProducts).toBe(42);
    expect(summary.totalInventoryValue).toBe(5000000);
    expect(productsRepository.count).toHaveBeenCalledWith({
      where: { stock: 0 },
    });
    expect(summary.outOfStockProducts).toEqual([
      { id: 'p1', reference: 'REP-001', description: 'Filtro', stock: 0 },
    ]);
  });
});
