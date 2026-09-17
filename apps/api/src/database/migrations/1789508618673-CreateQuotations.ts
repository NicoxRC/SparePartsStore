import { MigrationInterface, QueryRunner } from 'typeorm';

// Hand-written, not `migration:generate` output — the raw diff against
// the live local DB included unrelated drift across every other table
// (stale created_at/updated_at column types, FK constraint name churn),
// same reason as CreateCashRegisters/AddIdentificationDvToCustomers (see
// docs/DATABASE.md's migration log).
export class CreateQuotations1789508618673 implements MigrationInterface {
  name = 'CreateQuotations1789508618673';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "quotations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "number" integer NOT NULL,
        "customer_identification_type" character varying(20) NOT NULL,
        "customer_identification" character varying(50) NOT NULL,
        "customer_identification_dv" character varying(5),
        "customer_party_type" character varying(30) NOT NULL,
        "customer_tax_level_code" character varying(30) NOT NULL,
        "customer_regimen" character varying(30),
        "customer_company_name" character varying(255),
        "customer_first_name" character varying(100),
        "customer_family_name" character varying(100),
        "customer_country_code" character varying(5) NOT NULL,
        "customer_department" character varying(10) NOT NULL,
        "customer_city" character varying(10) NOT NULL,
        "customer_address_line" character varying(255) NOT NULL,
        "customer_email" character varying(255) NOT NULL,
        "customer_phone" character varying(30),
        "notes" text,
        "total_amount" numeric(12,2) NOT NULL,
        "invoiced_at" TIMESTAMPTZ,
        "invoice_id" uuid,
        "cancelled_at" TIMESTAMPTZ,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_quotations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quotations_invoice"
          FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_quotations_created_by"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_quotations_updated_by"
          FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_quotations_created_at" ON "quotations" ("created_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "quotation_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "quotation_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "tax_rate" numeric(5,2) NOT NULL,
        "discount" numeric(12,2),
        "unit_price" numeric(12,2) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quotation_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quotation_items_quotation"
          FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_quotation_items_product"
          FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_quotation_items_quotation_id" ON "quotation_items" ("quotation_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "quotation_items"`);
    await queryRunner.query(`DROP TABLE "quotations"`);
  }
}
