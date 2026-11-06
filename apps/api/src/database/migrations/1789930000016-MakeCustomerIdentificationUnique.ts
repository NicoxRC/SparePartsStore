import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A customer's document number is unique on its own — the same number can
 * no longer be stored under two document types (e.g. CC and NIT). Fails
 * loudly, listing the numbers, if active customers already share one, so
 * staff can merge or delete them first.
 */
export class MakeCustomerIdentificationUnique1789930000016 implements MigrationInterface {
  name = 'MakeCustomerIdentificationUnique1789930000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates = (await queryRunner.query(
      `SELECT "identification" FROM "customers" WHERE "deleted_at" IS NULL GROUP BY "identification" HAVING COUNT(*) > 1`,
    )) as { identification: string }[];
    if (duplicates.length > 0) {
      throw new Error(
        `Duplicate customer identifications, resolve them first: ${duplicates
          .map((row) => row.identification)
          .join(', ')}`,
      );
    }

    await queryRunner.query(
      `DROP INDEX "customers_identification_unique_active"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "customers_identification_unique_active" ON "customers" ("identification") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "customers_identification_unique_active"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "customers_identification_unique_active" ON "customers" ("identification_type", "identification") WHERE "deleted_at" IS NULL`,
    );
  }
}
