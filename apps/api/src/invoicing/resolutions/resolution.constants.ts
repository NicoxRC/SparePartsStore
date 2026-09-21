/**
 * Every resolution this store uses is for ordinary electronic invoicing, so
 * the subtype is fixed rather than something a user types. Kept as a column
 * (not dropped) because `findActiveForDocumentType()` still filters on it —
 * see docs/phases/PHASE_8_RESOLUTIONS.md.
 */
export const ELECTRONIC_SUBTYPE = 'ELECTRONICO';
