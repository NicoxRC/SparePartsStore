/**
 * A product's sale price ALREADY INCLUDES IVA (confirmed directly): what the
 * customer pays is just the sum of the prices, and the IVA is only broken out
 * of it to be shown — never added on top. Exempt products (`taxRate: 0`) have
 * no IVA in their price. The fixed discount (a flat COP amount, not a
 * percentage) comes off the final, IVA-included amount.
 * Mirrors the backend's computeLineAmounts() step by step, so what the screen
 * shows is what gets invoiced: the total is exactly the sum of the prices.
 * Shared by InvoiceFormPage (Venta), QuotationDetailPage (Cotizaciones) and
 * the credit/debit note forms.
 */
export interface LineBreakdown {
  /** Pre-tax amount: the price without its IVA, after any discount. */
  subtotal: number;
  /** The IVA contained in the price. */
  tax: number;
  /** subtotal + tax — the price the customer pays (after any discount). */
  total: number;
  /** Of `total`, the part that came from exempt lines (taxRate 0) — already
   * included in `subtotal`/`total`, broken out only so the screen can show
   * an "Exentos" figure grouping them, same as the printed slip does. */
  exempt: number;
}

/** Same rounding as the server's `round()`. */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function computeLineBreakdown(item: {
  price: unknown;
  quantity: unknown;
  taxRate: unknown;
  discount?: unknown;
}): LineBreakdown {
  const price = Number(item.price) || 0;
  const quantity = Number(item.quantity) || 0;
  const taxRate = Number(item.taxRate) || 0;
  const discount = Number(item.discount) || 0;
  if (quantity <= 0) return { subtotal: 0, tax: 0, total: 0, exempt: 0 };

  const total = Math.max(0, price * quantity - discount);
  const exclusiveTotal = taxRate > 0 ? total / (1 + taxRate / 100) : total;
  // The server keeps the base and the IVA in centavos (IVA = what is left of
  // the total); on screen they are shown in whole pesos, with the subtotal
  // being the rest so the three figures always add up.
  const taxBase = roundTo(exclusiveTotal, 2);
  const tax = Math.round(roundTo(total - taxBase, 2));
  return { subtotal: total - tax, tax, total, exempt: taxRate > 0 ? 0 : total };
}

/** A line's final amount: what the customer pays for it (IVA included). */
export function computeItemTotal(item: {
  price: unknown;
  quantity: unknown;
  taxRate: unknown;
  discount?: unknown;
}): number {
  return computeLineBreakdown(item).total;
}

/** A line's price × quantity, IVA included and before any discount — the
 * base a global discount percentage is prorated against (see computeItemDiscount). */
export function computeGrossSubtotal(item: {
  price: unknown;
  quantity: unknown;
  taxRate: unknown;
}): number {
  return (Number(item.price) || 0) * (Number(item.quantity) || 0);
}

/**
 * There's no per-item discount input anymore — one discount percentage
 * applies to the whole sale, entered once (see the "Aplicar descuento"
 * control on InvoiceFormPage/QuotationDetailPage). It comes off every line's
 * final (IVA-included) amount, so it equals the same percentage off the
 * grand total — this is the flat, per-line COP amount
 * computeItemTotal()/the backend's computeLineAmounts() expect.
 */
export function computeItemDiscount(
  item: { price: unknown; quantity: unknown; taxRate: unknown },
  discountPercentage: number,
): number {
  if (!discountPercentage) return 0;
  return Math.round(computeGrossSubtotal(item) * (discountPercentage / 100));
}

/** Subtotal / IVA / total for a whole document, with the sale's discount applied line by line. */
export function summarizeLines(
  items: Array<{ price: unknown; quantity: unknown; taxRate: unknown }>,
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
        exempt: sum.exempt + line.exempt,
      };
    },
    { subtotal: 0, tax: 0, total: 0, exempt: 0 },
  );
}
