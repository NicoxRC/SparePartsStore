/**
 * The one place that knows where things live in the purchase template. Both
 * the template builder and the reader use it, so they can't drift apart.
 *
 * Sheet "Compra":
 *   A1..A4 labels, B1..B4 supplier/invoice header values
 *   row 6  column titles, rows 7+ one product per row
 */
export const SHEET_NAME = 'Compra';
export const INSTRUCTIONS_SHEET_NAME = 'Instrucciones';

export const HEADER_LABELS = {
  nit: 'NIT del proveedor',
  name: 'Nombre del proveedor',
  invoiceNumber: 'N° de factura (opcional)',
  issueDate: 'Fecha de factura (opcional)',
} as const;

export const HEADER_ROWS = {
  nit: 1,
  name: 2,
  invoiceNumber: 3,
  issueDate: 4,
} as const;

export const TITLE_ROW = 6;
export const FIRST_DATA_ROW = 7;

export const COLUMN_TITLES = [
  'Referencia',
  'Descripción',
  'Cantidad',
  'Precio de venta',
] as const;

export const COLUMNS = {
  reference: 1,
  description: 2,
  quantity: 3,
  salePrice: 4,
} as const;

export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const TEMPLATE_FILENAME = 'plantilla-compra.xlsx';

/** Comparison key that ignores case, accents and stray spaces in a label. */
export function labelKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
