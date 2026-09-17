/**
 * Colombia (America/Bogota) has a fixed UTC-5 offset with no daylight
 * saving time, so "the store's calendar day" can be computed with a plain
 * offset shift instead of depending on the runtime's ICU/timezone data —
 * exact, and trivially testable with a fake system clock. Used to gate
 * cash-register open/close on the store's actual local day, not the
 * server's (Railway runs UTC).
 */
const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's date in the store's local (Bogotá) calendar, as 'YYYY-MM-DD'. */
export function getStoreToday(now: Date = new Date()): string {
  return new Date(now.getTime() + BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * The UTC instant range `[start, end)` covering one Bogotá calendar day —
 * for filtering a TIMESTAMPTZ column (e.g. `invoices.created_at`) by store
 * day without depending on the DB session's timezone setting.
 */
export function getStoreDayRangeUtc(storeDate: string): {
  start: Date;
  end: Date;
} {
  const start = new Date(`${storeDate}T00:00:00.000-05:00`);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}
