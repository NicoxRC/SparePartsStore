# Phase 7 — Dataico foundation (Backend)

**Status: In progress.** The non-Dataico-specific plumbing is done; the actual Dataico client is blocked on the Authorization reference (see below).

## Goal

Build the shared plumbing every invoicing phase depends on, once, instead of each Dataico module reinventing auth/config/error-handling.

## Scope

- [x] Global exception filter (`common/filters/http-exception.filter.ts`) — normalizes every thrown exception to `{ statusCode, message, error?, timestamp, path }` without altering any existing field consumers already match on (e.g. `PasswordChangeRequired`); unrecognized errors are logged and mapped to a generic 500. Registered in `main.ts` via `app.useGlobalFilters(...)`. Unit-tested in `http-exception.filter.spec.ts`.
- [x] `@nestjs/swagger@11.4.7` wired up in `main.ts`, served at `/api/docs`. `auth` module fully documented (`@ApiTags`/`@ApiOperation`/`@ApiResponse`, `@ApiProperty` on its DTOs and on `UserResponseDto`) as the required smoke test — every **new** endpoint from this point on needs the same, per `docs/DEFINITION_OF_DONE.md`.
- [x] `invoicing.module.ts` scaffolded (empty `@Module({})`) and registered in `app.module.ts`, ready for sub-domain modules (`resolutions/`, `third-parties/`, `invoices/`, `reception-events/`, ...).
- [ ] `invoicing/dataico/dataico-client.service.ts` — authenticated HTTP client wrapping Dataico's API (auth mechanism TBD from the reference: API key, Bearer token, OAuth — see "Pending Dataico reference" below)
- [ ] `invoicing/dataico/dataico.config.ts` — typed config via `ConfigService` (base URL, credentials, sandbox vs. production flag)
- [ ] Consistent Dataico-error-to-application-error mapping (a rejected/malformed request to Dataico should surface as a clear, actionable NestJS exception, not a raw passthrough)

## Pending Dataico reference

This phase needs, at minimum, the collection-level **Authorization** setup (API key vs. Bearer vs. OAuth) shared from the Postman workspace before the client service can be implemented for real — see `CLAUDE.md`. Everything else in this phase (exception filter, Swagger) can be built independently of that.

## Definition of done for this phase

- [x] `npm run build` / `npm run lint` / `npm run test` all pass with `InvoicingModule` registered but empty
- [x] Swagger UI is reachable at `/api/docs` and documents the `auth` module as the smoke test
- [ ] A unit test exists for `DataicoClientService` against a mocked HTTP layer, not a real Dataico call — pending the client itself

## Out of scope

No actual invoice/resolution/third-party logic yet — that's phases 8 onward.

## Related documents

- `docs/ARCHITECTURE.md` ("Invoicing module"), `docs/ENVIRONMENT_VARIABLES.md` ("Invoicing (Dataico) — pending")
