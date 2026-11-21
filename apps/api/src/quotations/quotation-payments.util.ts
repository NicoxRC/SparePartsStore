import { Repository } from 'typeorm';
import { QuotationPayment } from './entities/quotation-payment.entity';
import { Quotation } from './entities/quotation.entity';

/**
 * SQL condition for an open quotation — not invoiced, completed, cancelled
 * or merged (there is no status column, see docs/DATABASE.md).
 */
export function openQuotationCondition(alias: string): string {
  return [
    `${alias}.invoicedAt IS NULL`,
    `${alias}.completedAt IS NULL`,
    `${alias}.cancelledAt IS NULL`,
    `${alias}.mergedAt IS NULL`,
  ].join(' AND ');
}

export function isOpenQuotation(quotation: Quotation): boolean {
  return (
    !quotation.invoicedAt &&
    !quotation.completedAt &&
    !quotation.cancelledAt &&
    !quotation.mergedAt
  );
}

/** "$150.000" — for error messages staff read. */
export function formatCop(amount: number): string {
  return `$${amount.toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;
}

/** Money is compared in whole centavos so 0.1 + 0.2 never misses 0.3. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * What has been paid toward each quotation through abonos that weren't
 * voided. A quotation with no abono is simply absent from the map. Inside
 * a transaction, pass `manager.getRepository(QuotationPayment)`.
 */
export async function sumPaidByQuotation(
  paymentsRepository: Repository<QuotationPayment>,
  quotationIds: string[],
): Promise<Map<string, number>> {
  const paid = new Map<string, number>();
  if (quotationIds.length === 0) return paid;

  const rows = await paymentsRepository
    .createQueryBuilder('payment')
    .select('payment.quotation_id', 'quotationId')
    .addSelect('SUM(payment.amount)', 'paid')
    .where('payment.quotation_id IN (:...quotationIds)', { quotationIds })
    .andWhere('payment.voidedAt IS NULL')
    .groupBy('payment.quotation_id')
    .getRawMany<{ quotationId: string; paid: string }>();

  for (const row of rows) {
    paid.set(row.quotationId, Number(row.paid));
  }
  return paid;
}
