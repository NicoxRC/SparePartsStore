import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the "Consumidor final" customer (DIAN's generic 222222222222) that
 * a sale is invoiced to when the buyer doesn't give their data. Dataico
 * still requires an address and an email, so it carries the store's own
 * (the same ones printed on the receipt, see the client's BUSINESS_PROFILE).
 * Skipped if a customer with that identification already exists. `down()`
 * leaves the row alone — invoices may already point at it.
 */
export class AddFinalConsumerCustomer1789930000006 implements MigrationInterface {
  name = 'AddFinalConsumerCustomer1789930000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "customers" (
        "identification_type", "identification", "party_type",
        "first_name", "family_name", "tax_level_code", "country_code",
        "department", "city", "address_line", "email", "responsable_iva"
      )
      SELECT
        'CC', '222222222222', 'PERSONA_NATURAL',
        'CONSUMIDOR', 'FINAL', 'SIMPLIFICADO', 'CO',
        '52', '001', 'CR 16 13 06 AV JULIAN BUCHELLI',
        'casadelosrepuestos@hotmail.com', false
      WHERE NOT EXISTS (
        SELECT 1 FROM "customers"
        WHERE "identification" = '222222222222' AND "deleted_at" IS NULL
      )
    `);
  }

  public async down(): Promise<void> {
    // Intentionally a no-op — see the class docstring.
  }
}
