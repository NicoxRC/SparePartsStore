# Phase 9 — Consulta DIAN Terceros (Frontend)

**Status: Pending — waits for the backend contract from `docs/phases/PHASE_9_THIRD_PARTIES.md`.**

## Goal

Let whoever is creating an invoice look up/validate a customer's legal identification data inline, instead of hand-typing it and hoping it's correct.

## Scope (high-level — firms up once the backend contract exists)

- [ ] A customer-lookup input (by document number) inside the invoice-creation flow (Phase 10's frontend), not a standalone page — this is a lookup that feeds another form, similar in spirit to `SearchableSelect`'s inline-create pattern already used for product classification
- [ ] Clear feedback when a lookup fails (typo, unregistered tercero) vs. succeeds
- [ ] `services/thirdParties.ts` + `hooks/useThirdPartyLookup.ts`

## Related documents

- `docs/phases/PHASE_9_THIRD_PARTIES.md`, `docs/phasesClient/PHASE_10_INVOICING_STANDARD.md`
