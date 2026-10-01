import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backstop for withNumberingLock(): the same prefix + number can never be
 * stored twice for an invoice, credit note or debit note.
 */
export class AddUniqueDocumentNumbers1789930000012 implements MigrationInterface {
  name = 'AddUniqueDocumentNumbers1789930000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "UQ_invoices_prefix_number" UNIQUE ("prefix", "number")`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_notes" ADD CONSTRAINT "UQ_credit_notes_prefix_number" UNIQUE ("prefix", "number")`,
    );
    await queryRunner.query(
      `ALTER TABLE "debit_notes" ADD CONSTRAINT "UQ_debit_notes_prefix_number" UNIQUE ("prefix", "number")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "debit_notes" DROP CONSTRAINT "UQ_debit_notes_prefix_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_notes" DROP CONSTRAINT "UQ_credit_notes_prefix_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "UQ_invoices_prefix_number"`,
    );
  }
}
