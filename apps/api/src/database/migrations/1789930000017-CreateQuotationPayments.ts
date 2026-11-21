import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cartera: "abonos" — partial payments toward an open quotation. Voided,
 * never deleted (`voided_at`). See docs/DATABASE.md (`quotation_payments`).
 *
 * No permission backfill: the cartera shows what every customer owes, so
 * an admin grants `portfolio.*` deliberately (same as `purchase_imports.*`).
 */
export class CreateQuotationPayments1789930000017 implements MigrationInterface {
  name = 'CreateQuotationPayments1789930000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "quotation_payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "quotation_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "payment_means" character varying(20) NOT NULL,
        "notes" text,
        "voided_at" TIMESTAMP WITH TIME ZONE,
        "voided_by_id" uuid,
        "created_by_id" uuid,
        CONSTRAINT "PK_quotation_payments" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_quotation_payments_amount_positive" CHECK ("amount" > 0),
        CONSTRAINT "FK_quotation_payments_quotation" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_quotation_payments_voided_by" FOREIGN KEY ("voided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_quotation_payments_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quotation_payments_quotation_id" ON "quotation_payments" ("quotation_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_quotation_payments_quotation_id"`,
    );
    await queryRunner.query(`DROP TABLE "quotation_payments"`);
  }
}
