import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateUsersTable1781053132547 implements MigrationInterface {
  name = 'CreateUsersTable1781053132547';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "user_role" AS ENUM ('admin', 'employee')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'email', type: 'varchar', length: '255', isNullable: false },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '60',
            isNullable: false,
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'user_role',
            isNullable: false,
            default: `'employee'`,
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          { name: 'last_login_at', type: 'timestamptz', isNullable: true },
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
      'users',
      new TableForeignKey({
        name: 'fk_users_created_by_id',
        columnNames: ['created_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        name: 'fk_users_updated_by_id',
        columnNames: ['updated_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'users_created_by_id_idx',
        columnNames: ['created_by_id'],
      }),
    );
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'users_updated_by_id_idx',
        columnNames: ['updated_by_id'],
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "users_email_unique_active"
        ON "users" ("email")
        WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "users_email_unique_active"`);
    await queryRunner.dropIndex('users', 'users_updated_by_id_idx');
    await queryRunner.dropIndex('users', 'users_created_by_id_idx');
    await queryRunner.dropForeignKey('users', 'fk_users_updated_by_id');
    await queryRunner.dropForeignKey('users', 'fk_users_created_by_id');
    await queryRunner.dropTable('users');
    await queryRunner.query(`DROP TYPE "user_role"`);
  }
}
