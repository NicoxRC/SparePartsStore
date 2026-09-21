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
import { PurchaseSheetParser } from './purchase-sheet.parser';
import { buildPurchaseTemplate } from './purchase-sheet.template';

async function load(buffer: Buffer): Promise<Workbook> {
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer as never);
  return workbook;
}

describe('buildPurchaseTemplate', () => {
  it('has the header labels and column titles the reader expects', async () => {
    const sheet = (await load(await buildPurchaseTemplate())).getWorksheet(
      SHEET_NAME,
    )!;

    for (const key of Object.keys(HEADER_LABELS) as Array<
      keyof typeof HEADER_LABELS
    >) {
      expect(sheet.getCell(HEADER_ROWS[key], 1).value).toBe(HEADER_LABELS[key]);
    }
    COLUMN_TITLES.forEach((title, i) => {
      expect(sheet.getCell(TITLE_ROW, i + 1).value).toBe(title);
    });
  });

  it('includes an instructions sheet', async () => {
    const workbook = await load(await buildPurchaseTemplate());

    expect(workbook.getWorksheet(INSTRUCTIONS_SHEET_NAME)).toBeDefined();
  });

  it('formats the reference and NIT as text so leading zeros survive', async () => {
    const sheet = (await load(await buildPurchaseTemplate())).getWorksheet(
      SHEET_NAME,
    )!;

    expect(sheet.getCell(FIRST_DATA_ROW, COLUMNS.reference).numFmt).toBe('@');
    expect(sheet.getCell(HEADER_ROWS.nit, 2).numFmt).toBe('@');
  });

  it('validates quantity and price in Excel for every allowed row', async () => {
    const sheet = (await load(await buildPurchaseTemplate())).getWorksheet(
      SHEET_NAME,
    )!;
    const lastRow = FIRST_DATA_ROW + MAX_INVOICE_LINES - 1;

    expect(
      sheet.getCell(FIRST_DATA_ROW, COLUMNS.quantity).dataValidation,
    ).toMatchObject({
      type: 'whole',
      formulae: [1],
    });
    expect(
      sheet.getCell(lastRow, COLUMNS.salePrice).dataValidation,
    ).toMatchObject({
      type: 'whole',
      formulae: [500],
    });
  });

  it('is rejected by the reader while still empty (no products yet), proving it is read as the template', async () => {
    await expect(
      new PurchaseSheetParser().parse(await buildPurchaseTemplate()),
    ).rejects.toMatchObject({
      response: { code: 'MISSING_SUPPLIER' },
    });
  });

  it('round-trips: a filled-in template parses back into the same data', async () => {
    const workbook = await load(await buildPurchaseTemplate());
    const sheet = workbook.getWorksheet(SHEET_NAME)!;
    sheet.getCell(HEADER_ROWS.nit, 2).value = '900123456-7';
    sheet.getCell(HEADER_ROWS.name, 2).value = 'Proveedor Uno';
    sheet.getCell(FIRST_DATA_ROW, COLUMNS.reference).value = 'ABC-1';
    sheet.getCell(FIRST_DATA_ROW, COLUMNS.description).value =
      'Filtro de aceite';
    sheet.getCell(FIRST_DATA_ROW, COLUMNS.quantity).value = 3;
    sheet.getCell(FIRST_DATA_ROW, COLUMNS.salePrice).value = 25000;
    const filled = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await new PurchaseSheetParser().parse(filled);

    expect(result.supplier).toEqual({
      nit: '900123456',
      dv: '7',
      name: 'Proveedor Uno',
    });
    expect(result.lines).toEqual([
      {
        lineNumber: 1,
        reference: 'ABC-1',
        description: 'Filtro de aceite',
        xmlQuantity: 3,
        quantity: 3,
        salePrice: 25000,
      },
    ]);
  });
});
