import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomers1789222523098 implements MigrationInterface {
  name = 'CreateCustomers1789222523098';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "identification_type" character varying(20) NOT NULL,
        "identification" character varying(50) NOT NULL,
        "party_type" character varying(20) NOT NULL,
        "company_name" character varying(255),
        "first_name" character varying(150),
        "family_name" character varying(150),
        "tax_level_code" character varying(20),
        "regimen" character varying(50),
        "country_code" character varying(2) DEFAULT 'CO',
        "department" character varying(10),
        "city" character varying(10),
        "address_line" character varying(255),
        "email" character varying(255) NOT NULL,
        "phone" character varying(50),
        "responsable_iva" boolean NOT NULL DEFAULT false,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_customers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_customers_created_by"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_customers_updated_by"
          FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "customers_identification_unique_active" ON "customers" ("identification_type", "identification") WHERE "deleted_at" IS NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_customers_created_at" ON "customers" ("created_at" DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_customers_identification" ON "customers" ("identification")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "customers"`);
  }
}
