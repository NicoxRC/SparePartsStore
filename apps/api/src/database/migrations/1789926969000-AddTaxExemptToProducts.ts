import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

// Every existing product keeps charging IVA — `default: false` backfills
// every current row as "not exempt" with no separate UPDATE needed, same
// as AddMustChangePasswordToUsers's boolean-column approach.
export class AddTaxExemptToProducts1789926969000 implements MigrationInterface {
  name = 'AddTaxExemptToProducts1789926969000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'tax_exempt',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('products', 'tax_exempt');
  }
}
