import { EntityManager } from 'typeorm';

/**
 * Runs `work` while holding a Postgres advisory lock on `key`, so two
 * documents of the same kind are never issued at the same time. Numbers
 * are read as `MAX(number) + 1` and the row is only saved after Dataico
 * answers, which takes seconds: without this, two cashiers clicking
 * "Facturar" together would both send the same number to Dataico. The
 * second one now waits for the first to finish and gets the next number.
 *
 * `pg_advisory_xact_lock` is released when the wrapping transaction ends,
 * which is after `work` (and its own saves) completed or failed. Holds a
 * DB connection idle meanwhile — fine at this store's volume.
 */
export function withNumberingLock<T>(
  manager: EntityManager,
  key: string,
  work: () => Promise<T>,
): Promise<T> {
  return manager.transaction(async (lockManager) => {
    await lockManager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      key,
    ]);
    return work();
  });
}
