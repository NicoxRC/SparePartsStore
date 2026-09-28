import { z } from 'zod';

/** Mirrors the server's CreateProductDto rule: an integer of at least $500. */
export const MIN_SALE_PRICE = 500;

const referenceField = z
  .string()
  .trim()
  .min(1, 'La referencia es obligatoria.')
  .max(100, 'Máximo 100 caracteres.');

const descriptionField = z
  .string()
  .trim()
  .min(1, 'La descripción es obligatoria.')
  .max(255, 'Máximo 255 caracteres.');

// The quantity input is a string in the form; it is converted, then validated as an int.
const quantityField = z
  .string()
  .trim()
  .min(1, 'La cantidad es obligatoria.')
  .transform((value) => Number(value))
  .pipe(
    z
      .number({ message: 'La cantidad debe ser un número.' })
      .int('La cantidad debe ser un número entero.')
      .min(1, 'La cantidad mínima es 1.'),
  );

/** The three fields a reviewer edits inline on a draft line (saved one at a time, on blur). */
export const purchaseImportLineSchema = z.object({
  reference: referenceField,
  description: descriptionField,
  quantity: quantityField,
});

export type PurchaseImportLineInput = z.input<typeof purchaseImportLineSchema>;
export type PurchaseImportLineValues = z.output<typeof purchaseImportLineSchema>;

/** Mirrors the server's purchase-import rule for a typed cost: an integer of at least $1. */
export const MIN_COST = 1;

/** One money amount typed on a draft line: the sale price or the cost. */
export function draftAmountSchema(min: number, noun: 'precio' | 'costo') {
  return z.object({
    amount: z
      .number({ message: `El ${noun} debe ser un número.` })
      .int(`El ${noun} debe ser un número entero.`)
      .min(min, `El ${noun} mínimo es $${min}.`),
  });
}

export type DraftAmountValues = z.infer<ReturnType<typeof draftAmountSchema>>;

export const supplierRenameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio.')
    .max(255, 'Máximo 255 caracteres.'),
});

export type SupplierRenameValues = z.infer<typeof supplierRenameSchema>;

/** Bulk department/group/brand for the new lines — at least one must be chosen. */
export const applyClassificationSchema = z
  .object({
    departmentId: z.string(),
    groupId: z.string(),
    brandId: z.string(),
  })
  .refine((values) => values.departmentId || values.groupId || values.brandId, {
    message: 'Elige al menos un dato para aplicar.',
    path: ['departmentId'],
  });

export type ApplyClassificationValues = z.infer<typeof applyClassificationSchema>;
