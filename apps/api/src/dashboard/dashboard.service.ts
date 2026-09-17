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
import { Quotation } from '../quotations/entities/quotation.entity';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

const OUT_OF_STOCK_PREVIEW_LIMIT = 10;
const SALES_TREND_DAYS = 7;

@Injectable()
export class DashboardService {
  constructor(
    // Reads Invoice/Quotation/Product directly, same narrow exception
    // CashRegisterService already documents for daily aggregates — this
    // module has no business logic of its own to protect, just read-only
    // rollups across other domains.
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(Quotation)
    private readonly quotationsRepository: Repository<Quotation>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly cashRegisterService: CashRegisterService,
  ) {}

  async getSummary(): Promise<DashboardSummaryDto> {
    const [todayStatus, salesLast7Days, openQuotations, productStats] =
      await Promise.all([
        this.cashRegisterService.getTodayStatus(),
        this.computeSalesLast7Days(),
        this.computeOpenQuotations(),
        this.computeProductStats(),
      ]);

    return {
      cashRegisterOpen: todayStatus.isOpen,
      todayRecaudado: todayStatus.totalSoFar,
      todayAdeudado: todayStatus.totalOwedSoFar,
      salesLast7Days,
      openQuotationsTotal: openQuotations.total,
      openQuotationsCount: openQuotations.count,
      totalProducts: productStats.totalProducts,
      totalInventoryValue: productStats.totalInventoryValue,
      outOfStockCount: productStats.outOfStockCount,
      outOfStockProducts: productStats.outOfStockProducts,
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

  /** Every currently open quotation, any day — unlike
   * CashRegisterService's today-scoped "adeudado", this is the full
   * outstanding-credit picture an admin would want to see. */
  private async computeOpenQuotations(): Promise<{
    total: number;
    count: number;
  }> {
    const result = await this.quotationsRepository
      .createQueryBuilder('quotation')
      .select('COALESCE(SUM(quotation.totalAmount), 0)', 'sum')
      .addSelect('COUNT(*)', 'count')
      .where('quotation.invoicedAt IS NULL')
      .andWhere('quotation.cancelledAt IS NULL')
      .getRawOne<{ sum: string; count: string }>();
    return {
      total: Number(result?.sum ?? 0),
      count: Number(result?.count ?? 0),
    };
  }

  /** No confirmed "minimum stock" concept exists yet (see docs/GLOSSARY.md)
   * — "low stock" here deliberately means only `stock = 0` ("agotado"),
   * not an invented threshold. */
  private async computeProductStats(): Promise<{
    totalProducts: number;
    totalInventoryValue: number;
    outOfStockCount: number;
    outOfStockProducts: DashboardSummaryDto['outOfStockProducts'];
  }> {
    const [totalProducts, valueResult, outOfStockCount, outOfStockProducts] =
      await Promise.all([
        this.productsRepository.count(),
        this.productsRepository
          .createQueryBuilder('product')
          .select('COALESCE(SUM(product.cost * product.stock), 0)', 'value')
          .getRawOne<{ value: string }>(),
        this.productsRepository.count({ where: { stock: 0 } }),
        this.productsRepository.find({
          where: { stock: 0 },
          select: ['id', 'reference', 'description', 'stock'],
          order: { reference: 'ASC' },
          take: OUT_OF_STOCK_PREVIEW_LIMIT,
        }),
      ]);

    return {
      totalProducts,
      totalInventoryValue: Number(valueResult?.value ?? 0),
      outOfStockCount,
      outOfStockProducts,
    };
  }
}
