import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMustChangePasswordToUsers1781195451901
  implements MigrationInterface
{
  name = 'AddMustChangePasswordToUsers1781195451901';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'must_change_password',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'must_change_password');
  }
}
