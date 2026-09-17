import { z } from 'zod';

export const invoiceItemFormSchema = z.object({
  productId: z.string().min(1, 'Selecciona un producto.'),
  reference: z.string(),
  description: z.string(),
  price: z.number(),
  stock: z.number(),
  quantity: z.coerce.number().int().min(1, 'Cantidad mínima 1.'),
  taxRate: z.coerce.number().min(0, 'Debe ser mayor o igual a 0.'),
  // Fixed COP amount, not a percentage — taken off this line's pre-tax
  // subtotal before IVA is calculated. Local-only, see create-invoice-item.dto.ts.
  discount: z.coerce.number().min(0, 'Debe ser mayor o igual a 0.').optional(),
});

// Kept as a plain object schema, separate from the `.superRefine()`-wrapped
// one below, purely so InvoiceFormInput/InvoiceFormValues are derived from
// it directly — deriving them from the ZodEffects returned by
// `.superRefine()` loses precise nested-field types (e.g. `items` collapses
// to `unknown[]`), which `tsc -b`'s stricter project-reference build catches
// even though it isn't visible in a plain `tsc --noEmit` run.
const invoiceFormObjectSchema = z.object({
  // No issueDate: always today (the store's cash-register day), never
  // asked. paymentDate is only meaningful/asked when paying on credit —
  // enforced below with .superRefine, since it's otherwise optional.
  paymentDate: z.string().optional().or(z.literal('')),
  paymentMeans: z.string().min(1, 'El medio de pago es obligatorio.'),
  paymentMeansType: z.string().min(1, 'El tipo de pago es obligatorio.'),

  customerIdentificationType: z.string().min(1, 'Obligatorio.'),
  customerIdentification: z.string().min(1, 'Obligatorio.'),
  customerIdentificationDv: z.string().optional().or(z.literal('')),
  customerPhone: z.string().optional().or(z.literal('')),
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

export const invoiceFormSchema = invoiceFormObjectSchema.superRefine((values, ctx) => {
  if (values.paymentMeansType === 'CREDITO' && !values.paymentDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['paymentDate'],
      message: 'La fecha de pago es obligatoria para pagos a crédito.',
    });
  }
});

/** Shape of the raw form fields (before Zod coercion). */
export type InvoiceFormInput = z.input<typeof invoiceFormObjectSchema>;

/** Shape after validation/coercion. */
export type InvoiceFormValues = z.output<typeof invoiceFormObjectSchema>;
