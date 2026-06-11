import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateProductLookupTables1781141633862
  implements MigrationInterface
{
  name = 'CreateProductLookupTables1781141633862';

  private readonly tables = ['departments', 'product_groups', 'brands'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.createTable(
        new Table({
          name: table,
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'code',
              type: 'varchar',
              length: '50',
              isNullable: false,
            },
            {
              name: 'name',
              type: 'varchar',
              length: '150',
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
        table,
        new TableForeignKey({
          name: `fk_${table}_created_by_id`,
          columnNames: ['created_by_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );

      await queryRunner.createForeignKey(
        table,
        new TableForeignKey({
          name: `fk_${table}_updated_by_id`,
          columnNames: ['updated_by_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );

      await queryRunner.createIndex(
        table,
        new TableIndex({
          name: `${table}_created_by_id_idx`,
          columnNames: ['created_by_id'],
        }),
      );
      await queryRunner.createIndex(
        table,
        new TableIndex({
          name: `${table}_updated_by_id_idx`,
          columnNames: ['updated_by_id'],
        }),
      );

      await queryRunner.query(`
        CREATE UNIQUE INDEX "${table}_code_unique_active"
          ON "${table}" ("code")
          WHERE "deleted_at" IS NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...this.tables].reverse()) {
      await queryRunner.query(`DROP INDEX "${table}_code_unique_active"`);
      await queryRunner.dropIndex(table, `${table}_updated_by_id_idx`);
      await queryRunner.dropIndex(table, `${table}_created_by_id_idx`);
      await queryRunner.dropForeignKey(table, `fk_${table}_updated_by_id`);
      await queryRunner.dropForeignKey(table, `fk_${table}_created_by_id`);
      await queryRunner.dropTable(table);
    }
  }
}
