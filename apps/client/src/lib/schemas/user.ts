import { z } from 'zod';

const email = z
  .string()
  .trim()
  .min(1, 'El correo es obligatorio.')
  .email('Ingresa un correo válido.');

const firstName = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio.')
  .max(100, 'Máximo 100 caracteres.');

const lastName = z
  .string()
  .trim()
  .min(1, 'El apellido es obligatorio.')
  .max(100, 'Máximo 100 caracteres.');

const role = z.enum(['admin', 'employee'], {
  message: 'Selecciona un rol.',
});

export const userFormSchema = z.object({
  email,
  firstName,
  lastName,
  role,
  password: z
    .string()
    .min(1, 'La contraseña es obligatoria.')
    .max(72, 'Máximo 72 caracteres.'),
});

export const userEditFormSchema = z.object({
  email,
  firstName,
  lastName,
  role,
  password: z.string().trim().max(72, 'Máximo 72 caracteres.').optional().or(z.literal('')),
});

/** Shape of the raw form fields. */
export type UserFormInput = z.input<typeof userFormSchema>;
export type UserFormValues = z.output<typeof userFormSchema>;

export type UserEditFormInput = z.input<typeof userEditFormSchema>;
export type UserEditFormValues = z.output<typeof userEditFormSchema>;
