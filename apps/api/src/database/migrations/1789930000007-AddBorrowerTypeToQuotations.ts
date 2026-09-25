import { MigrationInterface, QueryRunner } from 'typeorm';

/** The customer columns only an "almacén" quotation must fill. */
const INVOICE_DATA_COLUMNS = [
  'customer_identification_type',
  'customer_identification',
  'customer_party_type',
  'customer_tax_level_code',
  'customer_country_code',
  'customer_department',
  'customer_city',
  'customer_address_line',
  'customer_email',
];

/**
 * A quotation (a loan of merchandise) is made either to an "almacén" — which
 * must carry full invoice data, as every quotation did until now — or to an
 * "empleado", identified only by name. Existing rows become `almacen`, and
 * the invoice-data columns become nullable for the empleado ones. `down()`
 * can't restore data an empleado quotation never had, so it fails while
 * any empleado quotation is missing it.
 */
export class AddBorrowerTypeToQuotations1789930000007 implements MigrationInterface {
  name = 'AddBorrowerTypeToQuotations1789930000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quotations" ADD "borrower_type" character varying(20) NOT NULL DEFAULT 'almacen'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quotations_borrower_type" ON "quotations" ("borrower_type")`,
    );
    for (const column of INVOICE_DATA_COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "quotations" ALTER COLUMN "${column}" DROP NOT NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of INVOICE_DATA_COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "quotations" ALTER COLUMN "${column}" SET NOT NULL`,
      );
    }
    await queryRunner.query(`DROP INDEX "IDX_quotations_borrower_type"`);
    await queryRunner.query(
      `ALTER TABLE "quotations" DROP COLUMN "borrower_type"`,
    );
  }
}
