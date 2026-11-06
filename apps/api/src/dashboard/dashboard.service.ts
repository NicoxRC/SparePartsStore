import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashRegisterService } from '../cash-register/cash-register.service';
import {
  getStoreDayRangeUtc,
  getStoreToday,
} from '../common/utils/store-date.util';
import { Invoice } from '../invoicing/invoices/entities/invoice.entity';
import { Product } from '../products/entities/product.entity';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

const SALES_TREND_DAYS = 7;

@Injectable()
export class DashboardService {
  constructor(
    // Reads Invoice/Product directly, same narrow exception
    // CashRegisterService already documents for daily aggregates — this
    // module has no business logic of its own to protect, just read-only
    // rollups across other domains.
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly cashRegisterService: CashRegisterService,
  ) {}

  async getSummary(): Promise<DashboardSummaryDto> {
    const [todayStatus, salesLast7Days, productStats] = await Promise.all([
      this.cashRegisterService.getTodayStoreSummary(),
      this.computeSalesLast7Days(),
      this.computeProductStats(),
    ]);

    return {
      cashRegisterOpen: todayStatus.isOpen,
      todayRecaudado: todayStatus.totalSoFar,
      todayAdeudado: todayStatus.totalOwedSoFar,
      cashRegisters: todayStatus.registers.map((register) => ({
        registerNumber: register.registerNumber,
        isOpen: register.isOpen,
        recaudado: register.collected,
        adeudado: register.owed,
      })),
      salesLast7Days,
      totalProducts: productStats.totalProducts,
      outOfStockCount: productStats.outOfStockCount,
    };
  }

  /** One query per day rather than a single grouped one — matches how
   * CashRegisterService already computes daily totals, and at this
   * store's volume 7 small queries cost nothing worth optimizing for. */
  private async computeSalesLast7Days(): Promise<
    DashboardSummaryDto['salesLast7Days']
  > {
    const today = getStoreToday();
    const days: string[] = [];
    for (let i = SALES_TREND_DAYS - 1; i >= 0; i--) {
      const date = new Date(`${today}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() - i);
      days.push(date.toISOString().slice(0, 10));
    }

    return Promise.all(
      days.map(async (date) => ({
        date,
        total: await this.computeDayTotal(date),
      })),
    );
  }

  private async computeDayTotal(storeDate: string): Promise<number> {
    const { start, end } = getStoreDayRangeUtc(storeDate);
    const result = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.totalAmount), 0)', 'sum')
      .where('invoice.createdAt >= :start AND invoice.createdAt < :end', {
        start,
        end,
      })
      .getRawOne<{ sum: string }>();
    return Number(result?.sum ?? 0);
  }

  /** No confirmed "minimum stock" concept exists yet (see docs/GLOSSARY.md)
   * — "low stock" here deliberately means only `stock = 0` ("agotado"),
   * not an invented threshold. */
  private async computeProductStats(): Promise<{
    totalProducts: number;
    outOfStockCount: number;
  }> {
    const [totalProducts, outOfStockCount] = await Promise.all([
      this.productsRepository.count(),
      this.productsRepository.count({ where: { stock: 0 } }),
    ]);

    return { totalProducts, outOfStockCount };
  }
}
