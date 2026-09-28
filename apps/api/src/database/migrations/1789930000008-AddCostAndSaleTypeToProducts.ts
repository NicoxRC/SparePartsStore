import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Brings back the product cost removed by `RemoveCostAndSaleTypeFromProducts`,
 * now with two origins: a product created one by one derives it from the sale
 * price and its sale type (`/ 1.65` normal, `/ 1.30` neto), while a purchase
 * import stores the cost the user typed. Every existing product is backfilled
 * as `normal`, since the original sale types were dropped. Also adds the typed
 * cost to purchase-import draft lines.
 */
export class AddCostAndSaleTypeToProducts1789930000008 implements MigrationInterface {
  name = 'AddCostAndSaleTypeToProducts1789930000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "sale_type" AS ENUM ('normal', 'neto')`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "sale_type" "sale_type" NOT NULL DEFAULT 'normal'`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "cost" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE "products" SET "cost" = ROUND("sale_price" / 1.65)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "cost" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_import_items" ADD "new_cost" numeric(12,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_import_items" DROP COLUMN "new_cost"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "cost"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "sale_type"`);
    await queryRunner.query(`DROP TYPE "sale_type"`);
  }
}
