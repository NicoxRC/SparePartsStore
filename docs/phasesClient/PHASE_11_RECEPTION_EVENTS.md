# Phase 11 — Eventos de recepción (Frontend)

**Status: Pending — waits for the backend contract from `docs/phases/PHASE_11_RECEPTION_EVENTS.md`.**

## Goal

Make a rejected or disputed invoice impossible to miss, instead of something an admin only discovers by checking Dataico's portal.

## Scope (high-level — firms up once the backend contract exists)

- [ ] Status badge/column on the invoice list (Phase 10) reflecting the real DIAN status
- [ ] A visible alert (not just a quiet status color) for a rejected/disputed invoice, from wherever an admin would naturally land after issuing one
- [ ] If Phase 11's backend turns out to be webhook-driven with near-real-time updates, consider whether polling/refetch-on-focus is enough or a live update mechanism is worth it — decide once that's confirmed, not before

## Related documents

- `docs/phases/PHASE_11_RECEPTION_EVENTS.md`, `docs/phasesClient/PHASE_10_INVOICING_STANDARD.md`
