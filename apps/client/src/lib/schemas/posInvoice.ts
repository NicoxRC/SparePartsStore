import { z } from 'zod';

export const posInvoiceItemFormSchema = z.object({
  productId: z.string().min(1, 'Selecciona un producto'),
  reference: z.string(),
  description: z.string(),
  price: z.number(),
  stock: z.number(),
  quantity: z.coerce.number().int().min(1, 'Cantidad mínima 1.'),
  taxRate: z.coerce.number().min(0, 'Debe ser mayor o igual a 0.'),
});

export const posInvoiceFormSchema = z.object({
  number: z.coerce.number().int().min(1, 'El número es obligatorio.'),
  issueDate: z.string().min(1, 'La fecha es obligatoria.'),
  paymentMeansCode: z.string().min(1, 'Obligatorio.'),
  paymentMeansType: z.string().min(1, 'Obligatorio.'),
  customerType: z.string().min(1, 'Obligatorio.'),
  customerIdentificationType: z.string().min(1, 'Obligatorio.'),
  customerIdentification: z.string().min(1, 'Obligatorio.'),
  customerCompanyName: z.string().optional().or(z.literal('')),
  customerFirstName: z.string().optional().or(z.literal('')),
  customerFamilyName: z.string().optional().or(z.literal('')),
  customerPhone: z.string().optional().or(z.literal('')),
  customerEmail: z.string().email('Correo inválido.'),
  responsableIva: z.boolean(),
  items: z
    .array(posInvoiceItemFormSchema)
    .min(1, 'Agrega al menos un producto.'),
});

/** Shape of the raw form fields (before Zod coercion). */
export type PosInvoiceFormInput = z.input<typeof posInvoiceFormSchema>;

/** Shape after validation/coercion. */
export type PosInvoiceFormValues = z.output<typeof posInvoiceFormSchema>;
