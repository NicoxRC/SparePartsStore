import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayrollEntries1788813010647 implements MigrationInterface {
  name = 'CreatePayrollEntries1788813010647';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payroll_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "number" integer NOT NULL,
        "prefix" character varying(20) NOT NULL,
        "employee_identification" character varying(50) NOT NULL,
        "employee_name" character varying(255) NOT NULL,
        "employee_payload" jsonb NOT NULL,
        "salary" numeric(14,2) NOT NULL,
        "periodicity" character varying(20) NOT NULL,
        "initial_settlement_date" date NOT NULL,
        "final_settlement_date" date NOT NULL,
        "issue_date" date NOT NULL,
        "payment_date" date NOT NULL,
        "accruals" jsonb NOT NULL,
        "deductions" jsonb NOT NULL,
        "notes" jsonb,
        "dian_status" character varying(50),
        "cufe" character varying(255),
        "dataico_uuid" character varying(100),
        "xml_url" character varying(500),
        "pdf_url" character varying(500),
        "request_payload" jsonb NOT NULL,
        "response_payload" jsonb,
        "created_by_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payroll_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payroll_entries_user"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_payroll_entries_created_at" ON "payroll_entries" ("created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payroll_entries"`);
  }
}
