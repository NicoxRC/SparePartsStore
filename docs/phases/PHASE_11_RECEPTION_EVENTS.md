# Phase 11 — Eventos de recepción

**Status: Out of scope, confirmed with the human.**

## What this collection actually is (corrected from an earlier assumption)

The original scope for this phase assumed "Eventos de recepción" was a status-webhook mechanism for keeping *this store's own issued invoices* up to date automatically. Seeing the real collection contents corrected that: it's entirely about being the **receiving** party of an invoice — the actions a buyer takes on a bill their supplier sent them:

- Enviar eventos: Acuse de recibido, Aceptación Tácita, Acuse de recibido - Jurídica, Recibido de prestación, Aceptación Expresa, Rechazo
- Consultar Evento

None of this applies to CasaRespuestos issuing invoices to its own customers (that's Phase 10, done — "Consulta Factura" already covers "check an invoice's status without opening Dataico's portal"). It would only matter if this store wanted to also track/acknowledge the electronic invoices **its own suppliers** send **it** — confirmed with the human that this is not a current need.

## Decision

Deferred indefinitely, not just "pending a reference" — this is a scope decision, not a blocked one. Revisit only if the business later asks to track supplier invoices through this app.

## Related documents

- `docs/PROJECT_ROADMAP.md` ("Explicitly out of scope for now"), `docs/phases/PHASE_10_INVOICING_STANDARD.md` (covers this store's own issued-invoice status via Consulta Factura)
