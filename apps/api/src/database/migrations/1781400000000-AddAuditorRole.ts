import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditorRole1781400000000 implements MigrationInterface {
  name = 'AddAuditorRole1781400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'auditor'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing values from an existing enum type.
    // To rollback, recreate the enum without 'auditor' and update all affected rows.
  }
}
