import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Notes on a quotation — a history staff add to ("se hizo un abono de…",
 * anything). Never edited; an admin removes one by soft delete. See
 * docs/DATABASE.md (`quotation_notes`).
 */
export class CreateQuotationNotes1789930000018 implements MigrationInterface {
  name = 'CreateQuotationNotes1789930000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "quotation_notes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "quotation_id" uuid NOT NULL,
        "text" text NOT NULL,
        "created_by_id" uuid,
        CONSTRAINT "PK_quotation_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quotation_notes_quotation" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_quotation_notes_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quotation_notes_quotation_id" ON "quotation_notes" ("quotation_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_quotation_notes_quotation_id"`,
    );
    await queryRunner.query(`DROP TABLE "quotation_notes"`);
  }
}
