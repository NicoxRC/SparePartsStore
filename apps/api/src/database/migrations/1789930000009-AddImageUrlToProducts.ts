import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One optional photo per product, stored as its Cloudinary URL — the file
 * itself lives in Cloudinary (see CloudinaryService).
 */
export class AddImageUrlToProducts1789930000009 implements MigrationInterface {
  name = 'AddImageUrlToProducts1789930000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "image_url" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "image_url"`);
  }
}
