import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { type CellValue, type Row, Workbook, type Worksheet } from 'exceljs';
import { normalizeProductReference } from '../../products/product-normalize.util';
import { parseNit } from '../supplier-nit.util';
import {
  MAX_INVOICE_LINES,
  type ParsedInvoiceLine,
} from '../xml/purchase-invoice-xml.parser';
import {
  COLUMN_TITLES,
  COLUMNS,
  FIRST_DATA_ROW,
  HEADER_LABELS,
  HEADER_ROWS,
  labelKey,
  SHEET_NAME,
  TITLE_ROW,
} from './purchase-sheet.layout';

export interface ParsedPurchaseSheet {
  supplier: { nit: string; dv: string | null; name: string | null };
  invoiceNumber: string | null;
  /** `YYYY-MM-DD`, or null when the cell was left empty. */
  issueDate: string | null;
  lines: ParsedInvoiceLine[];
}

/** Guards against a sheet with millions of styled rows dragging the loop. */
const MAX_SCANNED_ROWS = 5000;
/** numeric(12,2) holds values below 10^10. */
const MAX_PRICE = 1e10;

function fail(code: string, message: string): never {
  throw new UnprocessableEntityException({ code, message });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Text of a cell, whatever Excel stored: string, number, formula result, rich text, hyperlink. */
function cellText(value: CellValue | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  if (value instanceof Date || typeof value === 'boolean') return null;
  if (isObject(value)) {
    if ('richText' in value && Array.isArray(value.richText)) {
      const joined = (value.richText as Array<{ text?: string }>)
        .map((part) => part.text ?? '')
        .join('')
        .trim();
      return joined || null;
    }
    if ('result' in value) return cellText(value.result as CellValue);
    if ('text' in value && typeof value.text === 'string') {
      return value.text.trim() || null;
    }
  }
  return null;
}

/**
 * A whole number typed the local way: "1.500" and "1,500" are one thousand
 * five hundred (COP amounts and quantities here are always integers), while
 * "1500.5" stays a decimal so validation can flag it rather than silently
 * turning it into 15005.
 */
function cellNumber(value: CellValue | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = cellText(value);
  if (text === null) return null;
  const cleaned = text.replace(/[$\s]/g, '');
  const parsed = /^\d{1,3}([.,]\d{3})+$/.test(cleaned)
    ? Number(cleaned.replace(/[.,]/g, ''))
    : Number(cleaned.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function cellDate(value: CellValue | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? invalidDate()
      : value.toISOString().slice(0, 10);
  }
  const text = cellText(value);
  if (text === null) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  const [year, month, day] = iso
    ? [iso[1], iso[2], iso[3]]
    : local
      ? [local[3], local[2].padStart(2, '0'), local[1].padStart(2, '0')]
      : [null, null, null];
  if (!year || !month || !day) return invalidDate();

  const normalized = `${year}-${month}-${day}`;
  const check = new Date(`${normalized}T00:00:00Z`);
  return !Number.isNaN(check.getTime()) &&
    check.toISOString().startsWith(normalized)
    ? normalized
    : invalidDate();
}

function invalidDate(): never {
  return fail(
    'INVALID_ISSUE_DATE',
    'La fecha de la factura no es válida. Usa el formato AAAA-MM-DD o DD/MM/AAAA.',
  );
}

@Injectable()
export class PurchaseSheetParser {
  async parse(buffer: Buffer): Promise<ParsedPurchaseSheet> {
    const sheet = await this.loadSheet(buffer);
    this.assertTemplateLayout(sheet);

    return {
      ...this.readHeader(sheet),
      lines: this.readLines(sheet),
    };
  }

  private async loadSheet(buffer: Buffer): Promise<Worksheet> {
    const workbook = new Workbook();
    try {
      await workbook.xlsx.load(buffer as never);
    } catch {
      fail(
        'INVALID_EXCEL',
        'No se pudo leer el archivo. Sube la plantilla en formato .xlsx.',
      );
    }
    const sheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.worksheets[0];
    if (!sheet) {
      fail('INVALID_TEMPLATE', 'El archivo no tiene ninguna hoja.');
    }
    return sheet;
  }

  /** Refuses a file that isn't the template, rather than reading the wrong cells. */
  private assertTemplateLayout(sheet: Worksheet): void {
    const labelsMatch = (
      Object.keys(HEADER_LABELS) as Array<keyof typeof HEADER_LABELS>
    ).every((key) => {
      const actual = cellText(sheet.getCell(HEADER_ROWS[key], 1).value);
      return (
        actual !== null && labelKey(actual) === labelKey(HEADER_LABELS[key])
      );
    });
    const titlesMatch = COLUMN_TITLES.every((title, index) => {
      const actual = cellText(sheet.getCell(TITLE_ROW, index + 1).value);
      return actual !== null && labelKey(actual) === labelKey(title);
    });

    if (!labelsMatch || !titlesMatch) {
      fail(
        'INVALID_TEMPLATE',
        'El archivo no coincide con la plantilla. Descarga la plantilla de nuevo y no cambies los títulos.',
      );
    }
  }

  private readHeader(
    sheet: Worksheet,
  ): Pick<ParsedPurchaseSheet, 'supplier' | 'invoiceNumber' | 'issueDate'> {
    const valueOf = (key: keyof typeof HEADER_ROWS) =>
      sheet.getCell(HEADER_ROWS[key], 2).value;

    const nit = parseNit(cellText(valueOf('nit')));
    if (!nit) {
      fail(
        'MISSING_SUPPLIER',
        'Falta el NIT del proveedor (celda B1) o no es válido.',
      );
    }

    const name = cellText(valueOf('name'));

    const invoiceNumber =
      cellText(valueOf('invoiceNumber'))?.toUpperCase() ?? null;
    if (invoiceNumber && invoiceNumber.length > 50) {
      fail(
        'INVALID_INVOICE_NUMBER',
        'El número de factura es demasiado largo (máximo 50 caracteres).',
      );
    }

    return {
      supplier: { ...nit, name: name ? name.slice(0, 255) : null },
      invoiceNumber,
      issueDate: cellDate(valueOf('issueDate')),
    };
  }

  private readLines(sheet: Worksheet): ParsedInvoiceLine[] {
    const lines: ParsedInvoiceLine[] = [];
    let scanned = 0;

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber < FIRST_DATA_ROW) return;
      scanned += 1;
      if (scanned > MAX_SCANNED_ROWS) this.tooManyLines();

      const line = this.readLine(row, lines.length + 1);
      if (!line) return;
      lines.push(line);
      if (lines.length > MAX_INVOICE_LINES) this.tooManyLines();
    });

    if (lines.length === 0) {
      fail('NO_LINES', 'La plantilla no tiene productos.');
    }
    return lines;
  }

  private tooManyLines(): never {
    return fail(
      'TOO_MANY_LINES',
      `El archivo tiene más de ${MAX_INVOICE_LINES} productos; divídelo antes de cargarlo.`,
    );
  }

  /** null for a row with nothing in any of the four columns. */
  private readLine(row: Row, lineNumber: number): ParsedInvoiceLine | null {
    const rawReference = cellText(row.getCell(COLUMNS.reference).value);
    const description = cellText(row.getCell(COLUMNS.description).value);
    const xmlQuantity = cellNumber(row.getCell(COLUMNS.quantity).value);
    const price = cellNumber(row.getCell(COLUMNS.salePrice).value);

    if (
      rawReference === null &&
      description === null &&
      xmlQuantity === null &&
      price === null
    ) {
      return null;
    }

    const reference = rawReference
      ? normalizeProductReference(rawReference)
      : null;
    const quantity =
      xmlQuantity !== null && Number.isInteger(xmlQuantity) && xmlQuantity > 0
        ? xmlQuantity
        : null;

    return {
      lineNumber,
      reference: reference && reference.length <= 100 ? reference : null,
      description: description ? description.slice(0, 255) : null,
      xmlQuantity: xmlQuantity ?? 0,
      quantity,
      salePrice:
        price !== null && price >= 0 && price < MAX_PRICE ? price : null,
    };
  }
}
