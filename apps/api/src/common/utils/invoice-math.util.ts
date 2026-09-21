export interface LineAmounts {
  /** Pre-tax unit price sent to Dataico (up to 4 decimals, like Dataico's own examples). */
  unitPrice: number;
  /** Pre-tax amount of the line (2 decimals). */
  taxBase: number;
  /** IVA contained in the price (2 decimals): taxBase + taxAmount === total. */
  taxAmount: number;
  /** What the customer pays for the line: exactly price × quantity − discount. */
  total: number;
}

/** Rounds to `decimals` places (money math is done on 2, unit prices on 4). */
export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * The sku sent for a one-off line: a product typed on a sale or quotation
 * that isn't in the catalog. It has no reference of its own, but Dataico
 * wants a sku on every item.
 */
export const CUSTOM_LINE_SKU = 'VARIOS';

/** The store's one standard IVA rate — see resolveTaxRate(). */
export const STANDARD_TAX_RATE = 19;

/**
 * The only source of a line's tax rate, everywhere an invoice/quotation/
 * note item is resolved — never client-supplied anymore (confirmed
 * directly: IVA must always be calculated the same way, not left to
 * whoever's filling out the form). `Product.taxExempt` is the one flag
 * that overrides the standard rate down to 0.
 */
export function resolveTaxRate(product: { taxExempt: boolean }): number {
  return product.taxExempt ? 0 : STANDARD_TAX_RATE;
}

/**
 * Shared by InvoicesService, QuotationsService and the debit/credit notes.
 * `grossUnitPrice` is the product's sale price and it ALREADY INCLUDES IVA
 * (confirmed directly: what the customer pays is just the sum of the prices;
 * IVA is only broken out of it, never added to it). The fixed per-line
 * discount (a flat COP amount, not a percentage) comes off that final,
 * IVA-included amount. What's left is unwrapped to its pre-tax equivalent,
 * which is what Dataico gets as `price` (it computes the IVA itself from the
 * rate); we compute the same IVA only to show and store it. Exempt lines
 * (`taxRate` 0) have nothing to unwrap. The result is folded into a single
 * `unitPrice` so `unitPrice × quantity` is the pre-tax, discounted subtotal —
 * callers never need to send a separate "discount" field anywhere.
 *
 * The line's `total` is exactly `price × quantity − discount`: the pre-tax
 * base is rounded to centavos and the IVA is whatever is left of the total,
 * so the customer is never charged a peso more or less than the plain sum
 * of the prices. That is why `unitPrice` carries decimals (4, as in Dataico's
 * own examples) instead of being rounded to whole pesos.
 */
export function computeLineAmounts(
  grossUnitPrice: number,
  quantity: number,
  taxRate: number,
  discount = 0,
): LineAmounts {
  const grossTotal = Math.max(0, grossUnitPrice * quantity - discount);
  const exclusiveTotal =
    taxRate > 0 ? grossTotal / (1 + taxRate / 100) : grossTotal;
  const taxBase = round(exclusiveTotal);
  return {
    unitPrice: round(exclusiveTotal / quantity, 4),
    taxBase,
    taxAmount: round(grossTotal - taxBase),
    total: grossTotal,
  };
}
