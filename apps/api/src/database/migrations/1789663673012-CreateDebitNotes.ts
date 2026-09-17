import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDebitNotes1789663673012 implements MigrationInterface {
  name = 'CreateDebitNotes1789663673012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "debit_notes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "number" integer NOT NULL,
        "prefix" character varying(20) NOT NULL,
        "dataico_number" character varying(50),
        "invoice_id" uuid NOT NULL,
        "reason" character varying(30) NOT NULL,
        "issue_date" date NOT NULL,
        "dian_status" character varying(50),
        "customer_status" character varying(50),
        "email_status" character varying(50),
        "cufe" character varying(255),
        "dataico_uuid" character varying(100),
        "xml_url" character varying(500),
        "pdf_url" character varying(500),
        "qr_code" text,
        "dian_messages" jsonb,
        "total_amount" numeric(12,2) NOT NULL,
        "request_payload" jsonb NOT NULL,
        "response_payload" jsonb,
        "created_by_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_debit_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_debit_notes_invoice"
          FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_debit_notes_user"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_debit_notes_created_at" ON "debit_notes" ("created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_debit_notes_invoice_id" ON "debit_notes" ("invoice_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "debit_notes"`);
  }
}
