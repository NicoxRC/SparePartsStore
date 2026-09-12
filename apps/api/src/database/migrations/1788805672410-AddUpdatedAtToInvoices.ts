import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedAtToInvoices1788805672410 implements MigrationInterface {
  name = 'AddUpdatedAtToInvoices1788805672410';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "updated_at"`);
  }
}
