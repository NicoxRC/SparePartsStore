import { round } from '../../common/utils/invoice-math.util';

export interface InvoicedItem {
  sku: string;
  description: string;
  quantity: number;
  /** Pre-tax, post-discount unit price exactly as it was sent to Dataico. */
  unitPrice: number;
  /** IVA rate charged on the line; 0 when the line carried no tax. */
  taxRate: number;
  /** Pre-tax value of the line (unitPrice × quantity, in centavos). */
  value: number;
  /** IVA of the line as it was sent; worked out from the rate if the payload has none. */
  taxAmount: number;
}

interface StoredItem {
  sku?: unknown;
  description?: unknown;
  quantity?: unknown;
  price?: unknown;
  taxes?: Array<{ tax_rate?: unknown; tax_amount?: unknown }>;
}

/**
 * Reads the lines out of an invoice's stored `request_payload` — the exact
 * body sent to Dataico, so what it holds is the price the customer was
 * actually charged, however the product's price has moved since. Anything
 * malformed is skipped rather than guessed at.
 */
export function readInvoicedItems(requestPayload: unknown): InvoicedItem[] {
  const items = (requestPayload as { invoice?: { items?: unknown } } | null)
    ?.invoice?.items;
  if (!Array.isArray(items)) return [];

  return (items as StoredItem[]).flatMap((item) => {
    if (
      typeof item?.sku !== 'string' ||
      typeof item.price !== 'number' ||
      typeof item.quantity !== 'number'
    ) {
      return [];
    }
    const rate = item.taxes?.[0]?.tax_rate;
    const taxRate = typeof rate === 'number' ? rate : 0;
    const sentTax = item.taxes?.[0]?.tax_amount;
    const value = round(item.price * item.quantity);
    return [
      {
        sku: item.sku,
        description:
          typeof item.description === 'string' ? item.description : '',
        quantity: item.quantity,
        unitPrice: item.price,
        taxRate,
        value,
        taxAmount:
          typeof sentTax === 'number'
            ? sentTax
            : round(value * (taxRate / 100)),
      },
    ];
  });
}
