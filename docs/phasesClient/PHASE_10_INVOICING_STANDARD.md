# Phase 10 — Factura electrónica estándar (Frontend)

**Status: Pending — waits for the backend contract from `docs/phases/PHASE_10_INVOICING_STANDARD.md`.** The main UI deliverable of the invoicing pivot.

## Goal

Let staff issue a real electronic invoice against a sale, from a phone, as easily as they currently record a product or a stock movement.

## Scope (high-level — firms up once the backend contract exists)

- [ ] A new "Facturación" section in the authenticated layout/navigation
- [ ] Invoice creation form: customer (via Phase 9's lookup), line items (searchable product picker, quantity, price pre-filled from `Product.salePrice` but editable), computed totals
- [ ] Invoice list/detail view: status (including whatever Phase 11 surfaces), CUFE, resend action, view/download the DIAN representation if Dataico provides one
- [ ] Credit note / debit note flow, reachable from an existing invoice's detail view
- [ ] Loading and error states on every async step — sending to DIAN is not instant, and a failure here needs to be impossible to miss (see `docs/DEFINITION_OF_DONE.md`'s invoicing-specific bar)
- [ ] `services/invoices.ts` + `hooks/useInvoices.ts`, `lib/schemas/invoice.ts`

## Related documents

- `docs/phases/PHASE_10_INVOICING_STANDARD.md`, `docs/phasesClient/PHASE_9_THIRD_PARTIES.md`, `docs/phasesClient/PHASE_11_RECEPTION_EVENTS.md`
