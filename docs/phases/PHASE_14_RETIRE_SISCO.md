# Phase 14 — Retire Sisco export

**Status: Pending — blocked on at least Phase 10 being live and trusted in production.**

## Goal

Remove the legacy Sisco Excel-export workflow entirely now that Dataico is the real invoicing channel. This is a deliberate, standalone phase — not a cleanup folded into an unrelated change — so there's a clear before/after point in history.

## Scope

**Backend:**
- [ ] Remove `apps/api/src/export/` (controller, service, module) and its registration in `app.module.ts`
- [ ] Remove the `GET /export/articulos` route

**Frontend:**
- [ ] Remove `ProductsListPage`'s admin-only "Exportar" button
- [ ] Remove `services/export.ts` and `hooks/useExport.ts`

**Docs:**
- [ ] Update `docs/ARCHITECTURE.md` and `docs/DATABASE.md` to drop the `export` module from the current-state description (it stays referenced historically in `docs/phases/PHASE_6_SISCO_EXPORT.md` and `docs/GLOSSARY.md`, just no longer described as part of the live system)

## Do not start this phase until

At least one invoicing phase (Phase 10 at minimum) has been live long enough that the human is comfortable there's no fallback need for the Sisco export anymore. Removing it prematurely leaves no invoicing path at all if the Dataico integration has an unexpected gap.

## Exit criteria

No `export` code, route, or UI remains; docs describe Dataico as the only invoicing channel with no lingering "current" references to Sisco.

## Related documents

- `docs/phases/PHASE_6_SISCO_EXPORT.md`, `docs/GLOSSARY.md` ("Sisco" note)
