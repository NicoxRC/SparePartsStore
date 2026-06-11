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
