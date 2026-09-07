# Phase 10 — Factura electrónica estándar (Frontend)

**Status: Done** (send-invoice flow only). The main UI deliverable of the invoicing pivot.

## Goal

Let staff issue a real electronic invoice against a sale, from a phone, as easily as they currently record a product or a stock movement.

## What shipped

- **`InvoicesListPage`** (`/invoicing/invoices`) — table of sent invoices (number, customer, total, DIAN status badge, issue date, PDF link), paginated.
- **`InvoiceFormPage`** (`/invoicing/invoices/new`) — the main deliverable:
  - Invoice details (number, dates, payment means/type — `<select>`s with the values confirmed so far, not free text).
  - Customer section wired to **Phase 9's third-party lookup**: entering an identification and clicking "Buscar" calls `useThirdPartyLookup` (via manual `refetch()`, not auto-fetch) and auto-fills company name/email on a hit; shows a clear "not found" message otherwise. Persona jurídica/natural toggles which name fields show.
  - Product line items: a search-as-you-type picker (reusing `useProducts`) adds a row with `sku`/`description`/`price` pulled from the real product record; quantity and IVA % (defaulting to 19%, editable) are the only per-line inputs. Running total computed client-side for immediate feedback.
  - Loading/error states throughout — sending to DIAN is not instant, and a failure is surfaced via `getApiErrorMessage`, not swallowed.
- Added "Facturas" to the nav for admin **and employee** (not auditor) — matches the backend's role tier, since this is the everyday counter-sale action, not an admin-only configuration screen.
- `services/invoices.ts` + `hooks/useInvoices.ts`; creating an invoice also invalidates the `products` query cache, since stock changes as a side effect.

## Deliberately left out (keep it simple)

- No DANE department/city picker — plain text inputs for the codes, matching the backend's own simplification.
- No resend/credit-note/debit-note UI — their backend references aren't confirmed yet (see `docs/phases/PHASE_10_INVOICING_STANDARD.md`).
- No draft/preview step before sending — matches the backend hardcoding `send_dian: true`; submitting the form IS sending the real invoice.

## Related documents

- `docs/phases/PHASE_10_INVOICING_STANDARD.md`, `docs/phasesClient/PHASE_9_THIRD_PARTIES.md`
