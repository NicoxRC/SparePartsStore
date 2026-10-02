/**
 * Single source of truth for how a product's reference/description are
 * normalized. Used by the product DTOs' `@Transform`s and by the purchase
 * import service, which writes these fields without going through a DTO.
 */

/**
 * Products never carry accents or diaeresis (Á→A, Ü→U), so a search for
 * "valvula" finds what was typed as "válvula". Ñ is a letter, not an
 * accent, and is kept: the tilde (U+0303) is only dropped when it doesn't
 * sit on an N.
 */
export function stripAccents(value: string): string {
  return value
    .normalize('NFD')
    .replace(/(?<![nN])\u0303|[\u0300-\u0302\u0304-\u036f]/g, '')
    .normalize('NFC');
}

export function normalizeProductReference(value: string): string {
  return stripAccents(value.trim().toUpperCase());
}

export function normalizeProductDescription(value: string): string {
  const trimmed = stripAccents(value.trim());
  return trimmed
    ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
    : trimmed;
}
