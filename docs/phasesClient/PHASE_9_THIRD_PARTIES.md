# Phase 9 — Consulta DIAN Terceros (Frontend)

**Status: Partially done.** The reusable pieces are built; the actual UI integration point is Phase 10's invoice form, which doesn't exist yet.

## Goal

Let whoever is creating an invoice look up/validate a customer's legal identification data inline, instead of hand-typing it and hoping it's correct.

## What shipped

- `services/thirdParties.ts` — `lookupThirdParty({ identification, identificationType })`.
- `hooks/useThirdPartyLookup.ts` — on-demand query (same `enabled`-gated pattern as `useCheckReference` in `useProducts.ts`), 30s stale time, no retry (a lookup miss is a normal outcome, not a transient failure to retry).

## Still pending — belongs to Phase 10, not this one

- The actual input/UI inside the invoice-creation form: an identification field, a "buscar" action or debounced auto-lookup, and clear feedback for "not found" vs. found (auto-filling the customer's name/email). This is deliberately not built as a standalone page now — see `docs/phases/PHASE_9_THIRD_PARTIES.md`.

## Related documents

- `docs/phases/PHASE_9_THIRD_PARTIES.md`, `docs/phasesClient/PHASE_10_INVOICING_STANDARD.md`
