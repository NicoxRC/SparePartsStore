import type { NewPaymentMeans, PaymentMeans } from '../services/portfolio';

export const PAYMENT_MEANS_LABEL: Record<PaymentMeans, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  BANK_TRANSFER: 'Transferencia',
};

/** What a new abono can be paid with (decided with the store). */
export const NEW_PAYMENT_MEANS: NewPaymentMeans[] = ['CASH', 'BANK_TRANSFER'];

/** "15 oct 2026, 3:40 p. m." in the store's time zone — for notes and abonos. */
export function storeDateTimeLabel(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "$150.000" — whole pesos, the way every screen shows money. */
export function money(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

export function quotationNumberLabel(number: number): string {
  return `COT-${String(number).padStart(4, '0')}`;
}

/** "2026-01-01" → "1 ene 2026" (a bare date: no time zone to shift). */
export function rangeDateLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "Del 1 ene 2026 al 31 oct 2026", "Desde …", "Hasta …" or "Todas las fechas". */
export function rangeLabel(from?: string, to?: string): string {
  if (from && to) return `Del ${rangeDateLabel(from)} al ${rangeDateLabel(to)}`;
  if (from) return `Desde el ${rangeDateLabel(from)}`;
  if (to) return `Hasta el ${rangeDateLabel(to)}`;
  return 'Todas las fechas';
}

/** An instant, as the store's calendar day: "15 oct 2026". */
export function storeDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
