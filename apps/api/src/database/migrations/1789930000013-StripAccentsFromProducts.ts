import { MigrationInterface, QueryRunner } from 'typeorm';

/** Frozen copy of stripAccents() as of this migration — keeps Ñ. */
function stripAccents(value: string): string {
  return value
    .normalize('NFD')
    .replace(/(?<![nN])̃|[̀-̂̄-ͯ]/g, '')
    .normalize('NFC');
}

/**
 * Removes accents from every existing product's reference and description,
 * matching what product-normalize.util now does on every write. A
 * reference whose accent-free form is already taken by another active
 * product (e.g. both "ÁB" and "AB" exist) is left as is and logged, so the
 * `products_reference_unique_active` index can't fail the deploy; staff
 * fix those by hand. Not reversible: the original accents aren't kept.
 */
export class StripAccentsFromProducts1789930000013 implements MigrationInterface {
  name = 'StripAccentsFromProducts1789930000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const products = (await queryRunner.query(
      `SELECT "id", "reference", "description", "deleted_at" FROM "products"`,
    )) as Array<{
      id: string;
      reference: string;
      description: string;
      deleted_at: Date | null;
    }>;

    const activeReferences = new Set(
      products.filter((p) => !p.deleted_at).map((p) => p.reference),
    );

    for (const product of products) {
      let reference = stripAccents(product.reference);
      const description = stripAccents(product.description);

      if (reference !== product.reference && !product.deleted_at) {
        if (activeReferences.has(reference)) {
          console.warn(
            `StripAccentsFromProducts: kept reference "${product.reference}" — "${reference}" already exists.`,
          );
          reference = product.reference;
        } else {
          activeReferences.delete(product.reference);
          activeReferences.add(reference);
        }
      }

      if (
        reference !== product.reference ||
        description !== product.description
      ) {
        await queryRunner.query(
          `UPDATE "products" SET "reference" = $1, "description" = $2 WHERE "id" = $3`,
          [reference, description, product.id],
        );
      }
    }
  }

  public async down(): Promise<void> {
    // Accents can't be restored — nothing to undo.
  }
}
