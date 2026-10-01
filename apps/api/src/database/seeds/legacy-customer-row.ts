import type { LegacyCustomer } from '../../customers/entities/legacy-customer.entity';

export type LegacyCustomerRow = Pick<
  LegacyCustomer,
  | 'identificationType'
  | 'identification'
  | 'companyName'
  | 'firstName'
  | 'familyName'
  | 'secondLastName'
>;

/**
 * DIAN document-type codes used by the old system's export (the
 * información exógena format). Anything else — e.g. 43, "sin
 * identificación" — has no matching type in the sale form and is skipped.
 */
const DOCUMENT_TYPES: Record<string, string> = {
  '13': 'CC',
  '31': 'NIT',
};

/** A cell as trimmed, uppercased text; null when empty or not text/number. */
export function cellText(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const trimmed = String(value).replace(/\s+/g, ' ').trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * One row of the export's columns, in order: tipo de documento, número,
 * primer apellido, segundo apellido, primer nombre, otros nombres, razón
 * social. Returns null for a row that can't become a customer.
 */
export function toLegacyCustomerRow(
  cells: unknown[],
): LegacyCustomerRow | null {
  const [
    documentType,
    number,
    firstLastName,
    secondLastName,
    firstName,
    otherNames,
    companyName,
  ] = cells;

  const identificationType = DOCUMENT_TYPES[cellText(documentType) ?? ''];
  const identification = cellText(number);
  if (!identificationType || !identification) return null;

  const names = [cellText(firstName), cellText(otherNames)]
    .filter(Boolean)
    .join(' ');

  return {
    identificationType,
    identification,
    companyName: cellText(companyName),
    firstName: names || null,
    familyName: cellText(firstLastName),
    secondLastName: cellText(secondLastName),
  };
}
