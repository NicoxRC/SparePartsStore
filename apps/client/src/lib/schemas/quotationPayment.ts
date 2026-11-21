import { z } from 'zod';

/** The abono form. The upper bound (the pending balance) is per quotation, so it's added by the dialog. */
export function quotationPaymentSchema(balance: number) {
  return z.object({
    amount: z
      .number()
      .min(1, 'Escribe el valor del abono.')
      // Compared in centavos, the same as the API.
      .refine((amount) => Math.round(amount * 100) <= Math.round(balance * 100), {
        message: 'El abono no puede superar el saldo pendiente.',
      }),
    paymentMeans: z.enum(['CASH', 'CARD', 'BANK_TRANSFER']),
    notes: z.string().trim().max(500, 'Máximo 500 caracteres.'),
  });
}

export type QuotationPaymentValues = z.infer<ReturnType<typeof quotationPaymentSchema>>;
