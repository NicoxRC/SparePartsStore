import { UnprocessableEntityException } from '@nestjs/common';
import { type CellValue, Workbook } from 'exceljs';
import { MAX_INVOICE_LINES } from '../xml/purchase-invoice-xml.parser';
import {
  COLUMN_TITLES,
  FIRST_DATA_ROW,
  HEADER_LABELS,
  SHEET_NAME,
  TITLE_ROW,
} from './purchase-sheet.layout';
import { PurchaseSheetParser } from './purchase-sheet.parser';

type Row = [CellValue, CellValue, CellValue, CellValue];

interface SheetOpts {
  nit?: CellValue;
  name?: CellValue;
  invoiceNumber?: CellValue;
  issueDate?: CellValue;
  rows?: Row[];
  labels?: string[];
  titles?: string[];
  sheetName?: string;
}

async function workbookBuffer(opts: SheetOpts = {}): Promise<Buffer> {
  const {
    nit = '900123456',
    name = 'Proveedor Uno',
    invoiceNumber = null,
    issueDate = null,
    rows = [['REF-1', 'Filtro', 2, 15000]],
    labels = Object.values(HEADER_LABELS),
    titles = [...COLUMN_TITLES],
    sheetName = SHEET_NAME,
  } = opts;

  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  labels.forEach((label, i) => (sheet.getCell(i + 1, 1).value = label));
  [nit, name, invoiceNumber, issueDate].forEach((value, i) => {
    if (value !== null) sheet.getCell(i + 1, 2).value = value;
  });
  titles.forEach((title, i) => (sheet.getCell(TITLE_ROW, i + 1).value = title));
  rows.forEach((row, r) =>
    row.forEach((value, c) => {
      if (value !== null)
        sheet.getCell(FIRST_DATA_ROW + r, c + 1).value = value;
    }),
  );
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('PurchaseSheetParser', () => {
  const parser = new PurchaseSheetParser();

  async function codeOf(buffer: Buffer): Promise<string | undefined> {
    try {
      await parser.parse(buffer);
    } catch (error) {
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      return (
        (error as UnprocessableEntityException).getResponse() as {
          code: string;
        }
      ).code;
    }
    return undefined;
  }

  describe('file handling', () => {
    it('parses a filled template', async () => {
      const result = await parser.parse(await workbookBuffer());

      expect(result.supplier).toEqual({
        nit: '900123456',
        dv: null,
        name: 'Proveedor Uno',
      });
      expect(result.lines).toEqual([
        {
          lineNumber: 1,
          reference: 'REF-1',
          description: 'Filtro',
          xmlQuantity: 2,
          quantity: 2,
          salePrice: 15000,
        },
      ]);
    });

    it('rejects a file that is not an xlsx', async () => {
      expect(await codeOf(Buffer.from('this is not a workbook'))).toBe(
        'INVALID_EXCEL',
      );
    });

    it('rejects an empty buffer', async () => {
      expect(await codeOf(Buffer.alloc(0))).toBe('INVALID_EXCEL');
    });

    it('falls back to the first sheet when it was renamed', async () => {
      const result = await parser.parse(
        await workbookBuffer({ sheetName: 'Hoja1' }),
      );

      expect(result.lines).toHaveLength(1);
    });

    it('rejects a sheet whose header labels were changed', async () => {
      const labels: string[] = Object.values(HEADER_LABELS);
      labels[0] = 'Otra cosa';

      expect(await codeOf(await workbookBuffer({ labels }))).toBe(
        'INVALID_TEMPLATE',
      );
    });

    it('rejects a sheet whose column titles were changed', async () => {
      const titles: string[] = [...COLUMN_TITLES];
      titles[3] = 'Costo';

      expect(await codeOf(await workbookBuffer({ titles }))).toBe(
        'INVALID_TEMPLATE',
      );
    });

    it('is tolerant of case and accents in the labels', async () => {
      const labels = Object.values(HEADER_LABELS).map((l) => l.toUpperCase());
      const titles = COLUMN_TITLES.map((t) => ` ${t.toLowerCase()} `);

      const result = await parser.parse(
        await workbookBuffer({ labels, titles }),
      );

      expect(result.lines).toHaveLength(1);
    });
  });

  describe('supplier and invoice header', () => {
    it('requires the NIT', async () => {
      expect(await codeOf(await workbookBuffer({ nit: null }))).toBe(
        'MISSING_SUPPLIER',
      );
      expect(await codeOf(await workbookBuffer({ nit: 'sin nit' }))).toBe(
        'MISSING_SUPPLIER',
      );
    });

    it('reads a numeric NIT cell', async () => {
      const result = await parser.parse(
        await workbookBuffer({ nit: 900123456 }),
      );

      expect(result.supplier.nit).toBe('900123456');
    });

    it('splits an inline check digit', async () => {
      const result = await parser.parse(
        await workbookBuffer({ nit: '900.123.456-7' }),
      );

      expect(result.supplier).toMatchObject({ nit: '900123456', dv: '7' });
    });

    it('leaves the name null when empty (the service decides if that is fatal)', async () => {
      const result = await parser.parse(await workbookBuffer({ name: null }));

      expect(result.supplier.name).toBeNull();
    });

    it('truncates an overlong name to 255 chars', async () => {
      const result = await parser.parse(
        await workbookBuffer({ name: 'N'.repeat(300) }),
      );

      expect(result.supplier.name).toHaveLength(255);
    });

    it('trims and uppercases the invoice number, null when empty', async () => {
      expect(
        (await parser.parse(await workbookBuffer({ invoiceNumber: ' fv-12 ' })))
          .invoiceNumber,
      ).toBe('FV-12');
      expect(
        (await parser.parse(await workbookBuffer())).invoiceNumber,
      ).toBeNull();
    });

    it('rejects an invoice number over 50 chars', async () => {
      expect(
        await codeOf(await workbookBuffer({ invoiceNumber: 'X'.repeat(51) })),
      ).toBe('INVALID_INVOICE_NUMBER');
    });

    it.each([
      [new Date('2026-09-01T00:00:00Z'), '2026-09-01'],
      ['2026-09-01', '2026-09-01'],
      ['01/09/2026', '2026-09-01'],
      ['1/9/2026', '2026-09-01'],
    ])('reads the date %p', async (issueDate, expected) => {
      const result = await parser.parse(await workbookBuffer({ issueDate }));

      expect(result.issueDate).toBe(expected);
    });

    it('leaves the date null when empty', async () => {
      expect((await parser.parse(await workbookBuffer())).issueDate).toBeNull();
    });

    it.each(['mañana', '31/02/2026', '2026-13-01'])(
      'rejects the date %p',
      async (issueDate) => {
        expect(await codeOf(await workbookBuffer({ issueDate }))).toBe(
          'INVALID_ISSUE_DATE',
        );
      },
    );
  });

  describe('lines', () => {
    const parseRows = async (rows: Row[]) =>
      (await parser.parse(await workbookBuffer({ rows }))).lines;

    it('rejects a template with no products', async () => {
      expect(await codeOf(await workbookBuffer({ rows: [] }))).toBe('NO_LINES');
    });

    it('skips fully empty rows and numbers lines consecutively', async () => {
      const lines = await parseRows([
        ['A', 'Uno', 1, 1000],
        [null, null, null, null],
        ['B', 'Dos', 2, 2000],
      ]);

      expect(lines.map((l) => [l.lineNumber, l.reference])).toEqual([
        [1, 'A'],
        [2, 'B'],
      ]);
    });

    it('keeps a row that has only a price so the reviewer can see and fix it', async () => {
      const [line] = await parseRows([[null, null, null, 1500]]);

      expect(line).toMatchObject({
        reference: null,
        quantity: null,
        salePrice: 1500,
      });
    });

    it('trims and uppercases the reference, null when empty or over 100 chars', async () => {
      const lines = await parseRows([
        [' ab-1 ', 'a', 1, 1000],
        [null, 'sin ref', 1, 1000],
        ['X'.repeat(101), 'larga', 1, 1000],
      ]);

      expect(lines.map((l) => l.reference)).toEqual(['AB-1', null, null]);
    });

    it('keeps a numeric reference as text', async () => {
      const [line] = await parseRows([[123, 'num', 1, 1000]]);

      expect(line.reference).toBe('123');
    });

    it('keeps leading zeros of a text reference', async () => {
      const [line] = await parseRows([['00123', 'cero', 1, 1000]]);

      expect(line.reference).toBe('00123');
    });

    it('truncates a description to 255 chars and is null when empty', async () => {
      const lines = await parseRows([
        ['A', 'D'.repeat(300), 1, 1000],
        ['B', null, 1, 1000],
      ]);

      expect(lines[0].description).toHaveLength(255);
      expect(lines[1].description).toBeNull();
    });

    it('reads rich text and formula cells', async () => {
      const [line] = await parseRows([
        [
          { richText: [{ text: 'RT-' }, { text: '1' }] },
          { formula: 'A1', result: 'Calculada' },
          1,
          1000,
        ],
      ]);

      expect(line).toMatchObject({
        reference: 'RT-1',
        description: 'Calculada',
      });
    });

    describe('quantity', () => {
      it.each([
        [3, 3, 3],
        ['4', 4, 4],
        ['1.500', 1500, 1500],
        [1.5, 1.5, null],
        [0, 0, null],
        [-2, -2, null],
        ['abc', 0, null],
        [null, 0, null],
      ])('%p -> xmlQuantity %p, quantity %p', async (raw, xml, quantity) => {
        const [line] = await parseRows([['A', 'x', raw, 1000]]);

        expect(line.xmlQuantity).toBe(xml);
        expect(line.quantity).toBe(quantity);
      });
    });

    describe('sale price', () => {
      it.each([
        [15000, 15000],
        ['15000', 15000],
        ['$ 15.000', 15000],
        ['1,500', 1500],
        [1500.5, 1500.5],
        [499, 499],
        [null, null],
        ['gratis', null],
        [-5, null],
        [1e10, null],
      ])('%p -> %p', async (raw, expected) => {
        const [line] = await parseRows([['A', 'x', 1, raw]]);

        expect(line.salePrice).toBe(expected);
      });
    });

    it('accepts exactly the maximum number of lines and rejects one more', async () => {
      const make = (n: number): Row[] =>
        Array.from({ length: n }, (_, i): Row => [`R${i}`, 'x', 1, 1000]);

      expect(await parseRows(make(MAX_INVOICE_LINES))).toHaveLength(
        MAX_INVOICE_LINES,
      );
      expect(
        await codeOf(
          await workbookBuffer({ rows: make(MAX_INVOICE_LINES + 1) }),
        ),
      ).toBe('TOO_MANY_LINES');
    });
  });
});
