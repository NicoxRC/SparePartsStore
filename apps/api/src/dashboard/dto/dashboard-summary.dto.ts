import { ApiProperty } from '@nestjs/swagger';

export class DailySalesDto {
  @ApiProperty({ description: "Store-local calendar day, 'YYYY-MM-DD'." })
  date: string;

  @ApiProperty({ description: "Sum of that day's invoices.total_amount." })
  total: number;
}

export class LowStockProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reference: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  stock: number;
}

/**
 * A single read-only snapshot for the admin dashboard — see
 * DashboardService for what each figure means and why. Nothing here is
 * persisted; every field is computed fresh on each request.
 */
export class DashboardSummaryDto {
  @ApiProperty()
  cashRegisterOpen: boolean;

  @ApiProperty({
    nullable: true,
    description: "Recaudado so far today, null if caja isn't open.",
  })
  todayRecaudado: number | null;

  @ApiProperty({
    nullable: true,
    description: "Adeudado so far today, null if caja isn't open.",
  })
  todayAdeudado: number | null;

  @ApiProperty({
    type: [DailySalesDto],
    description: 'Last 7 store-local days, oldest first, today included.',
  })
  salesLast7Days: DailySalesDto[];

  @ApiProperty({
    description:
      'Sum of every currently open quotation (not invoiced/cancelled), any day.',
  })
  openQuotationsTotal: number;

  @ApiProperty()
  openQuotationsCount: number;

  @ApiProperty()
  totalProducts: number;

  @ApiProperty()
  outOfStockCount: number;

  @ApiProperty({
    type: [LowStockProductDto],
    description:
      'Up to 10 out-of-stock products, for a quick glance — see outOfStockCount for the full count.',
  })
  outOfStockProducts: LowStockProductDto[];
}
