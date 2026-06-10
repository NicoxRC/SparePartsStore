import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateProductsTable1781053132548 implements MigrationInterface {
  name = 'CreateProductsTable1781053132548';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'cost',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'sale_price',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'department',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'group',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'line',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()',
          },
          { name: 'deleted_at', type: 'timestamptz', isNullable: true },
          { name: 'created_by_id', type: 'uuid', isNullable: true },
          { name: 'updated_by_id', type: 'uuid', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        name: 'fk_products_created_by_id',
        columnNames: ['created_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        name: 'fk_products_updated_by_id',
        columnNames: ['updated_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'products_created_by_id_idx',
        columnNames: ['created_by_id'],
      }),
    );
    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'products_updated_by_id_idx',
        columnNames: ['updated_by_id'],
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "products_reference_unique_active"
        ON "products" ("reference")
        WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "products_reference_unique_active"`);
    await queryRunner.dropIndex('products', 'products_updated_by_id_idx');
    await queryRunner.dropIndex('products', 'products_created_by_id_idx');
    await queryRunner.dropForeignKey('products', 'fk_products_updated_by_id');
    await queryRunner.dropForeignKey('products', 'fk_products_created_by_id');
    await queryRunner.dropTable('products');
  }
}
