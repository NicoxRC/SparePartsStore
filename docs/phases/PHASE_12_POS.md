# Phase 12 — POS Electrónico (Backend)

**Status: Pending — awaiting the "3. POS Electrónico" Dataico reference, and a priority decision with the human.**

## Goal

Evaluate and, if adopted, implement DIAN's lighter-weight point-of-sale document type for this store's day-to-day counter sales, as an alternative to a full "factura electrónica" (Phase 10).

## Before scoping this phase

Confirm with the human whether counter sales should actually use this document type instead of (or alongside) Phase 10's invoice flow — this is a business decision (what DIAN eligibility rules apply to this store, what the human actually wants issued at the counter), not a default to assume just because the collection exists in the Dataico workspace.

## Scope (deferred until the above is confirmed)

- [ ] `invoicing/pos/` module
- [ ] Whatever POS-specific request/response Dataico's collection defines, once shared

## Related documents

- `docs/GLOSSARY.md` ("POS Electrónico"), `docs/PROJECT_ROADMAP.md`
