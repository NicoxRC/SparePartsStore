import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseImports1789930000001 implements MigrationInterface {
  name = 'CreatePurchaseImports1789930000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "purchase_imports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "supplier_id" uuid NOT NULL,
        "invoice_number" character varying(50) NOT NULL,
        "issue_date" date NOT NULL,
        "cufe" character varying(128),
        "source_filename" character varying(255) NOT NULL,
        "confirmed_at" TIMESTAMPTZ,
        "discarded_at" TIMESTAMPTZ,
        "confirmed_by_id" uuid,
        "discarded_by_id" uuid,
        "created_by_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_imports" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_purchase_imports_single_outcome"
          CHECK ("confirmed_at" IS NULL OR "discarded_at" IS NULL),
        CONSTRAINT "FK_purchase_imports_supplier"
          FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_imports_confirmed_by"
          FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_purchase_imports_discarded_by"
          FOREIGN KEY ("discarded_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_purchase_imports_created_by"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Duplicate protection, partial so a discarded import frees the invoice
    // for re-upload. The CUFE index also catches the same document arriving
    // bare vs. wrapped in an AttachedDocument.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_purchase_imports_supplier_invoice_active"
        ON "purchase_imports" ("supplier_id", "invoice_number")
        WHERE "discarded_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_purchase_imports_cufe_active"
        ON "purchase_imports" ("cufe")
        WHERE "cufe" IS NOT NULL AND "discarded_at" IS NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_imports_created_at" ON "purchase_imports" ("created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_imports_supplier_id" ON "purchase_imports" ("supplier_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "purchase_import_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "purchase_import_id" uuid NOT NULL,
        "line_number" integer NOT NULL,
        "reference" character varying(100),
        "description" character varying(255),
        "xml_quantity" numeric(14,4) NOT NULL,
        "quantity" integer,
        "product_id" uuid,
        "match_type" character varying(10),
        "new_department_id" uuid,
        "new_group_id" uuid,
        "new_brand_id" uuid,
        "new_sale_price" numeric(12,2),
        "new_tax_exempt" boolean NOT NULL DEFAULT false,
        "created_product" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_import_items" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_purchase_import_items_line"
          UNIQUE ("purchase_import_id", "line_number"),
        CONSTRAINT "CHK_purchase_import_items_match_type"
          CHECK ("match_type" IS NULL OR "match_type" IN ('exact', 'manual')),
        CONSTRAINT "CHK_purchase_import_items_match_needs_product"
          CHECK ("match_type" IS NULL OR "product_id" IS NOT NULL),
        CONSTRAINT "FK_purchase_import_items_import"
          FOREIGN KEY ("purchase_import_id") REFERENCES "purchase_imports"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_purchase_import_items_product"
          FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_import_items_department"
          FOREIGN KEY ("new_department_id") REFERENCES "departments"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_import_items_group"
          FOREIGN KEY ("new_group_id") REFERENCES "product_groups"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_import_items_brand"
          FOREIGN KEY ("new_brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_import_items_import" ON "purchase_import_items" ("purchase_import_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_import_items_product" ON "purchase_import_items" ("product_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "purchase_import_items"`);
    await queryRunner.query(`DROP TABLE "purchase_imports"`);
  }
}
