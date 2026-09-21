import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The resolution form no longer asks for (or sends) the code's message, so
 * the optional column is gone. `subtype` stays: it is now always
 * `ELECTRONICO` but the invoice lookup still filters on it. `down()` puts
 * the column back empty — the old texts are not recoverable.
 */
export class RemoveCodeMessageFromDianResolutions1789930000003 implements MigrationInterface {
  name = 'RemoveCodeMessageFromDianResolutions1789930000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dian_resolutions" DROP COLUMN "resolution_code_message"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dian_resolutions" ADD "resolution_code_message" character varying(255)`,
    );
  }
}
