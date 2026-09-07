# Phase 12 — POS Electrónico (Backend)

**Status: Done** (send + query). Confirmed high priority — most of this store's sales are counter sales. Reference confirmed **only against Dataico's staging/gamma test environments** — no production URL yet, and no confirmed response shape.

## Confirmed reference — "Enviar factura - BASE"

```
POST https://staging.dataico.com/direct/dataico_api/v2/pos-invoices
Content-Type: application/json
Auth-token: <token>

{
  "number": 300002,
  "send-dian": true,
  "send-email": false,
  "issue-date": "28/07/2026",
  "items": [
    {
      "product": { "sku": "8981337767809", "description": "COMPUTADOR PORTATIL DE JUGUETE" },
      "measuring-unit": "94",
      "quantity": 1.0,
      "price": 55000.0,
      "description": "COMPUTADOR PORTATIL DE JUGUETE",
      "taxes": [ { "category": "IVA", "precise-rate": 19.0 } ]
    }
  ],
  "dian-resolution": { "number": "18764000000000" },
  "numbering": { "prefix": "POSE" },
  "payment-means": [ { "code": "CASH", "type": "DEBITO", "date": "28/07/2026" } ],
  "customer": {
    "company_name": "CLIENTE MOSTRADOR", "responsable-iva": false, "type": "NATURAL",
    "identification": "11111", "identification_type": "CC",
    "first_name": "CLIENTE", "family_name": "MOSTRADOR",
    "phone": "22222", "email": "noaplica@gmail.com"
  }
}
```

Query is confirmed too: `GET {base}/pos-invoices?number=POSE1`.

## Notably different from the standard invoice (Phase 10) — not a copy/paste

- **Top-level `send-dian`/`send-email`**, not nested under `actions`.
- **No `env`, `dataico_account_id`, or `operation` field at all** — implemented exactly as given, nothing added.
- **Items carry a nested `product: { sku, description }` object** (plus a duplicate top-level `description`) — standard invoice has flat `sku`/`description` at the item level.
- **Tax shape is just `{ category, precise-rate }`** — no `tax_base`/`tax_amount` sent by the caller; Dataico is presumably expected to compute those itself for POS, unlike standard invoicing where this app computes and sends them.
- **`payment-means` is an array** of `{ code, type, date }` (supports split payment) — standard invoice has flat `payment_means`/`payment_means_type` strings. This app sends a one-element array (see "Deliberately left out").
- **`dian-resolution.number` and `numbering.prefix` are separate top-level objects**, not one combined `numbering` object like standard invoice.
- Customer adds a **`responsable-iva` boolean** not present on the standard invoice's customer object.

## Confirmed: separate host, environment unclear

Every example shared points at `staging.dataico.com` or `gamma.dataico.com` — never `api.dataico.com` (production, used by every other confirmed endpoint). **No production POS URL has been provided.** Per the human: use staging as the working reference for now. Implemented as its own `DATAICO_POS_BASE_URL` env var (default: the staging URL above), completely separate from `DATAICO_BASE_URL`, specifically so swapping in the real production URL later is a one-variable change — see `docs/ENVIRONMENT_VARIABLES.md`.

## NOT implemented — genuinely blocked or deliberately excluded

- **Response shape — not confirmed.** No success response was ever shared for POS (request-only). `PosInvoicesService` maps the same field names as the confirmed standard-invoice response (`dian_status`, `cufe`, `uuid`, etc.) as a reasonable, cheap-to-fix assumption — not a guess about something with zero precedent, but genuinely unverified. First thing to check against a real response once one is available.
- **"Anulación" — not implemented.** The shared example named "Anulación" (annulment) is structurally identical to a plain "create" call — no `invoice_id`/reference to an existing document, no distinguishing field. Confirmed unclear whether this is really a cancel action or a mislabeled duplicate test; not implemented until clarified.
- **Field-naming conflict, resolved by using the "BASE" example**: the "BASE" (staging) and "Anulación" (gamma) examples use opposite conventions for the customer object (`company_name`/`identification_type` vs. `company-name`/`identification-type`). Went with "BASE"'s underscore convention since the human confirmed staging-as-BASE is the working reference. **First thing to revisit if Dataico rejects the customer object.**
- **`/direct/` path segment inconsistency, not resolved.** "BASE" (staging) includes it; "Anulación"/"Consultar" (gamma) omit it. Implemented with it (matching every other confirmed Dataico endpoint), consistent with "BASE" being the reference in use.

## What shipped

- [x] `pos_invoices` table (see `docs/DATABASE.md`).
- [x] `PosInvoicesService.create()`: resolves the active resolution by `documentType: invoice` **and** `subtype: POS` specifically (a business can have a separate DIAN resolution just for POS — `ResolutionsService.findActiveForDocumentType()` gained an optional `subtype` filter for this), validates stock up front, sends the confirmed payload, decrements stock via the existing `InventoryService` only after Dataico accepts, persists the record.
- [x] `PosInvoicesService.refreshStatus()`: `GET /pos-invoices?number=`.
- [x] `POST`/`GET /api/invoicing/pos-invoices`, `GET /api/invoicing/pos-invoices/:id`, `POST /api/invoicing/pos-invoices/:id/refresh` (admin, employee).
- [x] `DataicoClientService` gained a per-call `baseUrl` override parameter on `get`/`post`/`put`, so POS can use `DATAICO_POS_BASE_URL` without a second client class.
- [x] Unit tests covering the resolution lookup (INVOICE + POS subtype), stock validation, confirmed payload shape (including the nested `product` object and `precise-rate` tax), stock-decrement ordering, and the base-URL override.

## Deliberately left out (keep it simple)

- **Single payment method per sale.** `payment-means` is sent as a one-element array; this app's form doesn't support splitting a sale across multiple payment methods (e.g. part cash, part card) — revisit if that turns out to be common at the counter.
- **No resend action.** Only send + query are implemented; resend wasn't part of what was shared for POS, unlike standard invoicing where it was explicitly confirmed.

## Related documents

- `docs/phasesClient/PHASE_12_POS.md`, `docs/DATABASE.md` ("pos_invoices"), `docs/GLOSSARY.md`, `docs/phases/PHASE_8_RESOLUTIONS.md`
