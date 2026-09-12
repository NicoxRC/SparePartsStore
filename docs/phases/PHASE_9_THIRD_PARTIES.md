# Phase 9 — Consulta DIAN Terceros (Backend)

**Status: Done.**

## Goal

Validate/pre-fill a customer's legal identification data before an invoice is issued against them, instead of trusting whatever is hand-typed.

## Confirmed reference

```
GET https://api.dataico.com/direct/dataico_api/v2/dian_terceros?identification=891303834&identification_type=NIT
Auth-token: <DATAICO_AUTH_TOKEN>
```

Response (confirmed for a NIT lookup):

```json
{
  "email": "facturacion-recepcion@dataico.com",
  "company_name": "DATAICO S.A.S",
  "identification": "901223648",
  "identification_type": "NIT"
}
```

**Not confirmed**: the response shape for a non-NIT identification type (e.g. `CC` for a persona natural) — likely `first_name`/`family_name` instead of `company_name`, by analogy with Phase 10's confirmed invoice `customer` block, but this is an inference, not verified. `ThirdPartyResponseDto` models both as optional so the mapping doesn't break either way, but don't assume the persona-natural shape is correct without testing it.

## What shipped

- [x] `invoicing/third-parties/` module — `ThirdPartiesService.lookup()` calls `GET /dian_terceros`, `ThirdPartiesController` exposes `GET /api/invoicing/third-parties` (roles: ADMIN, EMPLOYEE — a lookup is read-only and low-risk, unlike Phase 8's resolution sync).
- [x] Response mapped to camelCase (`companyName`, `identificationType`, etc.), matching this project's convention of not mirroring Dataico's wire naming into the app's own API.
- [x] Swagger-documented, unit tests for the query-string construction and the response mapping.
- [x] Frontend: `services/thirdParties.ts` + `hooks/useThirdPartyLookup.ts` — no page yet, since a customer lookup doesn't have a natural home until Phase 10's invoice form exists (see `docs/phasesClient/PHASE_9_THIRD_PARTIES.md`).

## Deliberately left out (keep it simple)

- **No local persistence/caching of lookups.** Every call hits Dataico live. This was an open question in the original phase scope, resolved in favor of the simpler option — nothing suggests this store needs an offline/cached customer list yet.
- No UI page — see above; building one now would mean inventing a placeholder screen for a feature that only makes sense inside Phase 10's invoice form.

## Exit criteria (met)

Creating an invoice can pull a customer's legal identification data from this lookup instead of requiring it to be manually re-typed correctly every time — the lookup endpoint exists and is ready for Phase 10 to consume.

## Related documents

- `docs/phasesClient/PHASE_9_THIRD_PARTIES.md`, `docs/GLOSSARY.md` ("Tercero"), `docs/phases/PHASE_10_INVOICING_STANDARD.md`
