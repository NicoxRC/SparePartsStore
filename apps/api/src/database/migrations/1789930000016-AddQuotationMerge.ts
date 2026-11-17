import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Unir cotizaciones": several open quotations of one customer folded into
 * the oldest one. A fourth derived outcome next to `invoiced_at`/
 * `completed_at`/`cancelled_at`, plus a link to the quotation it went into —
 * see docs/DATABASE.md (`quotations`).
 *
 * Employees who could already edit a quotation's items get the new
 * `quotations.merge` permission too, so nothing they could do changes.
 */
export class AddQuotationMerge1789930000016 implements MigrationInterface {
  name = 'AddQuotationMerge1789930000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quotations" ADD "merged_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotations" ADD "merged_into_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotations" ADD CONSTRAINT "FK_quotations_merged_into" FOREIGN KEY ("merged_into_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `UPDATE "users"
         SET "permissions" = array_append("permissions", 'quotations.merge')
       WHERE 'quotations.update' = ANY("permissions")
         AND NOT ('quotations.merge' = ANY("permissions"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "permissions" = array_remove("permissions", 'quotations.merge')`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotations" DROP CONSTRAINT "FK_quotations_merged_into"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotations" DROP COLUMN "merged_into_id"`,
    );
    await queryRunner.query(`ALTER TABLE "quotations" DROP COLUMN "merged_at"`);
  }
}
