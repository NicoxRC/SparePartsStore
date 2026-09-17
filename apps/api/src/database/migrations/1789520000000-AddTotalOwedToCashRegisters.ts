import { MigrationInterface, QueryRunner } from 'typeorm';

// Hand-written, same reason as AddIdentificationDvToCustomers/CreateQuotations
// — `migration:generate`'s diff against the live local DB includes
// unrelated drift across every other table.
export class AddTotalOwedToCashRegisters1789520000000 implements MigrationInterface {
  name = 'AddTotalOwedToCashRegisters1789520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cash_registers" ADD "total_owed" numeric(12,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cash_registers" DROP COLUMN "total_owed"`,
    );
  }
}
