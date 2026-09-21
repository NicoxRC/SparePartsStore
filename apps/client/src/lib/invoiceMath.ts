/**
 * IVA is ADDED on top of a product's sale price (confirmed directly) — the
 * price stays exactly as entered on the product, and the document computes
 * the IVA and the final amount that goes to the DIAN. Exempt products
 * (`taxRate: 0`) get no IVA. The fixed discount (a flat COP amount, not a
 * percentage) comes off the pre-tax subtotal before IVA is computed.
 * Mirrors the backend's computeLineAmounts() step by step — including the
 * per-unit rounding — so what the screen shows is what gets invoiced.
 * Shared by InvoiceFormPage (Venta), QuotationDetailPage (Cotizaciones) and
 * the credit/debit note forms.
 */
export interface LineBreakdown {
  /** Pre-tax amount after any discount (price × quantity − discount). */
  subtotal: number;
  /** IVA on that subtotal. */
  tax: number;
  /** subtotal + tax — the amount that reaches the DIAN. */
  total: number;
}

export function computeLineBreakdown(item: {
  price: number;
  quantity: unknown;
  taxRate: unknown;
  discount?: unknown;
}): LineBreakdown {
  const quantity = Number(item.quantity) || 0;
  const taxRate = Number(item.taxRate) || 0;
  const discount = Number(item.discount) || 0;
  if (quantity <= 0) return { subtotal: 0, tax: 0, total: 0 };

  const discountedSubtotal = Math.max(0, item.price * quantity - discount);
  const unitPrice = Math.round(discountedSubtotal / quantity);
  const subtotal = unitPrice * quantity;
  const tax = Math.round(subtotal * (taxRate / 100));
  return { subtotal, tax, total: subtotal + tax };
}

/** A line's final amount: pre-tax subtotal plus IVA. */
export function computeItemTotal(item: {
  price: number;
  quantity: unknown;
  taxRate: unknown;
  discount?: unknown;
}): number {
  return computeLineBreakdown(item).total;
}

/** A line's pre-tax subtotal, before any discount — the base a global
 * discount percentage is prorated against (see computeItemDiscount). */
export function computeExclusiveSubtotal(item: {
  price: number;
  quantity: unknown;
  taxRate: unknown;
}): number {
  return item.price * (Number(item.quantity) || 0);
}

/**
 * There's no per-item discount input anymore — one discount percentage
 * applies to the whole sale, entered once (see the "Aplicar descuento"
 * control on InvoiceFormPage/QuotationDetailPage). Taking the same
 * percentage off every line's pre-tax subtotal is mathematically
 * identical to taking it off the grand total including IVA (tax is
 * linear), so this is the flat, per-line COP amount
 * computeItemTotal()/the backend's computeLineAmounts() already expect.
 */
export function computeItemDiscount(
  item: { price: number; quantity: unknown; taxRate: unknown },
  discountPercentage: number,
): number {
  if (!discountPercentage) return 0;
  return Math.round(computeExclusiveSubtotal(item) * (discountPercentage / 100));
}

/** Subtotal / IVA / total for a whole document, with the sale's discount applied line by line. */
export function summarizeLines(
  items: Array<{ price: number; quantity: unknown; taxRate: unknown }>,
  discountPercentage = 0,
): LineBreakdown {
  return items.reduce<LineBreakdown>(
    (sum, item) => {
      const line = computeLineBreakdown({
        ...item,
        discount: computeItemDiscount(item, discountPercentage),
      });
      return {
        subtotal: sum.subtotal + line.subtotal,
        tax: sum.tax + line.tax,
        total: sum.total + line.total,
      };
    },
    { subtotal: 0, tax: 0, total: 0 },
  );
}
