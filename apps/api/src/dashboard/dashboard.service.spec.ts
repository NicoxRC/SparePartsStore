import { Repository } from 'typeorm';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { Invoice } from '../invoicing/invoices/entities/invoice.entity';
import { Product } from '../products/entities/product.entity';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let invoicesRepository: { createQueryBuilder: jest.Mock };
  let productsRepository: {
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let cashRegisterService: { getTodayStoreSummary: jest.Mock };
  let invoiceQueryBuilder: {
    select: jest.Mock;
    where: jest.Mock;
    getRawOne: jest.Mock;
  };
  let productQueryBuilder: { select: jest.Mock; getRawOne: jest.Mock };

  beforeEach(() => {
    invoiceQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sum: '100000' }),
    };
    productQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ value: '5000000' }),
    };
    invoicesRepository = {
      createQueryBuilder: jest.fn(() => invoiceQueryBuilder),
    };
    productsRepository = {
      count: jest.fn().mockResolvedValue(42),
      createQueryBuilder: jest.fn(() => productQueryBuilder),
    };
    cashRegisterService = {
      getTodayStoreSummary: jest.fn().mockResolvedValue({
        isOpen: true,
        totalSoFar: 300000,
        totalOwedSoFar: 50000,
        registers: [
          { registerNumber: 1, isOpen: true, collected: 200000, owed: 50000 },
          { registerNumber: 2, isOpen: false, collected: 100000, owed: 0 },
        ],
      }),
    };

    service = new DashboardService(
      invoicesRepository as unknown as Repository<Invoice>,
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

  it('breaks today down till by till', async () => {
    const summary = await service.getSummary();

    expect(summary.cashRegisters).toEqual([
      { registerNumber: 1, isOpen: true, recaudado: 200000, adeudado: 50000 },
      { registerNumber: 2, isOpen: false, recaudado: 100000, adeudado: 0 },
    ]);
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

  it('reports product totals and the out-of-stock count (stock = 0, no invented threshold)', async () => {
    const summary = await service.getSummary();

    expect(summary.totalProducts).toBe(42);
    expect(summary.outOfStockCount).toBe(42);
    expect(productsRepository.count).toHaveBeenCalledWith({
      where: { stock: 0 },
    });
  });
});
