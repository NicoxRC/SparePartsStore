import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSaleTypeToProducts1781300000000 implements MigrationInterface {
  name = 'AddSaleTypeToProducts1781300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "sale_type" AS ENUM ('normal', 'neto')`,
    );

    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'sale_type',
        type: 'sale_type',
        isNullable: false,
        default: `'normal'`,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('products', 'sale_type');
    await queryRunner.query(`DROP TYPE "sale_type"`);
  }
}
