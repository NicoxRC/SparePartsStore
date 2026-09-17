/**
 * Every confirmed Dataico date field (invoice, resend, debit note) uses
 * 'DD/MM/YYYY', not ISO — shared by every service that builds a Dataico
 * request body.
 */
export function toDataicoDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}
