# Phase 7 — Dataico foundation (Backend)

**Status: Done.**

## Goal

Build the shared plumbing every invoicing phase depends on, once, instead of each Dataico module reinventing auth/config/error-handling.

## What shipped

- [x] Global exception filter (`common/filters/http-exception.filter.ts`) — normalizes every thrown exception to `{ statusCode, message, error?, timestamp, path }` without altering any existing field consumers already match on (e.g. `PasswordChangeRequired`); unrecognized errors are logged and mapped to a generic 500. Registered in `main.ts` via `app.useGlobalFilters(...)`.
- [x] `@nestjs/swagger@11.4.7` wired up in `main.ts`, served at `/api/docs`. `auth` module fully documented (`@ApiTags`/`@ApiOperation`/`@ApiResponse`, `@ApiProperty` on its DTOs and on `UserResponseDto`) as the required smoke test.
- [x] `invoicing.module.ts` scaffolded and registered in `app.module.ts`, ready for sub-domain modules (`resolutions/`, `third-parties/`, `invoices/`, `reception-events/`, ...).
- [x] `invoicing/dataico/dataico.config.ts` — typed config via `ConfigService`, reading `DATAICO_BASE_URL` (defaults to `https://api.dataico.com/direct/dataico_api/v2`) and `DATAICO_AUTH_TOKEN`.
- [x] `invoicing/dataico/dataico-client.service.ts` — authenticated HTTP client using Node's built-in `fetch`. **Auth mechanism confirmed**: a custom `Auth-token: <token>` header on every request (not Bearer, not OAuth) — verified against a real request shared for the "Factura electrónica estándar" collection.
- [x] `invoicing/dataico/dataico-api.exception.ts` — maps a non-2xx Dataico response to a `DataicoApiException`: passes through Dataico's own status for a 4xx (actionable — e.g. a rejected invoice), maps anything else (network failure, upstream 5xx) to `502 Bad Gateway`.
- [x] Unit tests for both the exception filter and the Dataico client (mocked `fetch`), covering the happy path, a 4xx passthrough, a network failure, and a 5xx-to-502 mapping.

## How the Authorization reference was obtained

A real, working cURL request for `POST https://api.dataico.com/direct/dataico_api/v2/invoices` (the "Envío Factura" endpoint from the "1. Factura electrónica estándar" collection) was shared directly by the human, showing the `Auth-token` header in use. This unblocked the client/config for **every** Dataico module, not just invoicing — the same base URL and header apply across the API. See `docs/phases/PHASE_10_INVOICING_STANDARD.md` for what that same request revealed about the invoice payload shape itself (recorded there, not implemented yet — Phase 10 hasn't started).

## Exit criteria (met)

A shared, tested Dataico client exists that every subsequent invoicing module can inject rather than re-implement; every new endpoint from this point on is Swagger-documented.

## Related documents

- `docs/ARCHITECTURE.md` ("Invoicing module"), `docs/ENVIRONMENT_VARIABLES.md` ("Invoicing (Dataico)"), `docs/phases/PHASE_10_INVOICING_STANDARD.md`
