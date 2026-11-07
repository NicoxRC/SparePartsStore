/**
 * Single source of truth for how a product's reference/description are
 * normalized. Used by the product DTOs' `@Transform`s and by the purchase
 * import service, which writes these fields without going through a DTO.
 */

// Products never carry accents or diaeresis (Á→A, Ü→U), so a search for
// "valvula" finds what was typed as "válvula". Ñ is kept.
import { stripAccents } from '../common/utils/search.util';

export { stripAccents };

export function normalizeProductReference(value: string): string {
  return stripAccents(value.trim().toUpperCase());
}

export function normalizeProductDescription(value: string): string {
  const trimmed = stripAccents(value.trim());
  return trimmed
    ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
    : trimmed;
}
