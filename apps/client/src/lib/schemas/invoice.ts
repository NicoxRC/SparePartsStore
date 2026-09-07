import { z } from 'zod';

export const invoiceItemFormSchema = z.object({
  productId: z.string().min(1, 'Selecciona un producto.'),
  reference: z.string(),
  description: z.string(),
  price: z.number(),
  stock: z.number(),
  quantity: z.coerce.number().int().min(1, 'Cantidad mínima 1.'),
  taxRate: z.coerce.number().min(0, 'Debe ser mayor o igual a 0.'),
});

export const invoiceFormSchema = z.object({
  number: z.coerce.number().int().min(1, 'El número es obligatorio.'),
  issueDate: z.string().min(1, 'La fecha de emisión es obligatoria.'),
  paymentDate: z.string().min(1, 'La fecha de pago es obligatoria.'),
  paymentMeans: z.string().min(1, 'El medio de pago es obligatorio.'),
  paymentMeansType: z.string().min(1, 'El tipo de pago es obligatorio.'),
  orderReference: z.string().optional().or(z.literal('')),

  customerIdentificationType: z.string().min(1, 'Obligatorio.'),
  customerIdentification: z.string().min(1, 'Obligatorio.'),
  customerPartyType: z.string().min(1, 'Obligatorio.'),
  customerTaxLevelCode: z.string().min(1, 'Obligatorio.'),
  customerRegimen: z.string().optional().or(z.literal('')),
  customerCompanyName: z.string().optional().or(z.literal('')),
  customerFirstName: z.string().optional().or(z.literal('')),
  customerFamilyName: z.string().optional().or(z.literal('')),
  customerCountryCode: z.string().min(1, 'Obligatorio.'),
  customerDepartment: z
    .string()
    .min(1, 'Código DANE de departamento obligatorio.'),
  customerCity: z.string().min(1, 'Código DANE de ciudad obligatorio.'),
  customerAddressLine: z.string().min(1, 'La dirección es obligatoria.'),
  customerEmail: z.string().email('Correo inválido.'),

  items: z.array(invoiceItemFormSchema).min(1, 'Agrega al menos un producto.'),
  notes: z.string().optional().or(z.literal('')),
});

/** Shape of the raw form fields (before Zod coercion). */
export type InvoiceFormInput = z.input<typeof invoiceFormSchema>;

/** Shape after validation/coercion. */
export type InvoiceFormValues = z.output<typeof invoiceFormSchema>;
