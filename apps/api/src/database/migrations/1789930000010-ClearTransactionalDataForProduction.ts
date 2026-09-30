import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One-off cleanup before going to production: deletes the test data the
 * store generated while trying the app out — quotations, invoices (and the
 * credit/debit notes that point at them, which would otherwise block the
 * delete), purchase imports (XML or Excel), customers except "Consumidor
 * final" (`222222222222`), DIAN resolutions, cash registers, payroll
 * entries, and every supplier except INVENTARIO INICIAL (`nit = '0'`).
 *
 * Products point at their supplier (`RESTRICT`), so a product whose
 * supplier is removed is moved to INVENTARIO INICIAL first — that is the
 * only change made to products. Its cost is left as it is.
 *
 * Deliberately NOT touched: users/permissions, the rest of each product,
 * departments/groups/brands, inventory movements and stock.
 *
 * Child rows go with their parent via `ON DELETE CASCADE`: quotation_items,
 * purchase_import_items and cash_movements. `down()` is a no-op — deleted
 * rows cannot be brought back.
 */
export class ClearTransactionalDataForProduction1789930000010 implements MigrationInterface {
  name = 'ClearTransactionalDataForProduction1789930000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "quotations"`);
    await queryRunner.query(`DELETE FROM "credit_notes"`);
    await queryRunner.query(`DELETE FROM "debit_notes"`);
    await queryRunner.query(`DELETE FROM "invoices"`);
    await queryRunner.query(`DELETE FROM "purchase_imports"`);
    await queryRunner.query(
      `DELETE FROM "customers" WHERE "identification" <> '222222222222'`,
    );
    await queryRunner.query(`DELETE FROM "dian_resolutions"`);
    await queryRunner.query(`DELETE FROM "cash_registers"`);
    await queryRunner.query(`DELETE FROM "payroll_entries"`);
    await queryRunner.query(`
      UPDATE "products" SET "supplier_id" = (
        SELECT "id" FROM "suppliers" WHERE "nit" = '0' AND "deleted_at" IS NULL
      )
      WHERE "supplier_id" IS DISTINCT FROM (
        SELECT "id" FROM "suppliers" WHERE "nit" = '0' AND "deleted_at" IS NULL
      )
    `);
    await queryRunner.query(`
      DELETE FROM "suppliers" WHERE "id" IS DISTINCT FROM (
        SELECT "id" FROM "suppliers" WHERE "nit" = '0' AND "deleted_at" IS NULL
      )
    `);
  }

  public async down(): Promise<void> {
    // Intentionally a no-op — see the class docstring.
  }
}
