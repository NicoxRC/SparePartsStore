import { z } from 'zod';

export const productFormSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(1, 'La referencia es obligatoria.')
    .max(100, 'Máximo 100 caracteres.'),
  description: z
    .string()
    .trim()
    .min(1, 'La descripción es obligatoria.')
    .max(255, 'Máximo 255 caracteres.'),
  salePrice: z.coerce
    .number({ message: 'El precio debe ser un número.' })
    .positive('El precio debe ser mayor a 0.')
    .int('El precio debe ser un número entero.'),
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
