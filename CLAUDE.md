# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

It defines how to work in this codebase. Follow it exactly — it is not optional guidance, it's the operating contract for this project.

## Project overview

**CasaRespuestos** is an inventory + counter-sale + **electronic invoicing (facturación electrónica)** system for one small car spare-parts store in Colombia. Invoices, credit notes and debit notes are issued through the **Dataico API** (DIAN-compliant). One monorepo, two independent apps with their own `package.json` (no root `package.json`, no workspaces — always `cd` into the app):

```
SparePartsStore/
├── apps/
│   ├── api/       # NestJS 11 + TypeORM + PostgreSQL — deploys to Railway
│   └── client/    # React 19 + Vite + Tailwind 4 SPA (PWA), mobile-first — deploys to Vercel
├── docs/          # Shared project documentation (source of truth, see below)
├── PRODUCT.md     # Who uses the app and in what context — read for any UI work
└── DESIGN.md      # Design tokens and visual language — read for any UI work
```

**Keep it simple.** The client is a small car spare-parts store, not an enterprise — they've explicitly asked for the app to stay as simple and fast as possible. Before adding a module, an abstraction, a config option, or handling for an edge case, check whether the store actually needs it or whether it's just the "more complete" way to build something. Default to the simpler option. This applies with extra weight to anything invoicing-related — Dataico's API surface is large, and it would be easy to build far more depth than a small store's day-to-day sales actually require. When scoping work, say explicitly what was left out to keep it simple, so it reads as a decision, not an oversight.

**Sisco is retired.** The system used to export an `.xlsx` file for a separate invoicing tool called Sisco. Dataico's API is the only invoicing channel — don't reintroduce Excel-export-as-invoicing (see `docs/GLOSSARY.md`). The `exceljs` dependency that exists today belongs to purchase imports, not to Sisco.

## Commands

Run from inside the app folder.

### `apps/api`

```bash
docker compose up -d                 # from the repo root — local PostgreSQL
npm run start:dev                    # http://localhost:3000, routes under /api, Swagger at /api/docs
npm run build
npm run lint                         # eslint --fix — it rewrites files, check the diff afterwards
npm run format                       # prettier --write
npm run test                         # jest, all *.spec.ts under src/
npx jest src/inventory/inventory.service.spec.ts              # one file
npx jest src/inventory/inventory.service.spec.ts -t "negative" # one test by name
npm run test:cov                     # informational, no threshold

npm run migration:generate -- src/database/migrations/<Name>
npm run migration:create -- src/database/migrations/<Name>    # empty, hand-written
npm run migration:run
npm run migration:revert

npm run seed:product-lookups         # legacy department/group/brand catalog
npm run seed:admin                   # first admin from SEED_ADMIN_* env vars
npm run seed:legacy-customers
```

There are no e2e tests — out of scope (`docs/TESTING.md`).

### `apps/client`

```bash
npm run dev                          # http://localhost:5173, needs VITE_API_URL in .env
npm run lint                         # eslint, no --fix
npm run build                        # tsc -b && vite build — this is the only type-check
```

The client has **no test runner**. Its bar is `npm run lint` plus `npm run build` passing, and manually exercising the change in a browser.

## Required reading before writing any code

Before starting _any_ task, read these documents in `docs/`, in this order:

1. `docs/ARCHITECTURE.md` — folder structure, module organization, response format, versioning.
2. `docs/CODING_STANDARDS.md` — naming conventions, TypeScript rules, import order (applies to both apps).
3. `docs/DEFINITION_OF_DONE.md` — the checklist a task must satisfy before it's considered complete.
4. `docs/CONTRIBUTING.md` — branch naming, commit format, PR process.
5. `docs/PROJECT_ROADMAP.md` — phase order and what is done, removed, or out of scope. **Never build functionality from a later phase before the current one is done.**

For anything touching business logic or the data model (products, stock movements, invoices, DIAN resolutions, cash register, quotations, etc.), also read `docs/GLOSSARY.md` and `docs/DATABASE.md` regardless of which app you're working in — the vocabulary and the confirmed data model are shared.

If a specific phase brief exists for the task at hand (`docs/phases/` for `api`, `docs/phasesClient/` for `client`), read that too — it has the concrete scope for that phase.

For any client UI work, also read `PRODUCT.md` and `DESIGN.md` at the repo root.

**For any invoicing/Dataico work specifically**: a phase brief only has the high-level goal until the human shares the corresponding Dataico Postman reference for that module. **Never guess Dataico endpoint paths, payload shapes, or auth mechanics.** If the reference for what you need hasn't been shared, stop and ask instead of inventing plausible-looking API calls. `docs/PROJECT_ROADMAP.md` records which of the 8 Dataico collections are built, removed (POS Electrónico), or confirmed out of scope (Eventos de recepción, sector salud).

## Architecture — the parts that span several files

`docs/ARCHITECTURE.md` has the full breakdown. What you need in your head before touching anything:

### API

- **Module per business domain** under `apps/api/src/`, each `Controller → Service → TypeORM Repository`. Controllers hold no business logic; services own it and are the layer that must be unit-tested.
- **Everything is authenticated by default.** `AuthModule` registers `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard` as global guards, in that order. Opt out with `@Public()`; restrict with `@Roles(...)`; narrow further for `employee` only with `@RequirePermission(...)` (admin is a fixed superuser, auditor fixed read-only — both bypass the permission check). The permission catalog lives in `common/constants/permission.constant.ts` and is mirrored on the client in `lib/permissions.ts`.
- **No success-response wrapper.** Controllers return the DTO/entity directly; list endpoints return `PaginatedResponseDto<T>` (`{ data, meta }`) built by the service. Errors are normalized by the global `HttpExceptionFilter`. The global `ValidationPipe` runs with `whitelist` + `forbidNonWhitelisted` + `transform`, so an undeclared field in a request body is a 400.
- **Routes are prefixed `/api`, with no version segment.**
- **Schema changes only through migrations** (`synchronize: false`). `SnakeNamingStrategy` maps camelCase properties to snake_case columns in both `app.module.ts` and `database/data-source.ts`. Entities extend `common/entities/base.entity.ts` and are soft-deleted; `InventoryMovement` is the deliberate append-only exception.
- **Stock only changes through `InventoryService.createMovement`**, which locks the product row and rejects negative stock. It and `ProductsService.create` accept an optional `EntityManager` so a caller (purchase-import confirm) can make a multi-service write atomic — use that pattern rather than opening nested transactions.
- **Invoicing lives under `src/invoicing/`**: `dataico/` holds the one authenticated HTTP client (`DataicoClientService`, custom `Auth-token` header) and typed config; `resolutions/`, `third-parties/`, `invoices/`, `credit-notes/`, `debit-notes/`, `payroll/` are sub-domains. Sub-domain modules import `DataicoModule`, never `InvoicingModule` (that would be circular — `InvoicingModule` only aggregates).
- **Document numbers are assigned locally** as `MAX(number) + 1` under a Postgres advisory lock (`common/utils/numbering-lock.util.ts`), because the row is only saved after Dataico answers.
- **Money rules are server-side.** `Product.salePrice` already includes IVA; a line's tax rate is derived only from `Product.taxExempt` via `common/utils/invoice-math.util.ts` and is never client-supplied. The client's `lib/invoiceMath.ts` mirrors that math for display — change both together.
- **Cash register (caja) gates sales.** There are fixed tills; the request's till comes from the `X-Cash-Register` header via `@CurrentCashRegister()`, and `InvoicesService.create` requires that till to be open today. "Today" is the store's Bogotá calendar day (`common/utils/store-date.util.ts`), not the server's UTC day.
- **Quotations (cotizaciones)** decrement stock like a sale and later convert into a real invoice through `InvoicesModule` with an internal skip-stock flag.
- **Purchase imports** (`purchase-imports/`) are local, not Dataico: supplier XML or Excel template → draft → confirm, which creates products and stock atomically.

### Client

- `pages/` (route-level) → `hooks/use*.ts` (TanStack Query, one file per domain) → `services/*.ts` (axios wrappers) → `lib/api.ts` (axios instance: bearer token, single-flight refresh on 401, redirect on `403 PasswordChangeRequired`, cash-register header). Components never call axios or a service directly. Mutations invalidate every query key their change affects.
- Forms are React Hook Form + a Zod schema in `lib/schemas/`.
- Route guards: `ProtectedRoute`, `AdminRoute`, `EmployeeRoute`, `PermissionRoute`.
- `InvoiceDraftsProvider` is mounted above `<Routes>` and mirrored to `localStorage` so several in-progress invoices survive navigation and refresh. It is the one deliberate exception to page-local state.
- `config/dataico.ts` exports `DATAICO_ENABLED`, a **code constant** (not an env var) that enables every Dataico-calling menu entry and button. `config/business.ts` holds the store's own legal data printed on receipts.

## Dataico safety

This is real electronic invoicing with legal and tax consequences.

- `DATAICO_SEND_DIAN` and `DATAICO_SEND_EMAIL` decide whether a created document is actually submitted to DIAN / emailed to the customer. Only the literal `true` turns one on. Never flip them, and never point a local run at real credentials with them on, without the human explicitly asking.
- Never call Dataico from a unit test — mock `DataicoClientService` with responses shaped exactly like the shared Postman examples (`docs/TESTING.md`). Any manual run against the real API is a deliberate, human-supervised step.
- Surface Dataico/DIAN rejection messages to the user in an actionable form; don't swallow them into a generic error.
- `Facturas/` (gitignored) holds real supplier invoices used for manual testing of purchase imports. Never commit it or copy its contents into fixtures.

## Skills

Project skills live in `.agents/skills/` (symlinked into `.claude/skills/`, pinned by `skills-lock.json`): `nestjs-best-practices`, `nestjs-patterns`, `typeorm`, `vercel-react-best-practices`, `frontend-design`, `impeccable`. **Before starting any task, check whether a relevant skill exists there and read it fully before writing code** — treat it as required reading, the same as the docs above. If more than one could plausibly apply, read all of them.

Where a generic skill recommendation conflicts with this project's docs or its keep-it-simple rule (e.g. caching, queues, microservice patterns, a repository abstraction layer), the project docs win.

## Specialized agents

Three sub-agents are defined in `.claude/agents/`:

- **Architect** — designs schema, module structure, and API contract for a new domain. Start here before writing code for one.
- **Backend** — implements NestJS; waits for the Architect's contract before coding.
- **Frontend** — implements React UI; waits for the Architect's contract before coding.

Typical workflow: Architect first, then Backend and Frontend in parallel — this is why `docs/phases/` and `docs/phasesClient/` are split per side.

## Git workflow

Solo/AI-driven project, no external tracker — the phase in `docs/PROJECT_ROADMAP.md` is the unit of tracking. Read `docs/CONTRIBUTING.md` before opening a branch or committing.

- Conventional Commits for every commit message: `<type>(<scope>): <description>`, scope = the module (`invoices`, `cash-register`, `client`, …). No ticket IDs in branch names or commits.
- For anything multi-step, use a `feature/<short-description>` branch off `main` and open a PR (squash-merge; the human is the sole approver — don't merge without their go-ahead). For a small, self-contained fix, committing directly to `main` is acceptable — don't force ceremony onto a one-line change.
- Never add AI attribution to commits or PR descriptions **unless the current session's system instructions explicitly say otherwise** — some sessions are configured to require a `Co-Authored-By` trailer; when that's the case, follow it.

## Working process for each task

1. Read the relevant phase brief in `docs/phases/` or `docs/phasesClient/`, if one exists.
2. If the task touches a new domain, run the Architect agent first for the schema/contract.
3. Create a feature branch for anything beyond a trivial fix.
4. Implement in small steps, committing after each coherent piece.
5. Write service unit tests as you go, per `docs/TESTING.md` — spec files sit next to the file they test, repositories are mocked via `getRepositoryToken()`.
6. Run lint and tests (api) / lint and build (client) for every app you touched.
7. Update any docs affected by what you built:
   - New env var → `.env.example` **and** `docs/ENVIRONMENT_VARIABLES.md`
   - New migration → add its row to the chronological table in `docs/DATABASE.md` and update the affected table section
   - New module or cross-module dependency → `docs/ARCHITECTURE.md`
   - New endpoint → Swagger decorators (`@ApiTags`/`@ApiOperation`/`@ApiResponse`/`@ApiProperty`)
   - Resolved an open question in `docs/DATABASE.md` or `docs/GLOSSARY.md` → remove the flag once confirmed
8. Self-check against `docs/DEFINITION_OF_DONE.md` before opening the PR (or before considering a direct-to-`main` commit finished).

### Migrations

`migration:generate` against a local database has repeatedly produced unrelated drift across other tables (timestamp column types, FK churn). Review the generated SQL every time and cut it down to the change you actually made — most recent migrations are minimal hand-written ones for this reason. Filenames are `<timestamp>-<PascalCaseName>.ts`.

## When something is ambiguous

- Check `docs/GLOSSARY.md` and `docs/DATABASE.md` first — many business rules and open questions are already flagged there.
- For anything involving Dataico/DIAN specifics not yet confirmed by a shared API reference, **stop and ask the human** — a wrong guess can mean a rejected or malformed DIAN submission.
- For purely technical decisions not covered by the docs, use your judgment consistently with `docs/CODING_STANDARDS.md` and `docs/ARCHITECTURE.md`, and mention the decision when you report the work so the human can flag it if they disagree.

## What not to do

- Don't invent Dataico API shapes, endpoint paths, or field names.
- Don't skip tests to move faster — untested service logic is not done.
- Don't build ahead of the current phase in `docs/PROJECT_ROADMAP.md`, and don't rebuild something it records as removed or out of scope.
- Don't leave a fix half-done because it crosses from `apps/api` into `apps/client` (or vice versa) — both apps are yours to maintain in the same pass.
- Don't read `process.env` outside config — use `ConfigService`.
- Don't put raw user input into an `ILIKE` pattern — use the escaping helper in `common/utils/`.
- Don't guess at ambiguous business rules that are explicitly marked as pending confirmation in `docs/DATABASE.md` or `docs/GLOSSARY.md`.
