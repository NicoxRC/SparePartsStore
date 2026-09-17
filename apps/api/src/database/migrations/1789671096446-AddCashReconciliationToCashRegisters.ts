import { MigrationInterface, QueryRunner } from 'typeorm';

// Hand-written, same reason as the other recent cash_registers/invoicing
// migrations — `migration:generate`'s diff against the live local DB
// includes unrelated drift across every other table.
export class AddCashReconciliationToCashRegisters1789671096446 implements MigrationInterface {
  name = 'AddCashReconciliationToCashRegisters1789671096446';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cash_registers" ADD "opening_amount" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_registers" ALTER COLUMN "opening_amount" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_registers" ADD "total_cash" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_registers" ADD "total_card" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_registers" ADD "total_transfer" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_registers" ADD "expected_cash" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_registers" ADD "counted_cash" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_registers" ADD "cash_discrepancy" numeric(12,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cash_registers" DROP COLUMN "cash_discrepancy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_registers" DROP COLUMN "counted_cash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_registers" DROP COLUMN "expected_cash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_registers" DROP COLUMN "total_transfer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_registers" DROP COLUMN "total_card"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_registers" DROP COLUMN "total_cash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_registers" DROP COLUMN "opening_amount"`,
    );
  }
}
