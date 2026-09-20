import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSuppliers1789930000000 implements MigrationInterface {
  name = 'CreateSuppliers1789930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "nit" character varying(20) NOT NULL,
        "dv" character varying(2),
        "name" character varying(255) NOT NULL,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_suppliers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_suppliers_created_by"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_suppliers_updated_by"
          FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_suppliers_nit_active" ON "suppliers" ("nit") WHERE "deleted_at" IS NULL`,
    );

    await queryRunner.query(`ALTER TABLE "products" ADD "supplier_id" uuid`);
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD CONSTRAINT "FK_products_supplier"
          FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_products_supplier_id" ON "products" ("supplier_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_products_supplier_id"`);
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_products_supplier"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "supplier_id"`);
    await queryRunner.query(`DROP TABLE "suppliers"`);
  }
}
