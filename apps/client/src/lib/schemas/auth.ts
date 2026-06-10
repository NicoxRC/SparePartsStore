import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'El correo es obligatorio.')
    .email('Ingresa un correo válido.'),
  password: z
    .string()
    .min(1, 'La contraseña es obligatoria.')
    .min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
