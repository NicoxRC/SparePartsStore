import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStockToProducts1781146495250 implements MigrationInterface {
  name = 'AddStockToProducts1781146495250';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'stock',
        type: 'int',
        isNullable: false,
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('products', 'stock');
  }
}
