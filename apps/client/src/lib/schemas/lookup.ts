import { z } from 'zod';

export const lookupFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'El código es obligatorio.')
    .max(50, 'Máximo 50 caracteres.'),
  name: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio.')
    .max(150, 'Máximo 150 caracteres.'),
});

export type LookupFormInput = z.input<typeof lookupFormSchema>;
export type LookupFormValues = z.output<typeof lookupFormSchema>;
