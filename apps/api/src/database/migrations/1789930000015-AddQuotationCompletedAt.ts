import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Completar" a quotation: the customer paid, but no invoice is issued.
 * A third derived outcome next to `invoiced_at`/`cancelled_at` — see
 * docs/DATABASE.md (`quotations`).
 */
export class AddQuotationCompletedAt1789930000015 implements MigrationInterface {
  name = 'AddQuotationCompletedAt1789930000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quotations" ADD "completed_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quotations" DROP COLUMN "completed_at"`,
    );
  }
}
