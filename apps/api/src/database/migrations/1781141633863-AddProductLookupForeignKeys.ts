import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddProductLookupForeignKeys1781141633863
  implements MigrationInterface
{
  name = 'AddProductLookupForeignKeys1781141633863';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1 — backfill lookup tables from existing distinct values
    // (no `deleted_at IS NULL` filter, per docs/Schema.md §9.2 option (a),
    // so soft-deleted products' department/group/line values also get a
    // backfill target).
    await queryRunner.query(`
      INSERT INTO "departments" ("id", "code", "name", "created_at", "updated_at")
      SELECT gen_random_uuid(), d.department, d.department, now(), now()
      FROM (SELECT DISTINCT "department" FROM "products") d
    `);

    await queryRunner.query(`
      INSERT INTO "product_groups" ("id", "code", "name", "created_at", "updated_at")
      SELECT gen_random_uuid(), g."group", g."group", now(), now()
      FROM (SELECT DISTINCT "group" FROM "products") g
    `);

    await queryRunner.query(`
      INSERT INTO "brands" ("id", "code", "name", "created_at", "updated_at")
      SELECT gen_random_uuid(), l.line, l.line, now(), now()
      FROM (SELECT DISTINCT "line" FROM "products") l
    `);

    // Step 2 — add nullable FK columns
    await queryRunner.addColumns('products', [
      new TableColumn({
        name: 'department_id',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'group_id',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'brand_id',
        type: 'uuid',
        isNullable: true,
      }),
    ]);

    // Populate the new FK columns by matching old string values to the
    // newly inserted lookup rows' `code`.
    await queryRunner.query(`
      UPDATE "products" p
      SET "department_id" = d."id"
      FROM "departments" d
      WHERE d."code" = p."department"
    `);

    await queryRunner.query(`
      UPDATE "products" p
      SET "group_id" = g."id"
      FROM "product_groups" g
      WHERE g."code" = p."group"
    `);

    await queryRunner.query(`
      UPDATE "products" p
      SET "brand_id" = b."id"
      FROM "brands" b
      WHERE b."code" = p."line"
    `);

    // Enforce NOT NULL now that every row is populated
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "department_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "group_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "brand_id" SET NOT NULL`,
    );

    // Add FK constraints
    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        name: 'fk_products_department_id',
        columnNames: ['department_id'],
        referencedTableName: 'departments',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        name: 'fk_products_group_id',
        columnNames: ['group_id'],
        referencedTableName: 'product_groups',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        name: 'fk_products_brand_id',
        columnNames: ['brand_id'],
        referencedTableName: 'brands',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Indexes
    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'products_department_id_idx',
        columnNames: ['department_id'],
      }),
    );
    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'products_group_id_idx',
        columnNames: ['group_id'],
      }),
    );
    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'products_brand_id_idx',
        columnNames: ['brand_id'],
      }),
    );

    // Drop old varchar columns
    await queryRunner.dropColumn('products', 'department');
    await queryRunner.dropColumn('products', 'group');
    await queryRunner.dropColumn('products', 'line');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort reverse: re-add varchar columns, copy `code` back via the
    // FK join, then drop the FK columns/constraints/indexes. Exact
    // round-trip of post-migration `code`/`name` edits is out of scope.
    await queryRunner.addColumns('products', [
      new TableColumn({
        name: 'department',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
      new TableColumn({
        name: 'group',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
      new TableColumn({
        name: 'line',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    ]);

    await queryRunner.query(`
      UPDATE "products" p
      SET "department" = d."code"
      FROM "departments" d
      WHERE d."id" = p."department_id"
    `);

    await queryRunner.query(`
      UPDATE "products" p
      SET "group" = g."code"
      FROM "product_groups" g
      WHERE g."id" = p."group_id"
    `);

    await queryRunner.query(`
      UPDATE "products" p
      SET "line" = b."code"
      FROM "brands" b
      WHERE b."id" = p."brand_id"
    `);

    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "department" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "group" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "line" SET NOT NULL`,
    );

    await queryRunner.dropIndex('products', 'products_brand_id_idx');
    await queryRunner.dropIndex('products', 'products_group_id_idx');
    await queryRunner.dropIndex('products', 'products_department_id_idx');

    await queryRunner.dropForeignKey('products', 'fk_products_brand_id');
    await queryRunner.dropForeignKey('products', 'fk_products_group_id');
    await queryRunner.dropForeignKey('products', 'fk_products_department_id');

    await queryRunner.dropColumn('products', 'brand_id');
    await queryRunner.dropColumn('products', 'group_id');
    await queryRunner.dropColumn('products', 'department_id');
  }
}
