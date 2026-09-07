# Phase 12 — POS Electrónico (Backend)

**Status: Confirmed high priority — awaiting the "3. POS Electrónico" Dataico reference.**

## Goal

Implement DIAN's lighter-weight point-of-sale document type for this store's day-to-day counter sales. **Confirmed with the human**: most of this store's sales are counter sales, so this is likely the primary document type staff actually use, not a secondary alternative to Phase 10's full invoice flow.

## Blocked on

The "3. POS Electrónico" collection's request/response reference hasn't been shared yet — same discipline as every other Dataico module: don't guess the payload shape, endpoint path, or which fields (if any) differ from the standard invoice shape confirmed in Phase 10.

## Scope (firms up once the reference is shared)

- [ ] `invoicing/pos/` module — likely reuses `DataicoClientService`, and possibly `ResolutionsService` if POS documents need their own resolution/numbering (unconfirmed — Phase 8's `dian_resolutions` schema already supports adding a new `document_type` if so)
- [ ] Whatever POS-specific request/response Dataico's collection defines
- [ ] Decide, once the reference is in, whether POS should reuse `InvoicesService`'s item-resolution/stock-decrement logic (likely yes — no reason to duplicate that) or needs its own

## Related documents

- `docs/phasesClient/PHASE_12_POS.md`, `docs/GLOSSARY.md` ("POS Electrónico"), `docs/PROJECT_ROADMAP.md`
