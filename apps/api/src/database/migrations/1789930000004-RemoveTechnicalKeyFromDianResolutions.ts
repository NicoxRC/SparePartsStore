import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The resolution form no longer asks for the technical key, and the numbering
 * sync no longer sends `technical-key` — resolutions were already being
 * accepted by Dataico without it (the field was optional and left empty).
 * `down()` re-adds the empty nullable column; any stored keys are not
 * recoverable.
 */
export class RemoveTechnicalKeyFromDianResolutions1789930000004 implements MigrationInterface {
  name = 'RemoveTechnicalKeyFromDianResolutions1789930000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dian_resolutions" DROP COLUMN "technical_key"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dian_resolutions" ADD "technical_key" character varying(255)`,
    );
  }
}
