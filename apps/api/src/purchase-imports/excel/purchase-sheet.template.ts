import { Workbook } from 'exceljs';
import { MAX_INVOICE_LINES } from '../xml/purchase-invoice-xml.parser';
import {
  COLUMN_TITLES,
  COLUMNS,
  FIRST_DATA_ROW,
  HEADER_LABELS,
  HEADER_ROWS,
  INSTRUCTIONS_SHEET_NAME,
  SHEET_NAME,
  TITLE_ROW,
} from './purchase-sheet.layout';

const LAST_DATA_ROW = FIRST_DATA_ROW + MAX_INVOICE_LINES - 1;
const TEXT_FORMAT = '@';

const INSTRUCTIONS = [
  'Cómo llenar la plantilla',
  '',
  '1. Escribe el NIT y el nombre del proveedor (las dos primeras filas de la hoja "Compra").',
  '   El nombre solo se usa si el proveedor es nuevo; si ya existe se respeta el guardado.',
  '2. El número y la fecha de la factura son opcionales. Si pones el número, la misma factura no se puede cargar dos veces.',
  '3. Desde la fila 7, una fila por producto: Referencia, Descripción, Cantidad y Precio de venta.',
  '4. La cantidad debe ser un número entero mayor que 0.',
  '5. El precio de venta es el que tú fijas. Solo se usa si el producto es nuevo; si la referencia ya existe en el',
  '   catálogo, se suma el stock y el precio del producto no cambia.',
  '6. Máximo 500 productos por archivo. No cambies los títulos ni muevas las filas.',
  '',
  'Nada se guarda todavía: al subir el archivo queda un borrador que revisas y confirmas en la app.',
];

export async function buildPurchaseTemplate(): Promise<Buffer> {
  const workbook = new Workbook();

  const sheet = workbook.addWorksheet(SHEET_NAME);
  sheet.columns = [{ width: 30 }, { width: 50 }, { width: 14 }, { width: 18 }];

  for (const key of Object.keys(HEADER_LABELS) as Array<
    keyof typeof HEADER_LABELS
  >) {
    const row = sheet.getRow(HEADER_ROWS[key]);
    row.getCell(1).value = HEADER_LABELS[key];
    row.getCell(1).font = { bold: true };
  }
  // NIT and invoice number as text so Excel doesn't strip leading zeros.
  sheet.getCell(HEADER_ROWS.nit, 2).numFmt = TEXT_FORMAT;
  sheet.getCell(HEADER_ROWS.invoiceNumber, 2).numFmt = TEXT_FORMAT;
  sheet.getCell(HEADER_ROWS.issueDate, 2).numFmt = 'yyyy-mm-dd';

  const titles = sheet.getRow(TITLE_ROW);
  COLUMN_TITLES.forEach((title, index) => {
    const cell = titles.getCell(index + 1);
    cell.value = title;
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };
  });
  sheet.views = [{ state: 'frozen', ySplit: TITLE_ROW }];

  for (
    let rowNumber = FIRST_DATA_ROW;
    rowNumber <= LAST_DATA_ROW;
    rowNumber++
  ) {
    const row = sheet.getRow(rowNumber);
    // Text format on the reference keeps codes like "00123" intact.
    row.getCell(COLUMNS.reference).numFmt = TEXT_FORMAT;

    const quantity = row.getCell(COLUMNS.quantity);
    quantity.dataValidation = {
      type: 'whole',
      operator: 'greaterThanOrEqual',
      formulae: [1],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: 'Cantidad no válida',
      error: 'Escribe un número entero mayor que 0.',
    };

    const price = row.getCell(COLUMNS.salePrice);
    price.numFmt = '#,##0';
    price.dataValidation = {
      type: 'whole',
      operator: 'greaterThanOrEqual',
      formulae: [500],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: 'Precio no válido',
      error: 'Escribe un número entero de 500 o más.',
    };
  }

  const instructions = workbook.addWorksheet(INSTRUCTIONS_SHEET_NAME);
  instructions.getColumn(1).width = 110;
  INSTRUCTIONS.forEach((line, index) => {
    const cell = instructions.getCell(index + 1, 1);
    cell.value = line;
    if (index === 0) cell.font = { bold: true, size: 14 };
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
