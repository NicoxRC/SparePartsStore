import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the "INVENTARIO INICIAL" supplier: the default for every product
 * the store already had before it started loading suppliers' invoices, and
 * for any product created without choosing a supplier (see
 * ProductsService). NIT `0` is a placeholder no real supplier can have, so a
 * purchase import never matches it. Every product with no supplier yet is
 * moved to it. `down()` only unlinks those products and removes the row if
 * nothing else points at it.
 */
export class AddInitialInventorySupplier1789930000007 implements MigrationInterface {
  name = 'AddInitialInventorySupplier1789930000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "suppliers" ("nit", "name")
      SELECT '0', 'INVENTARIO INICIAL'
      WHERE NOT EXISTS (
        SELECT 1 FROM "suppliers" WHERE "nit" = '0' AND "deleted_at" IS NULL
      )
    `);
    await queryRunner.query(`
      UPDATE "products" SET "supplier_id" = (
        SELECT "id" FROM "suppliers" WHERE "nit" = '0' AND "deleted_at" IS NULL
      )
      WHERE "supplier_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "products" SET "supplier_id" = NULL
      WHERE "supplier_id" = (
        SELECT "id" FROM "suppliers" WHERE "nit" = '0' AND "deleted_at" IS NULL
      )
    `);
    await queryRunner.query(`DELETE FROM "suppliers" WHERE "nit" = '0'`);
  }
}
