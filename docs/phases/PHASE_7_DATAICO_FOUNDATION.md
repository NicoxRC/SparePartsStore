# Phase 7 — Dataico foundation (Backend)

**Status: Pending.**

## Goal

Build the shared plumbing every invoicing phase depends on, once, instead of each Dataico module reinventing auth/config/error-handling.

## Scope

- [ ] `invoicing/dataico/dataico-client.service.ts` — authenticated HTTP client wrapping Dataico's API (auth mechanism TBD from the reference: API key, Bearer token, OAuth — see "Pending Dataico reference" below)
- [ ] `invoicing/dataico/dataico.config.ts` — typed config via `ConfigService` (base URL, credentials, sandbox vs. production flag)
- [ ] `invoicing.module.ts` scaffolded, ready for sub-domain modules (`resolutions/`, `third-parties/`, `invoices/`, `reception-events/`, ...)
- [ ] Global exception filter (`common/filters/http-exception.filter.ts`) — the API currently has none, see `docs/ARCHITECTURE.md`'s "Response format" note
- [ ] `@nestjs/swagger` wired up in `main.ts`, served at `/api/docs` or similar — required on every endpoint added from this phase forward, per `docs/DEFINITION_OF_DONE.md`
- [ ] Consistent Dataico-error-to-application-error mapping (a rejected/malformed request to Dataico should surface as a clear, actionable NestJS exception, not a raw passthrough)

## Pending Dataico reference

This phase needs, at minimum, the collection-level **Authorization** setup (API key vs. Bearer vs. OAuth) shared from the Postman workspace before the client service can be implemented for real — see `CLAUDE.md`. Everything else in this phase (exception filter, Swagger) can be built independently of that.

## Definition of done for this phase

- `npm run start:dev` still runs cleanly with the new module registered but empty (no sub-domains yet)
- A unit test exists for `DataicoClientService` against a mocked HTTP layer, not a real Dataico call
- Swagger UI is reachable and documents at least one existing endpoint as a smoke test

## Out of scope

No actual invoice/resolution/third-party logic yet — that's phases 8 onward.

## Related documents

- `docs/ARCHITECTURE.md` ("Invoicing module"), `docs/ENVIRONMENT_VARIABLES.md` ("Invoicing (Dataico) — pending")
