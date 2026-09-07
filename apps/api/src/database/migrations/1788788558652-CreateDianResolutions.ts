import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDianResolutions1788788558652 implements MigrationInterface {
  name = 'CreateDianResolutions1788788558652';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "dian_resolution_document_type" AS ENUM ('invoice', 'support_docs')`,
    );

    await queryRunner.query(`
      CREATE TABLE "dian_resolutions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "document_type" "dian_resolution_document_type" NOT NULL,
        "prefix" character varying(20) NOT NULL,
        "subtype" character varying(50) NOT NULL,
        "resolution_code" character varying(50) NOT NULL,
        "resolution_code_message" character varying(255),
        "resolution_number" character varying(50) NOT NULL,
        "range_start" integer NOT NULL,
        "range_end" integer NOT NULL,
        "technical_key" character varying(255),
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "created_by_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dian_resolutions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dian_resolutions_user"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_dian_resolutions_document_type_prefix" ON "dian_resolutions" ("document_type", "prefix")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dian_resolutions_created_at" ON "dian_resolutions" ("created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "dian_resolutions"`);
    await queryRunner.query(`DROP TYPE "dian_resolution_document_type"`);
  }
}
