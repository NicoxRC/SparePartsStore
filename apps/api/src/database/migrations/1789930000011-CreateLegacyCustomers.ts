import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Customers from the store's old system, kept apart from `customers` until
 * staff complete their data — see LegacyCustomer. Filled by
 * `npm run seed:legacy-customers`, not here: the rows are real people's
 * data and don't belong in the repository.
 */
export class CreateLegacyCustomers1789930000011 implements MigrationInterface {
  name = 'CreateLegacyCustomers1789930000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "legacy_customers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "identification_type" character varying(20) NOT NULL,
        "identification" character varying(50) NOT NULL,
        "company_name" character varying(255),
        "first_name" character varying(150),
        "family_name" character varying(150),
        "second_last_name" character varying(150),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_legacy_customers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_legacy_customers_identification" UNIQUE ("identification")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "legacy_customers"`);
  }
}
