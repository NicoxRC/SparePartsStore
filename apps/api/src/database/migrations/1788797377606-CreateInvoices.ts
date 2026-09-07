import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvoices1788797377606 implements MigrationInterface {
  name = 'CreateInvoices1788797377606';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "number" integer NOT NULL,
        "prefix" character varying(20) NOT NULL,
        "dataico_number" character varying(50),
        "resolution_number" character varying(50) NOT NULL,
        "customer_identification_type" character varying(20) NOT NULL,
        "customer_identification" character varying(50) NOT NULL,
        "customer_company_name" character varying(255),
        "customer_first_name" character varying(100),
        "customer_family_name" character varying(100),
        "customer_email" character varying(255) NOT NULL,
        "issue_date" date NOT NULL,
        "payment_date" date,
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
        CONSTRAINT "PK_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invoices_user"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_created_at" ON "invoices" ("created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_customer_identification" ON "invoices" ("customer_identification")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "invoices"`);
  }
}
