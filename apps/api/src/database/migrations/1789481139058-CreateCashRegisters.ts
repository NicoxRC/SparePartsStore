import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCashRegisters1789481139058 implements MigrationInterface {
  name = 'CreateCashRegisters1789481139058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cash_registers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "register_date" date NOT NULL,
        "opened_at" TIMESTAMPTZ NOT NULL,
        "opened_by_id" uuid,
        "closed_at" TIMESTAMPTZ,
        "closed_by_id" uuid,
        "total_amount" numeric(12,2),
        CONSTRAINT "PK_cash_registers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cash_registers_opened_by"
          FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_cash_registers_closed_by"
          FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "cash_registers_register_date_unique" ON "cash_registers" ("register_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cash_registers"`);
  }
}
