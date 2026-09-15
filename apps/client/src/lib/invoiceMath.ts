/**
 * Final line amount: tax-inclusive (a product's `salePrice` is confirmed to
 * already include IVA — `taxRate: 0` is just the flag for the "excluida"
 * label, not a separate calculation). The fixed discount (a flat COP
 * amount, not a percentage) comes off the pre-tax base before IVA is
 * re-applied — confirmed directly. Mirrors
 * InvoicesService.resolveItems()/computeLineAmounts() on the backend.
 * Shared by InvoiceFormPage (Venta) and QuotationDetailPage (Cotizaciones).
 */
export function computeItemTotal(item: {
  price: number;
  quantity: unknown;
  taxRate: unknown;
  discount?: unknown;
}): number {
  const quantity = Number(item.quantity) || 0;
  const taxRate = Number(item.taxRate) || 0;
  const discount = Number(item.discount) || 0;
  const exclusivePrice = taxRate > 0 ? item.price / (1 + taxRate / 100) : item.price;
  const discountedBase = Math.max(0, exclusivePrice * quantity - discount);
  return Math.round(discountedBase * (1 + taxRate / 100));
}
