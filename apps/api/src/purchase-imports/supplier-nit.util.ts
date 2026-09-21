export interface ParsedNit {
  /** Digits only, without the check digit; leading zeros kept. */
  nit: string;
  dv: string | null;
}

const MAX_NIT_LENGTH = 20;

/**
 * Reads a supplier NIT the way people actually write it: "900123456",
 * "900.123.456" or with the check digit inline ("900.123.456-7"). `schemeId`
 * is the XML `schemeID` attribute, which carries the check digit there.
 */
export function parseNit(
  raw: string | null,
  schemeId: string | null = null,
): ParsedNit | null {
  if (!raw) return null;

  const inline = /^([\d.\s]+)-(\d)$/.exec(raw);
  const nit = inline ? inline[1].replace(/\D/g, '') : raw.replace(/\D/g, '');
  if (!nit || nit.length > MAX_NIT_LENGTH) return null;

  if (inline) return { nit, dv: inline[2] };
  return { nit, dv: schemeId && /^\d$/.test(schemeId) ? schemeId : null };
}
