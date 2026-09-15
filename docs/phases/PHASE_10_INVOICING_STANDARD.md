# Phase 10 — Factura electrónica estándar (Backend)

**Status: Done** — send, resend, and query. Credit note and debit note remain pending (see below). The centerpiece of the invoicing pivot.

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

## Deliberately left out (keep it simple — see `CLAUDE.md`)

- **No draft/dry-run mode exposed.** `actions.send_dian` is hardcoded `true` — an invoice created through this app IS the real submission, no separate "test send" concept in the UI.
- **No DANE department/city catalog.** The form takes raw DANE codes as free text (e.g. `"11"`, `"001"`) rather than a searchable lookup — this store's customer base is small enough that typing the code is acceptable for now.
- **Single, hardcoded tax category (IVA).** No retentions, no invoice-level charges/discounts — matches "Estructura básica," not the more complex variants this store doesn't need. A product with no IVA is sent as `tax_rate: 0` under the same `IVA` category (the only one confirmed) — the client marks this as "venta excluida sin IVA" purely as a local UI label, no separate field is sent to Dataico for it.
- **No compensation/rollback if stock-decrement or the local save fails after Dataico already accepted the invoice.** Documented as a known, low-probability edge case (single small store, low concurrency) rather than built around with a saga pattern — recoverable manually if it ever happens.
- **`number` auto-increment is a simple `MAX()` read, not a race-proof counter.** `InvoicesService.resolveNextNumber()` reads the highest locally-recorded `number` for the active resolution's prefix and adds one (seeded by `INVOICE_NUMBER_START` if nothing local exists yet — see `docs/ENVIRONMENT_VARIABLES.md`). Two concurrent creates could theoretically compute the same next number; accepted as a low-probability edge case at this store's scale rather than built around with row-locking.
- **`issueDate` is never client-supplied.** Always the store's current local (`America/Bogotá`) day, via the same `getStoreToday()` used by the cash register — "todos son para el mismo día," per direct confirmation, since the whole invoicing flow is already gated to one calendar day by the open cash register (see `docs/GLOSSARY.md` "Caja"). `paymentDate` is only asked in the UI when `paymentMeansType` is `CREDITO`; otherwise it defaults to `issueDate` server-side.

## Payment method values — payment_means_type confirmed; CASH/CARD for payment_means still not

`payment_means_type` is now **fully confirmed**, both values: Dataico's own reference shows `"DEBITO"` = "Contado" (immediate) and `"CREDITO"` = "venta a crédito" (deferred) — exactly the semantics this app uses to decide whether to ask for a payment date. `payment_means` has two confirmed-working values now — `"BANK_TRANSFER"` (sent successfully in the original Phase 10 example) and `"CREDIT_TRANSFER"` (seen in a separate Dataico reference, `// Medio de pago`, not tied to a specific successful send) — both used for "transferencia," so `"BANK_TRANSFER"` was kept as the mapping since it's the one confirmed via an actual accepted request.

**Still not confirmed**: `payment_means` for efectivo and tarjeta. `"CASH"` (efectivo) and `"CARD"` (tarjeta) remain a **best-effort mapping**, flagged as unconfirmed against Dataico — `"CASH"` at least matches the now-removed POS Electrónico module's own confirmed value, `"CARD"` has no precedent anywhere in this integration. **First thing to verify once a real invoice goes through Dataico with each of these two** — see `InvoicesService.create()` and `CreateInvoiceDto`.

## Still not confirmed — do not guess

- **Credit note ("Nota crédito") — blocked, not just pending.** The only example shared is contaminated with health-sector fields (a `health` block with `PLAN_DE_BENEFICIOS`/`PAGO_POR_EVENTO`, and `operation: "SS_SIN_APORTE"`) — copied verbatim across multiple differently-named requests in the Postman collection ("Enviar Nota Credito" and "Enviar Nota Credito - Anular FE SS-CUFE" have the *identical* body), which means it's a generic/reused test fixture, not a real standard-invoicing example. Confirmed with the human not to implement against this. Needs either a genuinely clean example or a live test with Dataico support before building.
- **Debit note ("Nota débito") — deferred by choice, not blocked.** Its one example looks clean (matches the invoice's own customer shape, no health contamination), but was deliberately not implemented alongside resend/query — the human asked to treat credit and debit notes as one pair, and to hold off until the credit note situation above is resolved, rather than shipping half the pair.
- The full valid-value lists for `payment_means`, `payment_means_type`, `tax_level_code`, `regimen`, `party_type` — only the values seen in the confirmed examples are used in the UI's `<select>` options.

## Exit criteria (met, for send/resend/query)

A sale can produce a real electronic invoice, sent to Dataico, validated by DIAN, with a retrievable CUFE and status; inventory is decremented accordingly; a failed DIAN submission or email can be retried without creating a duplicate document; and an invoice's live status can be re-pulled on demand. Credit/debit notes remain follow-up work — see "Still not confirmed" above.

## Related documents

- `docs/phasesClient/PHASE_10_INVOICING_STANDARD.md`, `docs/DATABASE.md` ("invoices"), `docs/GLOSSARY.md`, `docs/phases/PHASE_8_RESOLUTIONS.md`, `docs/phases/PHASE_9_THIRD_PARTIES.md`
