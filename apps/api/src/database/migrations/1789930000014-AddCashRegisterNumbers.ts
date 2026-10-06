import { MigrationInterface, QueryRunner } from 'typeorm';

const DOCUMENT_TABLES = [
  'invoices',
  'quotations',
  'debit_notes',
  'credit_notes',
] as const;

/**
 * Several tills open at once, each with its own accounts — see
 * docs/GLOSSARY.md ("Caja"). A register stops being "the store's day" and
 * becomes "one till's day" (`register_number`), and every sale document
 * points at the register it was made in instead of being matched to it by
 * date.
 *
 * Behavior-preserving for what already exists: every register so far
 * becomes Caja 1, each existing document is linked to the register of its
 * own store day (the same Bogotá-day match the totals used until now), and
 * every employee who could see caja keeps working — at Caja 1.
 */
export class AddCashRegisterNumbers1789930000014 implements MigrationInterface {
  name = 'AddCashRegisterNumbers1789930000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cash_registers" ADD "register_number" smallint NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(`DROP INDEX "cash_registers_register_date_unique"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "cash_registers_date_number_unique" ON "cash_registers" ("register_date", "register_number")`,
    );

    for (const table of DOCUMENT_TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD "cash_register_id" uuid`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_cash_register"
           FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE SET NULL`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_${table}_cash_register_id" ON "${table}" ("cash_register_id")`,
      );
      await queryRunner.query(`
        UPDATE "${table}" AS doc
           SET "cash_register_id" = register."id"
          FROM "cash_registers" AS register
         WHERE register."register_date" = (doc."created_at" AT TIME ZONE 'America/Bogota')::date
      `);
    }

    await queryRunner.query(`
      UPDATE "users"
         SET "permissions" = array_append("permissions", 'cash_register.box_1')
       WHERE 'cash_register.view' = ANY("permissions")
         AND NOT ('cash_register.box_1' = ANY("permissions"))
    `);
  }

  /** Only possible while no day has a second till: two registers on the
   * same date can't go back under the one-per-day index. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users"
         SET "permissions" = array_remove(array_remove("permissions", 'cash_register.box_1'), 'cash_register.box_2')
    `);

    for (const table of DOCUMENT_TABLES) {
      await queryRunner.query(`DROP INDEX "IDX_${table}_cash_register_id"`);
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT "FK_${table}_cash_register"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN "cash_register_id"`,
      );
    }

    await queryRunner.query(`DROP INDEX "cash_registers_date_number_unique"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "cash_registers_register_date_unique" ON "cash_registers" ("register_date")`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_registers" DROP COLUMN "register_number"`,
    );
  }
}
