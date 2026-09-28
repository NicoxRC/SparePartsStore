/**
 * NIT of the "INVENTARIO INICIAL" supplier created by the
 * `AddInitialInventorySupplier` migration — the supplier a product gets when
 * none is chosen. A placeholder no real supplier can have.
 */
export const INITIAL_INVENTORY_SUPPLIER_NIT = '0';

/** No supplier counts as "INVENTARIO INICIAL" too (only before migrating). */
export function isInitialInventorySupplier(
  supplier: { nit: string } | null | undefined,
): boolean {
  return !supplier || supplier.nit === INITIAL_INVENTORY_SUPPLIER_NIT;
}
