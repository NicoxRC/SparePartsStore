# Phase 10 — Factura electrónica estándar (Backend)

**Status: Done** — send, resend, query, and (as a follow-up) debit note and credit note. The centerpiece of the invoicing pivot.

## Goal

Issue a real, DIAN-validated electronic invoice from a sale, plus credit and debit notes against it.

## Confirmed reference — "Envío Factura" (Estructura básica)

```
POST https://api.dataico.com/direct/dataico_api/v2/invoices
Content-Type: application/json
Auth-token: <DATAICO_AUTH_TOKEN>
```

Chose "Estructura básica" deliberately over the collection's many other variants (IMP Licor, IMP Bolsa, ICUI/IBUA, Anticipo, Mandato, Obsequio, AIU, RET_FUENTE/RET_ICA, Sector salud) — per `CLAUDE.md`'s "keep it simple" principle, a car spare-parts store doesn't need those special-tax scenarios. Confirmed request:

```json
{
  "actions": { "send_dian": false, "send_email": false },
  "invoice": {
    "env": "PRODUCCION",
    "dataico_account_id": "01991bd8-316a-8785-957b-b63ea8407f2c",
    "operation": "ESTANDAR",
    "invoice_type_code": "FACTURA_VENTA",
    "issue_date": "17/02/2026",
    "order_reference": "",
    "number": 1225,
    "payment_means": "BANK_TRANSFER",
    "payment_means_type": "DEBITO",
    "payment_date": "17/02/2026",
    "numbering": { "resolution_number": "18764105397963", "prefix": "FVE", "flexible": true },
    "customer": {
      "tax_level_code": "COMUN", "regimen": "", "party_type": "PERSONA_JURIDICA",
      "party_identification_type": "NIT", "party_identification": "830033494",
      "country_code": "CO", "department": "11", "city": "001",
      "address_line": "AV CR 19 105 52 P 6", "email": "info@heel.com.co",
      "first_name": "", "family_name": "", "company_name": "HEEL COLOMBIA LTDA"
    },
    "items": [
      {
        "sku": "01", "measuring_unit": "94", "quantity": 70849,
        "description": "SERVICIOS DE MAQUILA-UNIDADES SIN REEMPAQUE", "price": 281,
        "taxes": [{ "tax_category": "IVA", "tax_rate": 19, "tax_base": 100, "tax_amount": 3782628 }],
        "retentions": []
      }
    ],
    "notes": []
  }
}
```

And its confirmed success response (fields this app actually stores are in **bold**):

- **`dian_status`** (e.g. `"DIAN_ACEPTADO"`), `customer_status`, `email_status`
- **`number`** (Dataico's own, e.g. `"FVE1225"` — prefix+number concatenated, different from the request's plain integer `number`)
- **`cufe`**, **`uuid`** (Dataico's internal document id, distinct from the CUFE)
- **`xml_url`**, **`pdf_url`**, **`qrcode`** (the DIAN QR payload text), **`dian_messages`** (array of validation notices — can be non-empty even on a `DIAN_ACEPTADO` invoice)
- `xml` — the full base64 UBL document. **Deliberately not persisted** (see `Invoice` entity) — redundant with `xml_url`, and would bloat every row.
- `customer` (echoed, but `department`/`city` come back as **names**, not the DANE codes sent in the request), `items` (echoed, without the tax breakdown), `numbering`, `retentions`, `payment_date`, `validation_date`

**Anomaly, not replicated**: the confirmed example's `tax_base` is `100` for every item regardless of the item's actual price×quantity — this doesn't reconcile mathematically with the item's real subtotal or the returned `tax_amount`. This app computes `tax_base`/`tax_amount` itself using the standard, uncontroversial formula (`tax_base = round(price × quantity)`, `tax_amount = round(tax_base × tax_rate / 100)`) rather than copying that example's inconsistent numbers — see `InvoicesService.resolveItems()`.

**Test/dry-run mechanism confirmed**: controlled via `actions.send_dian: false`, not a special `env` value — only `"PRODUCCION"` has been seen for `env`. This app always sends `send_dian: true` (see "Deliberately left out" below).

## Confirmed reference — "Reenviar factura" (resend) and "Consulta Factura" (query)

Resend does **not** create a new document — it re-triggers an action (DIAN submission and/or email) on an invoice that already exists in Dataico, addressed by Dataico's own `uuid` (not our local id, not the business number):

```
PUT https://api.dataico.com/direct/dataico_api/v2/invoices/{dataico_uuid}
Content-Type: application/json
Auth-token: <DATAICO_AUTH_TOKEN>

{ "actions": { "send_dian": true, "send_email": false } }
```

Confirmed against two identical real examples (different uuids/tokens, same shape) — this is the whole body, no `invoice` object. Query is a `GET` by business number:

```
GET https://api.dataico.com/direct/dataico_api/v2/invoices?number=FE12621
Auth-token: <DATAICO_AUTH_TOKEN>
```

No response example was shared for query — **assumed** (not guessed from nothing) to return the same shape as "Envío Factura"'s confirmed response, since it's the same resource. `InvoicesService` reuses the identical response-mapping logic for create/resend/refresh (`mapDataicoResponse()`), so if the query response ever turns out to differ, there's exactly one place to fix it.

**Security note, recorded for future readers**: every curl shared for this sub-feature included a `Cookie: AWSALBAPP-*=...` header (AWS load-balancer session cookies, evidently captured incidentally when the request was recorded in Postman). These are **not** part of Dataico's actual auth contract — the very first confirmed request (Phase 7) had no Cookie header and worked fine — so they are deliberately not sent by `DataicoClientService`.

## Confirmed reference — "Nota débito" (debit note)

```
POST https://api.dataico.com/direct/dataico_api/v2/debit_notes
Content-Type: application/json
Auth-token: <DATAICO_AUTH_TOKEN>
```

Two real examples shared (different accounts/prefixes — `NNND`/production, `CT`/dry-run test), confirming the shape below. The two examples link to the original invoice two different ways — one by `invoice_id` (Dataico's own uuid), the other by `invoice_cufe`/`invoice_number`/`invoice_issue_date` together. This app uses `invoice_id` (the simpler, single-field option), since it already stores `invoices.dataico_uuid` and the same field already addresses `resend`/`refresh` above:

```json
{
  "actions": { "send_dian": true, "send_email": false },
  "debit_note": {
    "env": "PRODUCCION",
    "dataico_account_id": "<DATAICO_ACCOUNT_ID>",
    "invoice_id": "<invoices.dataico_uuid of the corrected invoice>",
    "issue_date": "07/09/2026",
    "number": 3,
    "numbering": { "prefix": "NDL", "flexible": true },
    "reason": "OTROS",
    "customer": { "...": "same shape as the invoice's own customer block" },
    "items": [
      {
        "sku": "TRANSPORTE",
        "measuring_unit": "94",
        "quantity": 25,
        "description": "SERVICIO DE TRANSPORTE",
        "price": 12600,
        "taxes": [{ "tax_category": "IVA", "tax_rate": 19 }]
      }
    ]
  }
}
```

Notable differences from the invoice's own confirmed shape, all deliberate:

- **No `resolution_number` in `numbering`** — notes use Dataico's *flexible numbering*, not a pre-authorized DIAN resolution range the way invoices do. This app's own prefix comes from `DATAICO_DEBIT_NOTE_PREFIX` (see `docs/ENVIRONMENT_VARIABLES.md`), not `dian_resolutions`.
- **Item `taxes` only carry `tax_category`/`tax_rate`** — no `tax_base`/`tax_amount` the way invoice items need. Confirmed from a separate, genuinely clean (non-health) credit note example sharing this same request family — Dataico evidently computes the base/amount itself for notes.
- **`reason: "OTROS"`** is the only value confirmed against a real debit-note example — hardcoded server-side, not exposed as a picker.
- **`measuring_unit`** (underscore) was inconsistent across the shared examples — one used a hyphen (`measuring-unit`) instead. This app sends the underscore form, matching the invoice's own already-proven-working field name, and flags the inconsistency here rather than guessing silently.
- **The `customer` block is not re-collected** — `DebitNotesService` reads it straight from the target invoice's own stored `request_payload.invoice.customer`, guaranteeing it matches what was legally on that invoice.

**No response example was shared** for debit notes (only requests) — this app **assumes** the same response shape as "Envío Factura" (`dian_status`/`cufe`/`uuid`/`xml_url`/`pdf_url`/`qrcode`/`dian_messages`), since it's the same underlying Dataico document-resource family, reusing the identical `mapDataicoResponse()`-style mapping. First thing to verify once a real debit note goes through Dataico.

## Confirmed reference — "Nota crédito" (credit note)

```
POST https://api.dataico.com/direct/dataico_api/v2/credit_notes
Content-Type: application/json
Auth-token: <DATAICO_AUTH_TOKEN>
```

The original shared example was health-sector-contaminated (see "Still not confirmed" below) — a second, genuinely clean example (sourced from Dataico's own documentation, no health block, real production account/customer data) confirmed the shape:

```json
{
  "actions": { "send_dian": true, "send_email": false },
  "credit_note": {
    "env": "PRODUCCION",
    "dataico_account_id": "<DATAICO_ACCOUNT_ID>",
    "invoice_id": "<invoices.dataico_uuid of the corrected invoice>",
    "issue_date": "07/09/2026",
    "payment_means": "<the corrected invoice's own payment_means>",
    "payment_means_type": "<the corrected invoice's own payment_means_type>",
    "payment_date": "<the corrected invoice's own payment_date>",
    "number": 27,
    "numbering": { "prefix": "NCE", "flexible": true },
    "reason": "DEVOLUCION",
    "customer": { "...": "same shape as the invoice's own customer block" },
    "items": [
      {
        "sku": "27",
        "measuring-unit": "94",
        "quantity": 1,
        "description": "Hamburguesa De Carne",
        "price": 20277.7778,
        "taxes": [{ "tax_category": "IMP_CONSUMO", "tax_rate": 8 }]
      }
    ],
    "charges": []
  }
}
```

A close sibling of the debit note shape above, with real, deliberate differences:

- **`reason: "DEVOLUCION"`** — the only value confirmed against this clean example. The original (blocked) example used `"ANULACION"`, but that came from the health-contaminated fixture and isn't trusted — see "Still not confirmed" below.
- **`payment_means`/`payment_means_type`/`payment_date` are present** (debit notes' confirmed examples never included them). This app reuses the *original invoice's own* values for all three — read from `invoices.request_payload`/`invoices.payment_date` — rather than asking the caller to re-enter payment terms for a correction to an existing sale.
- **`measuring-unit` is hyphenated**, not `measuring_unit` like invoices/this app's debit notes — confirmed by every item across this example using the hyphen consistently. Debit notes' own two shared examples disagreed with each other on this exact point (see above); credit note's example doesn't contradict itself, so this app follows what it actually shows rather than forcing consistency with debit notes' choice.
- **`charges: []`** — a new array not seen on debit notes, always empty in the example. Sent as `[]` unconditionally; no populated example exists to confirm its shape if it's ever non-empty.
- **Item `taxes`** — same as debit notes, only `tax_category`/`tax_rate`, no `tax_base`/`tax_amount`. The example also shows `tax_category: "IMP_CONSUMO"` on some lines (a different tax entirely, not used by this store) — irrelevant here, since this app only ever sends `"IVA"` (see "Deliberately left out" above).
- **Inventory moves the opposite direction from a debit note**: a credit note returns merchandise, so `CreditNotesService.create()` increments stock (positive `InventoryService.createMovement` quantity) and skips the stock-sufficiency check entirely — there's no way to "run out" of room to accept a return.

**No response example was shared** for credit notes either — same assumption as debit notes (mirrors "Envío Factura"'s confirmed response shape).

## What shipped

- [x] `invoices` table (see `docs/DATABASE.md`) — promotes the fields this app actually queries (status, CUFE, customer identity) to real columns, keeps the full request/response as JSONB rather than normalizing Dataico's rich, still-partially-confirmed payload.
- [x] `InvoicesService.create()`:
  1. Resolves the active INVOICE resolution from Phase 8's `dian_resolutions` (via `ResolutionsService.findActiveForDocumentType`) — rejects with a clear message if none exists, rather than sending an invoice with no legal numbering.
  2. Validates stock for **every** item up front, before calling Dataico — a DIAN-accepted invoice can't be un-sent, so failing early on insufficient stock is safer than sending first and discovering it after.
  3. Builds and sends the confirmed request shape, `sku`/`description`/`price` pulled live from the `Product` entity (not re-typed by the caller).
  4. On success, decrements stock per item via the existing `InventoryService.createMovement` (reused as-is, not reimplemented) — this is what actually connects the invoicing and inventory pillars.
  5. Persists the local `Invoice` row with the response's status/CUFE/urls mapped, `xml` stripped from the stored response.
- [x] `POST`/`GET /api/invoicing/invoices` (ADMIN, EMPLOYEE — same tier as Products, since this is the everyday counter-sale action), Swagger-documented.
- [x] `DATAICO_ACCOUNT_ID` added as a new env var (see `docs/ENVIRONMENT_VARIABLES.md`) — stable per deployment, not re-entered per invoice.
- [x] Unit tests: rejects with no active resolution, rejects on insufficient stock (both without calling Dataico), sends the confirmed payload shape with correctly computed tax, decrements stock only after Dataico succeeds, persists the mapped response excluding `xml`.
- [x] `InvoicesService.resend()` / `.refreshStatus()` — `POST /api/invoicing/invoices/:id/resend` and `/:id/refresh`. Unlike everything else in this table, these **update the existing row in place** (added `updatedAt` via a follow-up migration) rather than inserting a new one — a resend/refresh is a correction to the same legal document, not a new one. `DataicoClientService.put()` added alongside `get`/`post`.
- [x] `GET /api/invoicing/invoices/:id` — needed so resend/refresh have something to act on from the UI.
- [x] Frontend: "Reenviar"/"Consultar" actions per row on `InvoicesListPage`, with per-row loading state and inline error surfacing.
- [x] `debit_notes` table (see `docs/DATABASE.md`) and `DebitNotesService.create()` — see "Confirmed reference — Nota débito" above for the full request shape. Loads the target invoice (must have a `dataico_uuid`), reuses its stored customer block, validates stock up front, sends the request, and only after Dataico accepts decrements stock per item via the same `InventoryService.createMovement` invoices use. No resend/refresh for notes in this first pass — add one later the same way `AddUpdatedAtToInvoices` did, if it turns out to be needed.
- [x] `POST/GET /api/invoicing/debit-notes`, `GET /api/invoicing/debit-notes/:id` (ADMIN, EMPLOYEE — same tier as invoices), Swagger-documented.
- [x] `DATAICO_DEBIT_NOTE_PREFIX` (required) and `DEBIT_NOTE_NUMBER_START` (default `1`) added as new env vars — see `docs/ENVIRONMENT_VARIABLES.md`.
- [x] Unit tests: rejects with no open cash register, rejects when the invoice has no Dataico uuid, rejects when the invoice's stored payload has no customer block, rejects on insufficient stock (all without calling Dataico), sends the confirmed payload shape reusing the invoice's uuid/customer, decrements stock only after Dataico succeeds, persists the mapped response excluding `xml`, auto-increments the number per prefix.
- [x] Frontend: "Nota débito" action on `InvoicesListPage` opening a dedicated form (pick products, quantities, tax rates) against that invoice; a `DebitNotesListPage` linked from Facturas to see issued notes.
- [x] `credit_notes` table and `CreditNotesService.create()` — see "Confirmed reference — Nota crédito" above. Same structure as debit notes, but reuses the original invoice's `payment_means`/`payment_means_type`/`payment_date` too (not just `customer`), and — since a credit note returns merchandise — increments stock instead of decrementing it, with no stock-sufficiency check.
- [x] `POST/GET /api/invoicing/credit-notes`, `GET /api/invoicing/credit-notes/:id` (ADMIN, EMPLOYEE), Swagger-documented.
- [x] `DATAICO_CREDIT_NOTE_PREFIX` (required) and `CREDIT_NOTE_NUMBER_START` (default `1`) added as new env vars.
- [x] Unit tests: same coverage shape as debit notes, plus a rejection when the invoice's stored payload is missing `payment_means`, and a case confirming insufficient stock does NOT block a credit note.
- [x] Frontend: "Nota crédito" action on `InvoicesListPage`, a dedicated form (pick products to return, quantities, tax rates), and a `CreditNotesListPage` linked from Facturas.

## Deliberately left out (keep it simple — see `CLAUDE.md`)

- **No draft/dry-run mode exposed.** `actions.send_dian` is hardcoded `true` — an invoice created through this app IS the real submission, no separate "test send" concept in the UI.
- **No DANE department/city catalog.** The form takes raw DANE codes as free text (e.g. `"11"`, `"001"`) rather than a searchable lookup — this store's customer base is small enough that typing the code is acceptable for now.
- **Single, hardcoded tax category (IVA).** No retentions — matches "Estructura básica," not the more complex variants this store doesn't need. A product with no IVA is sent as `tax_rate: 0` under the same `IVA` category (the only one confirmed) — the client marks this as "venta excluida sin IVA" purely as a local UI label, no separate field is sent to Dataico for it.
- **A per-line fixed discount exists, but purely as a local calculation — not a Dataico invoice-level charge/discount field.** `CreateInvoiceItemDto.discount` (a flat COP amount, not a percentage) is subtracted from that line's pre-tax subtotal before IVA is computed, confirmed directly with the human; the discounted amount is folded into the `price`/`tax_base`/`tax_amount` this app already computes and sends, so `price × quantity` on the actual invoice already equals the discounted total. Dataico never sees a "discount" field — see `InvoicesService.resolveItems()`.
- **`Product.salePrice` is confirmed IVA-inclusive** (the price the store actually sells at), so `resolveItems()` unwraps it to a pre-tax equivalent (`salePrice / (1 + taxRate / 100)`) before the discount above and the tax computation ever run — see `GLOSSARY.md`'s "Cost vs. Sale price" entry.
- **No compensation/rollback if stock-decrement or the local save fails after Dataico already accepted the invoice.** Documented as a known, low-probability edge case (single small store, low concurrency) rather than built around with a saga pattern — recoverable manually if it ever happens.
- **`number` auto-increment is a simple `MAX()` read, not a race-proof counter.** `InvoicesService.resolveNextNumber()` reads the highest locally-recorded `number` for the active resolution's prefix and adds one (seeded by `INVOICE_NUMBER_START` if nothing local exists yet — see `docs/ENVIRONMENT_VARIABLES.md`). Two concurrent creates could theoretically compute the same next number; accepted as a low-probability edge case at this store's scale rather than built around with row-locking.
- **`issueDate` is never client-supplied.** Always the store's current local (`America/Bogotá`) day, via the same `getStoreToday()` used by the cash register — "todos son para el mismo día," per direct confirmation, since the whole invoicing flow is already gated to one calendar day by the open cash register (see `docs/GLOSSARY.md` "Caja"). `paymentDate` is only asked in the UI when `paymentMeansType` is `CREDITO`; otherwise it defaults to `issueDate` server-side.

## Payment method values — payment_means_type confirmed; CASH/CARD for payment_means still not

`payment_means_type` is now **fully confirmed**, both values: Dataico's own reference shows `"DEBITO"` = "Contado" (immediate) and `"CREDITO"` = "venta a crédito" (deferred) — exactly the semantics this app uses to decide whether to ask for a payment date. `payment_means` has two confirmed-working values now — `"BANK_TRANSFER"` (sent successfully in the original Phase 10 example) and `"CREDIT_TRANSFER"` (seen in a separate Dataico reference, `// Medio de pago`, not tied to a specific successful send) — both used for "transferencia," so `"BANK_TRANSFER"` was kept as the mapping since it's the one confirmed via an actual accepted request.

**Still not confirmed**: `payment_means` for efectivo and tarjeta. `"CASH"` (efectivo) and `"CARD"` (tarjeta) remain a **best-effort mapping**, flagged as unconfirmed against Dataico — `"CASH"` at least matches the now-removed POS Electrónico module's own confirmed value, `"CARD"` has no precedent anywhere in this integration. **First thing to verify once a real invoice goes through Dataico with each of these two** — see `InvoicesService.create()` and `CreateInvoiceDto`.

## Still not confirmed — do not guess

- **Credit note ("Nota crédito") — confirmed and implemented.** See "Confirmed reference — Nota crédito" above. The original example (health-sector-contaminated — a `health` block with `PLAN_DE_BENEFICIOS`/`PAGO_POR_EVENTO`, `operation: "SS_SIN_APORTE"`, copied verbatim across multiple differently-named requests in the Postman collection) is **not** what this was built against — a second, genuinely clean example (sourced from Dataico's own documentation) confirmed the shape instead. That original contaminated example's `reason: "ANULACION"` is still not trusted; only `"DEVOLUCION"` (from the clean example) is used.
- **Debit note ("Nota débito") — confirmed and implemented.** See "Confirmed reference — Nota débito" above.
- The full valid-value lists for `payment_means`, `payment_means_type`, `tax_level_code`, `regimen`, `party_type`, and debit/credit note `reason` — only the values seen in the confirmed examples are used in the UI's `<select>` options (`reason` is hardcoded server-side for both note types — `OTROS` for debit, `DEVOLUCION` for credit — the only value confirmed for each).
- Neither note type's **response shape** was ever shown in an example (only requests) — both assume the same shape as "Envío Factura"'s confirmed response. First thing to verify once a real note of either kind goes through Dataico.

## Exit criteria (met, for send/resend/query/debit note/credit note)

A sale can produce a real electronic invoice, sent to Dataico, validated by DIAN, with a retrievable CUFE and status; inventory is decremented accordingly; a failed DIAN submission or email can be retried without creating a duplicate document; an invoice's live status can be re-pulled on demand; a debit note can be issued against an already-sent invoice (decrementing inventory further); and a credit note can be issued against one too (returning inventory). Both note types' response-field mapping is an assumption pending a real send — see "Still not confirmed" above.

## Related documents

- `docs/phasesClient/PHASE_10_INVOICING_STANDARD.md`, `docs/DATABASE.md` ("invoices"), `docs/GLOSSARY.md`, `docs/phases/PHASE_8_RESOLUTIONS.md`, `docs/phases/PHASE_9_THIRD_PARTIES.md`
