export interface LineAmounts {
  unitPrice: number;
  taxBase: number;
  taxAmount: number;
  total: number;
}

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
 * Shared by InvoicesService and QuotationsService. `grossUnitPrice` is
 * confirmed IVA-inclusive (what the customer actually pays per unit) —
 * see GLOSSARY.md's "Cost vs. Sale price" entry — so it's first unwrapped
 * to its pre-tax equivalent, then the fixed per-line discount (a flat COP
 * amount, not a percentage) is subtracted from that pre-tax subtotal
 * before IVA is recomputed. The result is folded into a single `unitPrice`
 * so `unitPrice × quantity` already equals the discounted subtotal —
 * callers never need to send a separate "discount" field anywhere.
 */
export function computeLineAmounts(
  grossUnitPrice: number,
  quantity: number,
  taxRate: number,
  discount = 0,
): LineAmounts {
  const exclusiveUnitPrice =
    taxRate > 0 ? grossUnitPrice / (1 + taxRate / 100) : grossUnitPrice;
  const rawSubtotal = exclusiveUnitPrice * quantity;
  const discountedSubtotal = Math.max(0, rawSubtotal - discount);
  const unitPrice = Math.round(discountedSubtotal / quantity);
  const taxBase = unitPrice * quantity;
  const taxAmount = Math.round(taxBase * (taxRate / 100));
  return { unitPrice, taxBase, taxAmount, total: taxBase + taxAmount };
}
