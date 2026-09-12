import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePosInvoices1788811132453 implements MigrationInterface {
  name = 'CreatePosInvoices1788811132453';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pos_invoices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "number" integer NOT NULL,
        "prefix" character varying(20) NOT NULL,
        "resolution_number" character varying(50) NOT NULL,
        "customer_type" character varying(20) NOT NULL,
        "customer_identification_type" character varying(20) NOT NULL,
        "customer_identification" character varying(50) NOT NULL,
        "customer_company_name" character varying(255),
        "customer_first_name" character varying(100),
        "customer_family_name" character varying(100),
        "customer_phone" character varying(50),
        "customer_email" character varying(255) NOT NULL,
        "issue_date" date NOT NULL,
        "dataico_number" character varying(50),
        "dian_status" character varying(50),
        "cufe" character varying(255),
        "dataico_uuid" character varying(100),
        "xml_url" character varying(500),
        "pdf_url" character varying(500),
        "dian_messages" jsonb,
        "total_amount" numeric(12,2) NOT NULL,
        "request_payload" jsonb NOT NULL,
        "response_payload" jsonb,
        "created_by_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pos_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pos_invoices_user"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_pos_invoices_created_at" ON "pos_invoices" ("created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pos_invoices"`);
  }
}
