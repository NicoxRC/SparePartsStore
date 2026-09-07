import { z } from 'zod';

export const resolutionFormSchema = z
  .object({
    documentType: z.enum(['invoice', 'support_docs'], {
      message: 'El tipo de documento es obligatorio.',
    }),
    prefix: z
      .string()
      .trim()
      .min(1, 'El prefijo es obligatorio.')
      .max(20, 'Máximo 20 caracteres.'),
    subtype: z
      .string()
      .trim()
      .min(1, 'El subtipo es obligatorio.')
      .max(50, 'Máximo 50 caracteres.'),
    resolutionCode: z
      .string()
      .trim()
      .min(1, 'El código es obligatorio.')
      .max(50, 'Máximo 50 caracteres.'),
    resolutionCodeMessage: z.string().trim().max(255).optional().or(z.literal('')),
    resolutionNumber: z
      .string()
      .trim()
      .min(1, 'El número de resolución es obligatorio.')
      .max(50, 'Máximo 50 caracteres.'),
    rangeStart: z.coerce
      .number({ message: 'El rango inicial debe ser un número.' })
      .int()
      .min(0),
    rangeEnd: z.coerce
      .number({ message: 'El rango final debe ser un número.' })
      .int()
      .min(0),
    technicalKey: z.string().trim().max(255).optional().or(z.literal('')),
    startDate: z.string().min(1, 'La fecha de inicio es obligatoria.'),
    endDate: z.string().min(1, 'La fecha de fin es obligatoria.'),
  })
  .refine((data) => data.rangeEnd >= data.rangeStart, {
    message: 'El rango final debe ser mayor o igual al inicial.',
    path: ['rangeEnd'],
  });

/** Shape of the raw form fields (before Zod coercion). */
export type ResolutionFormInput = z.input<typeof resolutionFormSchema>;

/** Shape after validation/coercion. */
export type ResolutionFormValues = z.output<typeof resolutionFormSchema>;
