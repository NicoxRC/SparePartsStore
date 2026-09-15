import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdentificationDvToCustomers1789487864248 implements MigrationInterface {
  name = 'AddIdentificationDvToCustomers1789487864248';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customers" ADD "identification_dv" character varying(5)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customers" DROP COLUMN "identification_dv"`,
    );
  }
}
