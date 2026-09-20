/**
 * Single source of truth for how a product's reference/description are
 * normalized. Used by the product DTOs' `@Transform`s and by the purchase
 * import service, which writes these fields without going through a DTO.
 */
export function normalizeProductReference(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeProductDescription(value: string): string {
  const trimmed = value.trim();
  return trimmed
    ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
    : trimmed;
}
