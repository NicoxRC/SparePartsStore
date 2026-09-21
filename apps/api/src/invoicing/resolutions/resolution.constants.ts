/**
 * Every resolution this store uses is for ordinary electronic invoicing, so
 * the subtype is fixed rather than something a user types. Kept as a column
 * (not dropped) because `findActiveForDocumentType()` still filters on it —
 * see docs/phases/PHASE_8_RESOLUTIONS.md.
 */
export const ELECTRONIC_SUBTYPE = 'ELECTRONICO';

/**
 * The `code-msg` (`code_msg` for support docs) Dataico's numbering sync
 * carries next to the resolution code. It is a fixed text, not something the
 * user types: taken from the example in the shared Dataico reference (Phase 8).
 */
export const RESOLUTION_CODE_MESSAGE = 'Resolución agregada correctamente';
