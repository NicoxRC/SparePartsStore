# Phase 8 — DIAN resolutions (Backend)

**Status: Pending — awaiting the "8. Actualizar o vincular resoluciones" Dataico reference.**

## Goal

A business can't legally send an electronic invoice without an active DIAN numbering resolution on file (see `docs/GLOSSARY.md`). Get this on file before any invoice-sending phase, not after.

## Scope (high-level — firms up once the reference is shared)

- [ ] `invoicing/resolutions/` module — depends on `DataicoClientService` from Phase 7
- [ ] Endpoint(s) to associate/update a DIAN resolution against this business's Dataico account (the reference's "Asociar nueva resolución - FE" / "- DS" requests suggest at least two resolution types: standard invoice and support document)
- [ ] A local record of the active resolution(s) — number range, validity window, document type — so the app doesn't have to query Dataico live on every invoice attempt just to know if a resolution is active
- [ ] Admin-facing read view of the current resolution status

## Explicitly blocked on

The exact request/response shape of "Asociar nueva resolución - DS" and "- FE" — **do not guess field names or infer them from generic DIAN documentation.** Ask for the shared reference for this collection if it isn't already available (see `CLAUDE.md`).

## Exit criteria

An admin can see which DIAN resolution(s) this business is currently authorized to invoice under, and a resolution can be associated/updated through the app rather than only through Dataico's own portal.

## Related documents

- `docs/phasesClient/PHASE_8_RESOLUTIONS.md`, `docs/GLOSSARY.md` ("Resolución DIAN")
