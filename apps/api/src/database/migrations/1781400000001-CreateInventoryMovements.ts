import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryMovements1781400000001
  implements MigrationInterface
{
  name = 'CreateInventoryMovements1781400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "movement_type" AS ENUM ('initial', 'purchase', 'adjustment')`,
    );

    await queryRunner.query(`
      CREATE TABLE "inventory_movements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "movement_type" "movement_type" NOT NULL,
        "quantity" integer NOT NULL,
        "notes" character varying(500),
        "created_by_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_movements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inventory_movements_product"
          FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inventory_movements_user"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_movements_product_id" ON "inventory_movements" ("product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_movements_created_at" ON "inventory_movements" ("created_at" DESC)`,
    );

    // Seed initial movements from existing product stock > 0
    await queryRunner.query(`
      INSERT INTO "inventory_movements" ("id", "product_id", "movement_type", "quantity", "created_by_id", "created_at")
      SELECT gen_random_uuid(), p.id, 'initial', p.stock, NULL, p.created_at
      FROM products p
      WHERE p.stock > 0 AND p.deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "inventory_movements"`);
    await queryRunner.query(`DROP TYPE "movement_type"`);
  }
}
