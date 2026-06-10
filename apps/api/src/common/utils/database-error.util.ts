import { QueryFailedError } from 'typeorm';

/** PostgreSQL error code for "unique_violation". */
const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

/**
 * Returns true if the given error is a TypeORM `QueryFailedError` wrapping a
 * PostgreSQL unique constraint/index violation (error code 23505).
 *
 * Useful as a safety net against TOCTOU races where a pre-check (e.g. a
 * `findOne` lookup) passes but a concurrent request inserts/updates the same
 * row first, causing the `save()` to fail at the database level instead of
 * the application level.
 */
export function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { code?: string } | undefined;
  return driverError?.code === POSTGRES_UNIQUE_VIOLATION_CODE;
}
