import { MigrationInterface, QueryRunner } from 'typeorm';

// Hand-written, same reason as the other recent local-enhancement
// migrations — `migration:generate`'s diff against the live local DB
// includes unrelated drift across every other table.
//
// The backfill replicates today's coarse "employee" behavior as every
// existing employee's starting permission set, so this migration is a
// behavioral no-op until an admin actually edits someone's permissions —
// same "backfill to preserve behavior" pattern as CreateInventoryMovements's
// `initial` movement backfill. See common/constants/permission.constant.ts
// for what each code means.
export class AddPermissionsToUsers1789677332319 implements MigrationInterface {
  name = 'AddPermissionsToUsers1789677332319';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "permissions" text[] NOT NULL DEFAULT '{}'`,
    );

    await queryRunner.query(`
      UPDATE "users" SET "permissions" = ARRAY[
        'products.view','products.create','products.update',
        'catalogs.view',
        'inventory.view','inventory.create',
        'customers.view','customers.create','customers.update',
        'quotations.view','quotations.create','quotations.update','quotations.invoice','quotations.cancel',
        'invoices.view','invoices.create','invoices.resend','invoices.refresh',
        'debit_notes.view','debit_notes.create',
        'credit_notes.view','credit_notes.create',
        'third_parties.view',
        'cash_register.view','cash_register.open','cash_register.close',
        'cash_register.movements.create','cash_register.counted_cash.correct'
      ]
      WHERE "role" = 'employee'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "permissions"`);
  }
}
