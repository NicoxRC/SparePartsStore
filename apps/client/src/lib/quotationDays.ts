/**
 * Day counters on an open quotation. The store usually gives the customer
 * 30 days to pay, counted from the last time something was added or removed
 * (the customer often comes back for more parts), so two counters are shown:
 * since it was made, and since its last change.
 */
export const PAYMENT_TERM_DAYS = 30;

// Colombia is a fixed UTC-5 with no daylight saving (same as the API's
// store-date util), so a plain offset gives the store's calendar day.
const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function storeDayNumber(instant: Date): number {
  return Math.floor((instant.getTime() + BOGOTA_OFFSET_MS) / DAY_MS);
}

/** Whole store calendar days from `iso` to now: made today = 0, yesterday = 1. */
export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, storeDayNumber(now) - storeDayNumber(new Date(iso)));
}

export function daysLabel(days: number): string {
  if (days === 0) return 'hoy';
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}
