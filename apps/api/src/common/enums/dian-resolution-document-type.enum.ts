/**
 * Which Dataico "numbering sync" endpoint a resolution belongs to — see
 * docs/phases/PHASE_8_RESOLUTIONS.md. Named after Dataico's own URL suffix
 * (`/numberings/sync_dian/{invoice|support_docs}`) so the mapping from
 * this value to the actual endpoint stays obvious.
 */
export enum DianResolutionDocumentType {
  INVOICE = 'invoice',
  SUPPORT_DOCS = 'support_docs',
}
