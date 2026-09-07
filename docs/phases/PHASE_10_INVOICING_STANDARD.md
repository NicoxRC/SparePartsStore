# Phase 10 — Factura electrónica estándar (Backend)

**Status: Pending — not started.** The centerpiece of the invoicing pivot. Per `docs/PROJECT_ROADMAP.md`'s phase order, this comes **after** Phase 8 (DIAN resolutions) and Phase 9 (Consulta DIAN Terceros) — don't start implementing this phase before those land, even though the reference below happens to already be available.

## Goal

Issue a real, DIAN-validated electronic invoice from a sale, plus credit and debit notes against it.

## Confirmed reference — "Envío Factura" (send invoice)

A real, working request was shared during Phase 7 (to unblock the shared Dataico client's auth mechanism) — recorded here now so it's ready when this phase starts, per this project's own "read the shared reference, don't guess" rule:

```
POST https://api.dataico.com/direct/dataico_api/v2/invoices
Content-Type: application/json
Auth-token: <DATAICO_AUTH_TOKEN>
```

```json
{
  "actions": { "send_dian": true, "send_email": false },
  "invoice": {
    "env": "PRODUCCION",
    "number": "994010611",
    "dataico_account_id": "002979c5-7c23-43ab-aa98-3fa7dce6e4d0",
    "issue_date": "26/06/2024",
    "payment_date": "26/06/2024",
    "invoice_type_code": "FACTURA_VENTA",
    "payment_means": "CREDIT_TRANSFER",
    "payment_means_type": "DEBITO",
    "order_reference": "",
    "numbering": {
      "resolution_number": "18760000001",
      "prefix": "FEE",
      "flexible": true
    },
    "customer": {
      "party_identification_type": "NIT",
      "party_identification": "905445000",
      "party_type": "PERSONA_JURIDICA",
      "tax_level_code": "SIMPLIFICADO",
      "regimen": "SIMPLE",
      "company_name": "NOMBRE DE LA EMPRESA",
      "first_name": "",
      "family_name": "",
      "department": "11",
      "city": "001",
      "address_line": "DIRECCIÓN DEL CLIENTE",
      "country_code": "CO",
      "email": "correodeprueba@gmail.com",
      "phone": "3000000000"
    },
    "items": [
      {
        "sku": "REFERENCIA",
        "quantity": 1,
        "description": "NOMBRE DEL PRODUCTO O SERVICIO",
        "measuring_unit": "94",
        "price": 150000,
        "discount_rate": 10,
        "taxes": [
          { "tax_category": "IVA", "tax_rate": 19, "tax-base": 90, "base_amount": 135000, "tax_amount": 25650 },
          { "tax_category": "IMP_CONSUMO", "tax_rate": 2 }
        ]
      }
    ],
    "notes": ["NOTA U OBSERVACIONES DE LA FACTURA DJ1556"],
    "retentions": [
      { "tax_category": "RET_ICA", "tax_rate": 0.96 },
      { "tax_category": "RET_FUENTE", "tax_rate": 11 }
    ],
    "charges": [
      { "reason": "DESCUENTO POR PRONTO PAGO", "base_amount": 1000, "discount": true }
    ]
  }
}
```

Notes on this payload, recorded so nobody re-derives them from scratch:

- `numbering.resolution_number`/`prefix`/`flexible` is exactly the DIAN resolution data Phase 8 needs to manage — the two phases share this shape.
- `customer.*` is exactly the tercero data Phase 9's lookup should be able to fill in — `party_identification_type`/`party_identification`/`party_type`/`tax_level_code`/`regimen` all look like DIAN catalog codes, not free text; confirm the full valid-value lists once Phase 9's own reference is available rather than assuming only the values seen here (`NIT`, `PERSONA_JURIDICA`, `SIMPLIFICADO`, `SIMPLE`) are the complete sets.
- `items[].taxes[].tax-base` uses a **hyphen**, inconsistent with every other field's underscore convention — this is Dataico's real field name as shown, not a typo to "fix" on our side; sending `tax_base` instead would likely be silently ignored or rejected.
- `env: "PRODUCCION"` implies a sandbox/test value likely exists (e.g. `"PRUEBAS"` or `"HABILITACION"`) — **not confirmed**, don't assume the exact string without checking, since sending production-mode by accident during development would be a real DIAN submission.
- `number` is caller-supplied here — confirm with Phase 8's resolution reference whether this must fall within the resolution's authorized range, and who's responsible for tracking the next available number (this app, or Dataico).
- `dataico_account_id` identifies which Dataico account this invoice is issued under — likely a stable, per-deployment value (env var candidate), not something computed per request. Not yet added as an env var since this phase hasn't started; add it via `docs/ENVIRONMENT_VARIABLES.md` when it does.

## Still not confirmed — do not guess

- Resend invoice ("Reenviar factura"), query invoice ("Consulta Factura"), credit note ("Nota crédito"), and debit note ("Nota débito") request/response shapes — only "Envío Factura" has been shared so far.
- The full success response shape for "Envío Factura" itself (CUFE, Dataico's internal invoice ID, DIAN status) — only the request side is confirmed above.
- Valid value lists for every enum-like field seen above.

## Scope (once this phase actually starts)

- [ ] `invoicing/invoices/` module — depends on `DataicoClientService` (Phase 7, done), an active resolution (Phase 8), ideally customer data (Phase 9)
- [ ] Local schema for an invoice (line items, totals/taxes, customer reference, Dataico's document ID, DIAN status, CUFE, timestamps) — see `docs/DATABASE.md`'s "Invoicing tables" section, now sketched against the payload above but not yet implemented
- [ ] Send invoice, resend invoice, query invoice, credit note, debit note — pending their own reference confirmation where noted above
- [ ] Decide how invoice line items relate to `Product` — likely `sku` maps to `products.reference`, snapshotting price/description at issue time the same way `docs/DATABASE.md` already snapshots other historical data in this project

## Exit criteria

A sale can produce a real electronic invoice, sent to Dataico, validated by DIAN, with a retrievable CUFE and status — and a credit/debit note can be issued against it afterward.

## Related documents

- `docs/phasesClient/PHASE_10_INVOICING_STANDARD.md`, `docs/DATABASE.md` ("Invoicing tables"), `docs/GLOSSARY.md`, `docs/phases/PHASE_7_DATAICO_FOUNDATION.md`
