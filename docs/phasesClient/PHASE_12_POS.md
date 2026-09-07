# Phase 12 — POS Electrónico (Frontend)

**Status: Done.** Confirmed with the human as this store's primary sale flow — most sales are counter sales.

## What shipped

- **`PosInvoicesListPage`** (`/invoicing/pos-invoices`) — table of sent POS documents, DIAN status badge, "Consultar" action per row (no "Reenviar" — not implemented on the backend for POS, see the backend phase doc).
- **`PosInvoiceFormPage`** (`/invoicing/pos-invoices/new`) — deliberately leaner than the standard invoice form (`InvoiceFormPage`) to match POS's actual purpose (fast counter sales): no order reference, no separate payment date field, no DANE department/city codes (not part of the confirmed POS payload at all), single payment method, a "responsable de IVA" checkbox for the customer.
- Reuses the same product search-picker pattern as `InvoiceFormPage` (`useProducts`) — no third-party (Phase 9) lookup wired in here, since a walk-in counter customer is typically typed in directly, not looked up.
- Added **"Venta POS" to the nav, ahead of "Facturas"** — reflects that this is the primary flow, not secondary to the full invoice form.
- `services/posInvoices.ts` + `hooks/usePosInvoices.ts`; creating a POS sale also invalidates the `products` cache (stock changes).

## Deliberately left out (keep it simple)

- No split-payment UI (multiple payment methods per sale) — matches the backend sending a single-element `payment-means` array.
- No "Reenviar" action — not available on the backend for POS.

## Related documents

- `docs/phases/PHASE_12_POS.md`
