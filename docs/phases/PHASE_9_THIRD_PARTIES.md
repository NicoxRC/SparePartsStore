# Phase 9 — Consulta DIAN Terceros (Backend)

**Status: Pending — awaiting the "7. Consulta DIAN Terceros" Dataico reference.**

## Goal

Validate/pre-fill a customer's legal identification data (NIT, cédula, name/razón social) before an invoice is issued against them, instead of trusting whatever is hand-typed.

## Scope (high-level — firms up once the reference is shared)

- [ ] `invoicing/third-parties/` module
- [ ] A lookup endpoint the invoice-creation flow can call by document number
- [ ] Decide (with the human, once the reference is available) whether a successful lookup gets cached/persisted locally as a lightweight "customer" record for reuse across invoices, or is queried fresh every time

## Explicitly blocked on

Request format (which document-type/number combination the endpoint expects) and response shape (what fields DIAN/Dataico actually returns for a tercero) — pending the shared reference.

## Exit criteria

Creating an invoice can pull a customer's legal identification data from this lookup instead of requiring it to be manually re-typed correctly every time.

## Related documents

- `docs/phasesClient/PHASE_9_THIRD_PARTIES.md`, `docs/GLOSSARY.md` ("Tercero")
