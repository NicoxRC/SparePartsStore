import 'dotenv/config';
import * as ExcelJS from 'exceljs';
import { Customer } from '../../customers/entities/customer.entity';
import { LegacyCustomer } from '../../customers/entities/legacy-customer.entity';
import dataSource from '../data-source';
import {
  cellText,
  toLegacyCustomerRow,
  type LegacyCustomerRow,
} from './legacy-customer-row';

/**
 * Loads the old system's customer export into `legacy_customers`:
 *
 *   npm run seed:legacy-customers -- "<path to CLIENTES ... .xlsx>"
 *
 * Reads the first sheet; data starts on the row after the one whose first
 * column reads "Tipo de documento". Safe to re-run: numbers already in
 * `customers` or `legacy_customers` are skipped, so nothing comes back
 * after staff have moved it over.
 */
const HEADER_LABEL = 'TIPO DE DOCUMENTO';
const COLUMNS = 7;

async function seed(): Promise<void> {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error('Usage: npm run seed:legacy-customers -- <file.xlsx>');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  let headerRow = 0;
  const rows: LegacyCustomerRow[] = [];
  let skipped = 0;
  sheet.eachRow((row, rowNumber) => {
    const cells = Array.from({ length: COLUMNS }, (_, i) => {
      const value = row.getCell(i + 1).value;
      return value instanceof Object && 'result' in value
        ? value.result
        : value;
    });
    if (!headerRow) {
      if (cellText(cells[0]) === HEADER_LABEL) {
        headerRow = rowNumber;
      }
      return;
    }
    const mapped = toLegacyCustomerRow(cells);
    if (mapped) rows.push(mapped);
    else skipped++;
  });
  if (!headerRow) {
    throw new Error(`No "${HEADER_LABEL}" header row found in ${filePath}`);
  }

  await dataSource.initialize();

  const existing = new Set<string>();
  const customers = await dataSource
    .getRepository(Customer)
    .find({ select: { identification: true } });
  const legacy = await dataSource
    .getRepository(LegacyCustomer)
    .find({ select: { identification: true } });
  for (const { identification } of [...customers, ...legacy]) {
    existing.add(identification);
  }

  const toInsert: LegacyCustomerRow[] = [];
  for (const row of rows) {
    if (existing.has(row.identification)) {
      skipped++;
      continue;
    }
    existing.add(row.identification);
    toInsert.push(row);
  }

  const repository = dataSource.getRepository(LegacyCustomer);
  for (let i = 0; i < toInsert.length; i += 500) {
    await repository.insert(toInsert.slice(i, i + 500));
  }

  console.log(
    `Imported ${toInsert.length} legacy customers, skipped ${skipped}.`,
  );
  await dataSource.destroy();
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
