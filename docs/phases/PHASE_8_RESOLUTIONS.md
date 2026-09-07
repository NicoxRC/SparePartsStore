# Phase 8 — DIAN resolutions (Backend)

**Status: Pending — endpoint paths confirmed, one payload shape needs clarification before implementing (see below).**

## Goal

A business can't legally send an electronic invoice without an active DIAN numbering resolution on file (see `docs/GLOSSARY.md`). Get this on file before any invoice-sending phase, not after.

## Confirmed — two separate endpoints, one per document type

Dataico calls this "numbering sync," not "resolution," in the actual URL:

```
POST https://api.dataico.com/direct/dataico_api/v2/numberings/sync_dian/support_docs   # Documento soporte
POST https://api.dataico.com/direct/dataico_api/v2/numberings/sync_dian/invoice        # Factura electrónica
Content-Type: application/json
Auth-token: <DATAICO_AUTH_TOKEN>
```

### Confirmed body shape — "Documento soporte" (`support_docs`)

This example has real-looking values (an actual resolution number, real dates, a real DIAN response code) — treated as solid:

```json
{
  "numberings": [
    {
      "prefix": "EF",
      "numbering_type": "RESOLUCIONES_DIAN",
      "subtype": "ELECTRONICO",
      "dian_resolutions": [
        {
          "code": "SDJ-002",
          "code_msg": "Esta resolución de la DIAN fue agregada correctamente",
          "number": "18764075467155",
          "start": 50,
          "end": 200,
          "start_date": "21/07/2024",
          "end_date": "21/07/2025"
        }
      ]
    }
  ]
}
```

- `code`/`code_msg` look like they echo Dataico's own validation response for that resolution, not something the caller invents — **needs confirming**: is this pair required in the request, or only present because this example was copied from a response/history entry rather than a fresh request body?
- Dates are `DD/MM/YYYY`, matching Phase 10's confirmed `issue_date`/`payment_date` format.
- `start`/`end` are the resolution's authorized numbering range (plain integers).

### NOT confirmed — "Factura electrónica" (`invoice`) — field naming conflicts with the example above

The shared example for this endpoint uses generic placeholder values (`"string"`, `0`) and, critically, **hyphenated field names** instead of the underscore convention every other confirmed Dataico field uses (`code-msg`, `technical-key`, `start-date`, `end-date` vs. the `support_docs` example's `code_msg`/`start_date`/`end_date`):

```json
{
  "numberings": [
    {
      "prefix": "FE",
      "numbering_type": "RESOLUCIONES_DIAN",
      "subtype": "POS",
      "dian_resolutions": [
        {
          "code": "string",
          "code-msg": "string",
          "number": "string",
          "start": 0,
          "end": 0,
          "technical-key": "string",
          "start-date": "string",
          "end-date": "string"
        }
      ]
    }
  ]
}
```

**Do not implement against this example as-is.** Two things need clarification from the human before writing any code for the `invoice` numbering endpoint:

1. **Field naming**: hyphens (`code-msg`, `start-date`, `end-date`, `technical-key`) or underscores (matching the confirmed `support_docs` example and every other Dataico field seen so far)? Sending the wrong one to a real DIAN-facing endpoint either gets silently ignored or rejected — this isn't a case to guess and find out.
2. **`subtype: "POS"`**: this example used `POS`, not `ELECTRONICO` like the `support_docs` example — is `subtype` actually endpoint-independent (i.e. the `invoice` endpoint can register either an `ELECTRONICO` or a `POS`-flavored resolution depending on this field, and the example just happened to show `POS`), or was `ELECTRONICO` expected here and the example is simply wrong/generic? This affects whether Phase 12 (POS Electrónico) shares this same endpoint or has its own.

**Suggested next step**: in Postman, open the "Asociar nueva resolución - FE" request's **Examples** tab (not just its default body) — if a previously-saved real response exists there (like the `support_docs` request evidently has), it'll resolve both questions with actual data instead of Postman's auto-generated placeholder schema.

## Scope (once the above is resolved)

- [ ] `invoicing/resolutions/` module — depends on `DataicoClientService` (Phase 7, done)
- [ ] One method (or two, if the endpoints turn out to need materially different payload builders) to sync/associate a resolution for a given document type
- [ ] A local record of the active resolution(s) — number range, validity window, document type — so the app doesn't have to query Dataico live on every invoice attempt just to know if a resolution is active (see `docs/DATABASE.md`)
- [ ] Admin-facing read view of current resolution status
- [ ] Per `CLAUDE.md`'s "keep it simple" principle: this store almost certainly only ever needs the `invoice` (Factura electrónica) numbering active, possibly `support_docs` if Phase 13 turns out to be in scope — don't build generic support for numbering types this store won't use (Nómina, health-sector) just because Dataico's schema allows it.

## Exit criteria

An admin can see which DIAN resolution(s) this business is currently authorized to invoice under, and a resolution can be associated/updated through the app rather than only through Dataico's own portal.

## Related documents

- `docs/phasesClient/PHASE_8_RESOLUTIONS.md`, `docs/GLOSSARY.md` ("Resolución DIAN"), `docs/phases/PHASE_10_INVOICING_STANDARD.md` (the confirmed invoice payload's `numbering` block, which this phase's data feeds)
