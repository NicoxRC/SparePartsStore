# Architecture

This document describes how the codebase is organized and the key design decisions behind it. If you're new to the project, read this before writing any code.

## Overview

CasaRespuestos is a monorepo with two independent applications that communicate over HTTP:

```
SparePartsStore/
├── apps/
│   ├── api/       # NestJS REST API — inventory, product catalog, invoicing/Dataico
│   └── client/    # React + Vite SPA — mobile-first admin panel
└── docs/          # This documentation
```

`api` deploys to Railway, `client` deploys to Vercel. The only contract between them is the REST API defined by `api`.

---

## API — NestJS

### Module-per-domain organization

The API is organized by **business domain**, not by technical layer — each domain owns its own controller, service, entities, and DTOs. Current modules under `apps/api/src/`:

```
apps/api/src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── strategies/
│   │   ├── local.strategy.ts           # email/password on login
│   │   ├── jwt.strategy.ts             # access token
│   │   └── jwt-refresh.strategy.ts     # refresh token
│   ├── dto/
│   └── types/
│       └── jwt-payload.interface.ts
│
├── users/
│   ├── users.controller.ts             # ADMIN-only
│   ├── users.service.ts
│   ├── entities/user.entity.ts
│   └── dto/
│
├── products/
│   ├── products.controller.ts
│   ├── products.service.ts
│   ├── entities/product.entity.ts
│   └── dto/
│
├── departments/                         # lookup — Departamento
├── groups/                              # lookup — Grupo (table: product_groups)
├── brands/                              # lookup — Marca
│   (all three share an identical shape — see DATABASE.md)
│
├── inventory/
│   ├── inventory.controller.ts
│   ├── inventory.service.ts
│   └── entities/inventory-movement.entity.ts
│
├── export/
│   ├── export.controller.ts
│   └── export.service.ts               # legacy Sisco .xlsx export — being retired, see PROJECT_ROADMAP.md
│
├── invoicing/                           # NEW — Dataico integration, see "Invoicing module" below
│
├── common/
│   ├── decorators/                      # @Roles(), @Public(), @SkipPasswordCheck(), @CurrentUser()
│   ├── dto/                             # PaginatedResponseDto, PaginationMetaDto
│   ├── entities/base.entity.ts          # id/createdAt/updatedAt/deletedAt shared base
│   ├── enums/                           # UserRole, SaleType, MovementType
│   ├── guards/                          # JwtAuthGuard, RolesGuard, LocalAuthGuard, JwtRefreshAuthGuard
│   └── utils/                           # isUniqueViolation(), ILIKE-escaping helper
│
├── database/
│   ├── data-source.ts                   # TypeORM CLI data source
│   ├── migrations/
│   └── seeds/                           # seed-admin.ts, seed-product-lookups.ts
│
├── app.module.ts
└── main.ts
```

### Layering within each module

```
Controller → Service → Repository (TypeORM)
```

- **Controller**: HTTP concerns only — routes, request/response shape, status codes. No business logic.
- **Service**: owns all business logic — validation, calculations, side effects, transactions. This is the layer `TESTING.md` requires unit tests for.
- **Repository**: TypeORM's injected repository. Services never run raw SQL or hold a direct connection.

A controller never talks to a repository directly — always through a service.

### Global guards — everything is protected by default

`AuthModule` registers `JwtAuthGuard` and `RolesGuard` as global guards (`APP_GUARD`). **Every endpoint in the entire API requires a valid access token by default**, and `RolesGuard` enforces any `@Roles(...)` decorator present. To opt an endpoint out:

- `@Public()` — skips the JWT check entirely (login, refresh).
- `@SkipPasswordCheck()` — still requires a valid JWT, but is exempt from the forced-password-change block (see `GLOSSARY.md` "Forced password change").

No `@Roles(...)` on a controller/handler means any authenticated user of any role can call it.

### API prefix and versioning

All routes are prefixed with `/api` (`app.setGlobalPrefix('api')` in `main.ts`). **There is no `/v1` segment** — this was never introduced, unlike what an earlier draft of the Requirements doc assumed. If a breaking API change is ever needed, introduce versioning at that point rather than pre-emptively.

### Response format

There is **no global response interceptor for success responses** — a controller returns its DTO/entity/array directly, with no `{ success, data }` wrapper.

- **List endpoints** are the one place with a consistent success shape, but it's explicit, not interceptor-driven: they return `PaginatedResponseDto<T>` (`common/dto/`) — `{ data: T[], meta: { total, page, limit, totalPages } }` — built by the service itself.
- **Errors** go through a global exception filter (`common/filters/http-exception.filter.ts`, added in Phase 7) which normalizes every thrown exception into `{ statusCode, message, error?, timestamp, path }`. It never renames or drops a field an existing exception already sets — e.g. `JwtAuthGuard`'s `{ statusCode: 403, error: 'PasswordChangeRequired', message: '...' }` (matched by field name in `apps/client/src/lib/api.ts`) passes through unchanged, just with `timestamp`/`path` appended. An unrecognized (non-`HttpException`) error is logged server-side and mapped to a generic `500`.

**Swagger** (`@nestjs/swagger`) is wired up in `main.ts`, served at `/api/docs`. Per `DEFINITION_OF_DONE.md`, every **new** endpoint added from Phase 7 onward must be documented with `@ApiTags`/`@ApiOperation`/`@ApiResponse`/`@ApiProperty` — existing pre-invoicing endpoints are documented incrementally as they're touched, not retrofitted all at once.

### Invoicing module (new)

Dataico's API surface is split into 8 Postman collections; each becomes its own phase (see `PROJECT_ROADMAP.md`). All of them live under one `invoicing/` parent so they can share a Dataico HTTP client, credentials, and error handling instead of each reinventing it:

```
apps/api/src/invoicing/
├── invoicing.module.ts
├── dataico/                             # built in Phase 7 — see docs/phases/PHASE_7_DATAICO_FOUNDATION.md
│   ├── dataico.module.ts               # exports DataicoClientService — sub-domain modules import THIS, not InvoicingModule (avoids a circular dependency)
│   ├── dataico-client.service.ts       # low-level authenticated HTTP client — every sub-domain injects this. Auth is a custom `Auth-token` header, not Bearer/OAuth.
│   ├── dataico.config.ts               # typed config (DATAICO_BASE_URL, DATAICO_AUTH_TOKEN) via ConfigService
│   └── dataico-api.exception.ts        # maps a non-2xx Dataico response to a clear NestJS exception
├── resolutions/                        # built in Phase 8 — "8. Actualizar o vincular resoluciones"
├── third-parties/                      # built in Phase 9 — "7. Consulta DIAN Terceros"
├── invoices/                           # built in Phase 10 (send/resend/query) — "1. Factura electrónica estándar" (notas crédito/débito blocked/deferred, see that phase doc)
├── pos/                                # "3. POS Electrónico" — added when that phase starts
└── support-documents/                  # "4. Documento soporte" — added when that phase starts

# Not planned — confirmed out of scope, see PROJECT_ROADMAP.md:
#   "6. Eventos de recepción"        — acknowledging invoices FROM suppliers, not relevant to an issuer
#   "5. Nómina Electrónica"          — payroll reporting
#   "2. Factura electrónica sector salud" — not a healthcare business
```

Only build the sub-folders for the phase actually in progress — this tree is the target shape, not something to scaffold all at once. **Never guess a sub-domain's endpoint paths or payload shape before its Dataico reference has been shared** — see `CLAUDE.md`.

`invoicing.module.ts` itself only aggregates sub-domain modules (`imports: [DataicoModule, ResolutionsModule, ...]`) — it holds no providers of its own, so a sub-domain module can import `DataicoModule` directly instead of importing `InvoicingModule` (which would create a circular dependency, since `InvoicingModule` imports the sub-domain modules).

---

## Client — React + Vite

### Folder organization

```
apps/client/src/
├── pages/            # route-level components (ProductsListPage, InventoryPage, LoginPage, ...)
├── components/        # reusable UI (BarcodeScannerModal, SearchableSelect, cards, modals)
├── layouts/           # AuthLayout, AuthenticatedLayout
├── context/           # AuthContext (auth-context.ts + AuthContext.tsx), route guards
├── hooks/             # TanStack Query hooks, one file per domain (useProducts, useInventory, ...)
├── services/          # axios wrappers per domain, calling `${VITE_API_URL}/api/...`
├── lib/
│   ├── api.ts          # axios instance, auth header + refresh-token interceptor
│   ├── storage.ts       # localStorage token accessors
│   └── schemas/         # Zod schemas per form
└── assets/
```

### Data fetching — TanStack Query

All server communication goes through TanStack Query hooks in `hooks/`. Components never call `fetch`/axios directly:

```typescript
// hooks/useProducts.ts
export function useProducts(query: ProductsQuery) {
  return useQuery({ queryKey: ['products', query], queryFn: () => getProducts(query) });
}
```

A mutation invalidates the relevant query key(s) on success — e.g. `useCreateMovement` invalidates both `['inventory-movements']` and `['products']`, since a stock movement changes `Product.stock`.

### Routing and role guards

`react-router-dom`. Everything except `/login` sits behind `ProtectedRoute` (must be authenticated; also enforces the forced-password-change redirect both ways). `AdminRoute` restricts to `role: 'admin'`; `EmployeeRoute` blocks only `auditor` (admin and employee both pass). See `GLOSSARY.md` for what each role can do.

### Auth token handling

JWT access + refresh tokens in `localStorage` (keys `casarespuestos.accessToken` / `casarespuestos.refreshToken`, see `lib/storage.ts`). `lib/api.ts`'s response interceptor does two things beyond attaching the bearer token:

1. On `403 PasswordChangeRequired` → redirect to `/change-password`.
2. On `401` (excluding the login/refresh calls themselves, and not already retried) → single-flight refresh-token exchange, queues concurrent requests, retries with the new token, or clears tokens and redirects to `/login` if the refresh itself fails.

### Styling

Tailwind CSS utility classes directly in components. No CSS-in-JS, no separate per-component stylesheets.

---

## Cross-cutting decisions

| Decision | Choice | Why |
|---|---|---|
| API communication | REST, JSON | Simple, single frontend consumer |
| Auth | JWT (access + refresh) | Stateless, works well with an SPA + separate API |
| ORM | TypeORM + `SnakeNamingStrategy` | Mature NestJS integration; snake_case DB, camelCase TS automatically |
| Invoicing | Dataico API | DIAN-compliant electronic invoicing; replaces the Sisco Excel-export workflow entirely |
| Deployment (API) | Railway | Simple, affordable at current scale |
| Deployment (Client) | Vercel | Zero-config static SPA hosting |

## Related documents

- `CODING_STANDARDS.md` — naming and style conventions applied throughout this structure
- `DATABASE.md` — the data model behind every entity mentioned here
- `GLOSSARY.md` — business vocabulary, including Dataico/DIAN terms
- `PROJECT_ROADMAP.md` — which phase builds which piece of this structure next
