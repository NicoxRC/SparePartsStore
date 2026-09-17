import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCashMovements1789671096447 implements MigrationInterface {
  name = 'CreateCashMovements1789671096447';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cash_movements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "cash_register_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "reason" character varying(255) NOT NULL,
        "created_by_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cash_movements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cash_movements_cash_register"
          FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cash_movements_user"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_cash_movements_cash_register_id" ON "cash_movements" ("cash_register_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cash_movements"`);
  }
}
