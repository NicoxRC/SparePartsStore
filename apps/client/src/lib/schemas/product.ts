import { z } from 'zod';

export const productFormSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(1, 'La referencia es obligatoria.')
    .max(100, 'Máximo 100 caracteres.')
    .toUpperCase(),
  description: z
    .string()
    .trim()
    .min(1, 'La descripción es obligatoria.')
    .max(255, 'Máximo 255 caracteres.')
    .transform((value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()),
  salePrice: z.coerce
    .number({ message: 'El precio debe ser un número.' })
    .int('El precio debe ser un número entero.')
    .min(500, 'El precio mínimo es $500.'),
  saleType: z.enum(['normal', 'neto'], {
    message: 'El tipo de venta es obligatorio.',
  }),
  stock: z.coerce
    .number({ message: 'El stock debe ser un número.' })
    .int('El stock debe ser un número entero.')
    .min(0, 'El stock no puede ser negativo.'),
  departmentId: z.string().min(1, 'El departamento es obligatorio.'),
  groupId: z.string().min(1, 'El grupo es obligatorio.'),
  brandId: z.string().min(1, 'La marca es obligatoria.'),
});

/** Shape of the raw form fields (before Zod coercion, e.g. salePrice as string). */
export type ProductFormInput = z.input<typeof productFormSchema>;

/** Shape after validation/coercion (e.g. salePrice as number). */
export type ProductFormValues = z.output<typeof productFormSchema>;

/**
 * Quick-create variant used from the product-search dropdown on the invoice
 * forms — same fields/messages as the full product form, minus `stock`
 * (there's no separate "initial stock" concept here) plus `quantity`, the
 * amount being sold right now. The caller sends `quantity` as `stock` when
 * creating the product, then pre-fills the same quantity on the new line item.
 */
export const quickCreateProductSchema = productFormSchema.omit({ stock: true }).extend({
  quantity: z.coerce
    .number({ message: 'La cantidad debe ser un número.' })
    .int('La cantidad debe ser un número entero.')
    .min(1, 'La cantidad mínima es 1.'),
});

/** Shape of the raw form fields (before Zod coercion). */
export type QuickCreateProductInput = z.input<typeof quickCreateProductSchema>;

/** Shape after validation/coercion. */
export type QuickCreateProductValues = z.output<typeof quickCreateProductSchema>;
