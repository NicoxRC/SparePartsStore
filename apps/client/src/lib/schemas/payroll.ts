import { z } from 'zod';

export const payrollLineItemFormSchema = z.object({
  code: z.string().min(1, 'Selecciona un concepto'),
  amount: z.coerce.number().min(0, 'Debe ser mayor o igual a 0.'),
  days: z.coerce.number().optional(),
  percentage: z.coerce.number().optional(),
  description: z.string().optional().or(z.literal('')),
});

export const payrollEmployeeFormSchema = z.object({
  identificationType: z.string().min(1, 'Obligatorio.'),
  identification: z.string().min(1, 'Obligatorio.'),
  firstName: z.string().min(1, 'Obligatorio.'),
  otherNames: z.string().optional().or(z.literal('')),
  lastName: z.string().min(1, 'Obligatorio.'),
  secondLastName: z.string().optional().or(z.literal('')),
  email: z.string().email('Correo inválido.'),
  integralSalary: z.boolean(),
  highRisk: z.boolean(),
  startDate: z.string().min(1, 'La fecha es obligatoria.'),
  workerType: z.string().min(1, 'Obligatorio.'),
  subCode: z.string().min(1, 'Obligatorio.'),
  paymentMeans: z.string().min(1, 'Obligatorio.'),
  contractType: z.string().min(1, 'Obligatorio.'),
  addressLine: z.string().min(1, 'Obligatorio.'),
  addressCity: z.string().min(1, 'Obligatorio (código DANE).'),
  addressDepartment: z.string().min(1, 'Obligatorio (código DANE).'),
});

export const payrollEntryFormSchema = z.object({
  prefix: z.string().min(1, 'Obligatorio.'),
  number: z.coerce.number().int().min(1, 'El número es obligatorio.'),
  salary: z.coerce.number().min(0, 'Debe ser mayor o igual a 0.'),
  periodicity: z.string().min(1, 'Obligatorio.'),
  initialSettlementDate: z.string().min(1, 'La fecha es obligatoria.'),
  finalSettlementDate: z.string().min(1, 'La fecha es obligatoria.'),
  issueDate: z.string().min(1, 'La fecha es obligatoria.'),
  paymentDate: z.string().min(1, 'La fecha es obligatoria.'),
  notes: z.string().optional().or(z.literal('')),
  accruals: z
    .array(payrollLineItemFormSchema)
    .min(1, 'Agrega al menos un devengo.'),
  deductions: z.array(payrollLineItemFormSchema),
  employee: payrollEmployeeFormSchema,
});

/** Shape of the raw form fields (before Zod coercion). */
export type PayrollEntryFormInput = z.input<typeof payrollEntryFormSchema>;

/** Shape after validation/coercion. */
export type PayrollEntryFormValues = z.output<typeof payrollEntryFormSchema>;
