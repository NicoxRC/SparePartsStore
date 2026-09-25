/**
 * DIAN's generic "Consumidor final" identification, for a buyer who doesn't
 * give their data. The API creates that customer and splits its sales over
 * FINAL_CONSUMER_INVOICE_CAP into several invoices — mirrored from
 * apps/api/src/invoicing/invoices/final-consumer.util.ts.
 */
export const FINAL_CONSUMER_IDENTIFICATION = '222222222222';

/** The most one "Consumidor final" invoice may total (IVA included, after discount). */
export const FINAL_CONSUMER_INVOICE_CAP = 235000;

export function isFinalConsumer(identification: string): boolean {
  return identification.trim() === FINAL_CONSUMER_IDENTIFICATION;
}
