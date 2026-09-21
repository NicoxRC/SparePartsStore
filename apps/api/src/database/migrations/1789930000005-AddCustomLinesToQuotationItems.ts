import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A quotation line can be a one-off typed on the quotation (description +
 * price) instead of a catalog product: `product_id` becomes nullable and
 * `description` carries the line's name. `down()` drops the one-off lines —
 * they can't exist without the nullable product.
 */
export class AddCustomLinesToQuotationItems1789930000005 implements MigrationInterface {
  name = 'AddCustomLinesToQuotationItems1789930000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quotation_items" ALTER COLUMN "product_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotation_items" ADD "description" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "quotation_items" WHERE "product_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotation_items" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotation_items" ALTER COLUMN "product_id" SET NOT NULL`,
    );
  }
}
