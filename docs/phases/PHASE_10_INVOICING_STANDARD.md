# Phase 10 — Factura electrónica estándar (Backend)

**Status: Pending — awaiting the "1. Factura electrónica estándar" Dataico reference.** This is the centerpiece of the invoicing pivot.

## Goal

Issue a real, DIAN-validated electronic invoice from a sale, plus credit and debit notes against it.

## Scope (high-level — firms up once the reference is shared)

- [ ] `invoicing/invoices/` module — depends on Phase 7 (client), Phase 8 (an active resolution must exist), ideally Phase 9 (customer data)
- [ ] Local schema for an invoice: line items, totals/taxes, the customer reference, Dataico's document ID, DIAN status, CUFE, timestamps — see `docs/DATABASE.md`'s "Invoicing tables" placeholder, to be filled in once the shape is known
- [ ] Send invoice ("Envió Factura")
- [ ] Resend invoice ("Reenviar factura")
- [ ] Query invoice status ("Consulta Factura")
- [ ] Credit note ("Nota crédito")
- [ ] Debit note ("Nota débito")
- [ ] Decide how an invoice's line items relate to `Product` — likely referencing `products.id` for each line, snapshotting price/description at issue time the same way `docs/DATABASE.md` already snapshots concept values in other systems this project's docs were modeled after (see `docs/GLOSSARY.md`'s general approach, adapt once the real payload shape is known)

## Explicitly blocked on

Every field name, required vs. optional field, tax/line-item structure, and response shape for all five request types above. **This is the single highest-stakes phase to get wrong** — a malformed invoice is a real legal/tax problem, not just a bug. Do not start implementing against assumptions; get the reference first.

## Exit criteria

A sale can produce a real electronic invoice, sent to Dataico, validated by DIAN, with a retrievable CUFE and status — and a credit/debit note can be issued against it afterward.

## Related documents

- `docs/phasesClient/PHASE_10_INVOICING_STANDARD.md`, `docs/DATABASE.md` ("Invoicing tables"), `docs/GLOSSARY.md`
