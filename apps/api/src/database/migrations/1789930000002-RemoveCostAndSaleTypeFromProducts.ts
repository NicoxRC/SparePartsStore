import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The store now enters only the sale price: the reverse-markup cost
 * (`sale_price / 1.65` or `/ 1.30`) and the sale type that selected the factor
 * are gone. Both were derived data except `sale_type` itself, which cannot be
 * recovered after this runs — `down()` restores the columns with the default
 * `normal` and a cost recomputed at the `normal` factor, not the original values.
 */
export class RemoveCostAndSaleTypeFromProducts1789930000002 implements MigrationInterface {
  name = 'RemoveCostAndSaleTypeFromProducts1789930000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "cost"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "sale_type"`);
    await queryRunner.query(`DROP TYPE "sale_type"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
  }
}
