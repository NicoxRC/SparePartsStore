import { EntityManager } from 'typeorm';

/**
 * Runs `work` in a transaction holding a Postgres advisory lock per
 * quotation, so two requests on the same quotation (a double tap, two
 * tills, an abono racing an invoice) run one after the other: the second
 * one re-reads it and fails its "still open" check instead of invoicing,
 * cancelling, moving stock or taking an abono a second time. Every caller
 * loads the quotation inside `work`, never before. Keys are sorted so two
 * merges over overlapping quotations can't deadlock. Released when the
 * transaction ends — see withNumberingLock().
 *
 * Shared by QuotationsService and PortfolioService (abonos), so both take
 * the very same key.
 */
export function withQuotationLock<T>(
  manager: EntityManager,
  ids: string[],
  work: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  return manager.transaction(async (transactionManager) => {
    for (const id of [...ids].sort()) {
      await transactionManager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        [`quotation:${id}`],
      );
    }
    return work(transactionManager);
  });
}
