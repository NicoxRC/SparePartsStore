const BOGOTA = 'America/Bogota';

/** "$18,000.00" — the receipt prints amounts the way the store's existing tirilla does. */
export function ticketMoney(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "21/09/2026 13:03" in the store's own time zone, whatever the browser's. */
export function ticketDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BOGOTA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(iso))
    .replace(',', '');
}

/** "2026-09-21" -> "21/09/2026" (a bare date has no time zone to shift). */
export function ticketDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

/** "10001" -> "10.001" (the authorized range is printed with thousands separators). */
export function ticketRangeNumber(value: number): string {
  return value.toLocaleString('es-CO');
}
