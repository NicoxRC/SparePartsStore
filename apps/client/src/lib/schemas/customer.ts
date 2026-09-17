import { z } from 'zod';

export const customerFormSchema = z.object({
  identificationType: z.string().min(1, 'Obligatorio.'),
  identification: z.string().min(1, 'Obligatorio.'),
  identificationDv: z.string().optional().or(z.literal('')),
  partyType: z.string().min(1, 'Obligatorio.'),
  taxLevelCode: z.string().optional().or(z.literal('')),
  regimen: z.string().optional().or(z.literal('')),
  companyName: z.string().optional().or(z.literal('')),
  firstName: z.string().optional().or(z.literal('')),
  familyName: z.string().optional().or(z.literal('')),
  countryCode: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  addressLine: z.string().optional().or(z.literal('')),
  email: z.string().email('Correo inválido.'),
  phone: z.string().optional().or(z.literal('')),
  responsableIva: z.boolean().optional(),
});

/** Shape of the raw form fields. */
export type CustomerFormInput = z.input<typeof customerFormSchema>;
export type CustomerFormValues = z.output<typeof customerFormSchema>;
