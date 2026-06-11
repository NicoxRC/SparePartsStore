# CasaRespuestos — API Contract

This document defines the API contract and module structure for
CasaRespuestos. It started with the **`auth`** module (and the minimal
**`users`** module it depends on) and now also covers the **`products`**
module and its three required classification lookups —
**`departments`**, **`groups`** (table `product_groups`), and **`brands`**
— per `docs/Schema.md` §3-§7. `inventory` and `export` will get their own
contract sections in follow-up revisions — this doc is meant to be appended
to, not replaced.

> **Note**: the original `categories`/`brands` lookup-table plan from
> `docs/Requirements.md` §5.4-§5.5 is superseded. There is no `/categories`
> endpoint. Product classification uses three lookups —
> `/departments`, `/groups`, `/brands` — all required on every product.

All endpoints are prefixed with `/api` (set via `app.setGlobalPrefix('api')`
in `main.ts`) and versioned implicitly as v1 for now (no `/v1` prefix unless
the team wants to add one later).

---

## 1. Module folder structure (`apps/api/src`)

```
apps/api/src/
├── main.ts
├── app.module.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   ├── local.strategy.ts          # validates email/password on login
│   │   ├── jwt.strategy.ts            # validates access token
│   │   └── jwt-refresh.strategy.ts    # validates refresh token
│   ├── dto/
│   │   ├── login.dto.ts
│   │   ├── refresh-token.dto.ts
│   │   └── auth-response.dto.ts
│   └── types/
│       └── jwt-payload.interface.ts
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── entities/
│   │   └── user.entity.ts
│   └── dto/
│       ├── create-user.dto.ts
│       ├── update-user.dto.ts
│       └── user-response.dto.ts
├── departments/
│   ├── departments.module.ts
│   ├── departments.controller.ts
│   ├── departments.service.ts
│   ├── entities/
│   │   └── department.entity.ts
│   └── dto/
│       ├── create-department.dto.ts
│       ├── update-department.dto.ts
│       ├── query-departments.dto.ts
│       └── department-response.dto.ts
├── groups/                                # table: product_groups, entity class: Group
│   ├── groups.module.ts
│   ├── groups.controller.ts
│   ├── groups.service.ts
│   ├── entities/
│   │   └── group.entity.ts                # @Entity('product_groups')
│   └── dto/
│       ├── create-group.dto.ts
│       ├── update-group.dto.ts
│       ├── query-groups.dto.ts
│       └── group-response.dto.ts
├── brands/
│   ├── brands.module.ts
│   ├── brands.controller.ts
│   ├── brands.service.ts
│   ├── entities/
│   │   └── brand.entity.ts
│   └── dto/
│       ├── create-brand.dto.ts
│       ├── update-brand.dto.ts
│       ├── query-brands.dto.ts
│       └── brand-response.dto.ts
├── products/
│   ├── products.module.ts
│   ├── products.controller.ts
│   ├── products.service.ts
│   ├── entities/
│   │   └── product.entity.ts
│   └── dto/
│       ├── create-product.dto.ts
│       ├── update-product.dto.ts
│       ├── query-products.dto.ts
│       └── product-response.dto.ts
└── common/
    ├── decorators/
    │   ├── current-user.decorator.ts   # @CurrentUser() param decorator
    │   ├── roles.decorator.ts          # @Roles(UserRole.ADMIN, ...)
    │   └── public.decorator.ts         # @Public() — bypass JwtAuthGuard
    ├── guards/
    │   ├── jwt-auth.guard.ts
    │   ├── jwt-refresh-auth.guard.ts
    │   ├── local-auth.guard.ts
    │   └── roles.guard.ts
    ├── enums/
    │   └── user-role.enum.ts           # shared UserRole enum (used by users + auth)
    ├── filters/                        # (future) global exception filters
    └── interceptors/                   # (future) e.g. ClassSerializerInterceptor config
```

### Notes on placement

- `UserRole` enum lives in `common/enums/` (not inside `users/`) because
  `auth` (guards, JWT payload, `@Roles()` usages) and future modules all
  need it without importing across feature modules.
- `JwtPayload` interface lives in `auth/types/` — it's auth-internal, other
  modules consume the *user* via `@CurrentUser()`, not the raw payload.
- `users.module.ts` exports `UsersService` (and `TypeOrmModule.forFeature([User])`
  re-export if needed) so `AuthModule` can import `UsersModule` and inject
  `UsersService` for credential lookups — avoids a circular dependency
  (`AuthModule` depends on `UsersModule`, not vice versa).

---

## 2. JWT Strategy Design

### 2.1 Tokens

| Token type | Env secret              | Env expiry              | Default | Carried in |
|------------|--------------------------|---------------------------|---------|------------|
| Access     | `JWT_ACCESS_SECRET`       | `JWT_ACCESS_EXPIRES_IN`    | `15m`   | `Authorization: Bearer <token>` header |
| Refresh    | `JWT_REFRESH_SECRET`      | `JWT_REFRESH_EXPIRES_IN`   | `7d`    | request body (see `POST /api/auth/refresh`) |

Both env vars already exist in `apps/api/.env.example` — no new vars needed.

### 2.2 JWT payload shape

Both access and refresh tokens use the same payload shape
(`auth/types/jwt-payload.interface.ts`):

```typescript
export interface JwtPayload {
  sub: string;        // user id (uuid)
  email: string;
  role: UserRole;      // 'admin' | 'employee'
  // standard claims iat/exp are added automatically by @nestjs/jwt
}
```

`sub` + `role` are sufficient for `RolesGuard` to authorize without a DB hit
on every request. `email` is included for convenience/logging only — do not
rely on it for authorization decisions (role can change; re-fetch user if
the action needs fresh data, e.g. `is_active` check — see §2.4).

### 2.3 Passport strategies

| Strategy | File | Used by | Validates |
|----------|------|---------|-----------|
| `local` | `strategies/local.strategy.ts` | `POST /api/auth/login` | email + password against `UsersService` (bcrypt compare); throws `UnauthorizedException` if invalid credentials **or** `is_active = false` |
| `jwt` | `strategies/jwt.strategy.ts` | all protected routes (default guard) | `JWT_ACCESS_SECRET`; returns `{ id, email, role }` attached to `req.user` |
| `jwt-refresh` | `strategies/jwt-refresh.strategy.ts` | `POST /api/auth/refresh` | `JWT_REFRESH_SECRET`; extracts refresh token from request body (not header — see §2.5); returns same `{ id, email, role }` |

### 2.4 `is_active` re-check

The `jwt` strategy's `validate()` method does **not** hit the DB on every
request for performance (per Requirements §6.2 mobile performance goals).
However, `local.strategy.ts` (login) and `jwt-refresh.strategy.ts` (refresh)
**do** hit the DB and must reject if `user.is_active === false`
(`UnauthorizedException`). This means a deactivated user's existing access
token remains valid for up to 15 minutes (acceptable tradeoff given the
short expiry) but cannot refresh or re-login.

If this tradeoff is later deemed unacceptable (e.g. need immediate
deactivation), revisit by adding a lightweight cache-backed active-user
check in `jwt.strategy.ts` — out of scope for v1.

### 2.5 Refresh token transport

Refresh token is sent in the **request body**, not as an httpOnly cookie.

**Why:** Simpler for a Vercel (frontend) + Railway (backend) cross-origin
deployment — avoids `SameSite`/`Secure` cookie configuration across
different domains. Frontend stores both tokens in `localStorage` per
`CLAUDE.md`'s documented Auth Flow.

**Tradeoff (flag for awareness):** localStorage tokens are vulnerable to
XSS exfiltration vs. httpOnly cookies. Acceptable for v1 given the small
trusted user base (internal store staff) and short access-token expiry.
Revisit if this becomes internet-facing with broader exposure.

### 2.6 Guards

| Guard | File | Behavior |
|-------|------|----------|
| `JwtAuthGuard` | `common/guards/jwt-auth.guard.ts` | Extends `AuthGuard('jwt')`. Registered as the **global default guard** (`APP_GUARD` in `app.module.ts`) so every route requires a valid access token unless marked `@Public()`. |
| `LocalAuthGuard` | `common/guards/local-auth.guard.ts` | Extends `AuthGuard('local')`. Used only on `POST /api/auth/login`. |
| `JwtRefreshAuthGuard` | `common/guards/jwt-refresh-auth.guard.ts` | Extends `AuthGuard('jwt-refresh')`. Used only on `POST /api/auth/refresh`. |
| `RolesGuard` | `common/guards/roles.guard.ts` | Reads `@Roles(...)` metadata via `Reflector`; compares against `req.user.role`. Registered globally alongside `JwtAuthGuard` (runs after it) — routes without `@Roles()` are accessible to any authenticated user. |

### 2.7 RBAC enforcement pattern

```typescript
@Roles(UserRole.ADMIN)
@Post()
create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthenticatedUser) {
  return this.usersService.create(dto, user.id);
}
```

- `@Roles(...UserRole[])` decorator (`common/decorators/roles.decorator.ts`)
  sets metadata consumed by `RolesGuard`.
- `@Public()` decorator (`common/decorators/public.decorator.ts`) sets
  metadata that makes `JwtAuthGuard` skip authentication entirely — used
  only on `POST /api/auth/login` and `POST /api/auth/refresh`.
- Both `JwtAuthGuard` and `RolesGuard` are registered globally via
  `APP_GUARD` providers in `AuthModule` (imported into `AppModule`), so
  individual controllers don't need `@UseGuards(...)` boilerplate — only
  `@Public()` / `@Roles()` decorators as needed.
- Endpoints with no `@Roles()` decorator: any authenticated user (admin or
  employee) can access. Endpoints with `@Roles(UserRole.ADMIN)`: admin only.

---

## 3. Auth Endpoints

### 3.1 `POST /api/auth/login`

**Public.** Guarded by `LocalAuthGuard`.

Request body:

```typescript
// LoginDto
{
  email: string;     // @IsEmail()
  password: string;  // @IsString() @MinLength(8)
}
```

Response `200 OK`:

```typescript
// AuthResponseDto
{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'employee';
  }
}
```

Errors:
- `401 Unauthorized` — invalid credentials, or `is_active = false`.

Side effects: updates `users.last_login_at` to `now()`.

---

### 3.2 `POST /api/auth/refresh`

**Public** (bypasses `JwtAuthGuard` via `@Public()`), but guarded by
`JwtRefreshAuthGuard`.

Request body:

```typescript
// RefreshTokenDto
{
  refreshToken: string;  // @IsString() @IsNotEmpty()
}
```

Response `200 OK`:

```typescript
{
  accessToken: string;
  refreshToken: string;   // rotated — new refresh token issued
}
```

Errors:
- `401 Unauthorized` — invalid/expired refresh token, or user
  `is_active = false` / not found.

**Token rotation:** a new refresh token is issued on every refresh (helps
limit the blast radius of a leaked refresh token, even without a DB
blacklist). No server-side revocation list in v1 (see `docs/Schema.md` §3).

---

### 3.3 `POST /api/auth/logout`

Requires valid access token (standard `JwtAuthGuard`).

Request body: none.

Response `204 No Content`.

**Behavior in v1:** Since tokens are stateless (no DB-backed session/token
table), this endpoint does **not** invalidate the token server-side. It
exists primarily for:
1. A consistent API the frontend can call (clears client-side storage).
2. A future hook point if a token blacklist/`refresh_tokens` table is added.

This is flagged explicitly in §6 as a known limitation.

---

### 3.4 `GET /api/auth/me`

Requires valid access token (standard `JwtAuthGuard`).

Response `200 OK`:

```typescript
// UserResponseDto (current user)
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'employee';
  isActive: boolean;
  lastLoginAt: string | null;  // ISO 8601
  createdAt: string;
  updatedAt: string;
}
```

Used by frontend on app load / refresh to rehydrate the auth context.

---

## 4. `@CurrentUser()` decorator contract

`common/decorators/current-user.decorator.ts` extracts `req.user` (set by
the active Passport strategy) into a typed shape:

```typescript
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}
```

Usage: `@CurrentUser() user: AuthenticatedUser`. Services use `user.id` to
populate `createdBy`/`updatedBy` per `docs/Schema.md` §1.2.

---

## 5. Users Module (CRUD — Admin only, except `/me`)

Required alongside `auth` per Requirements §5.2 ("Create, edit, and
deactivate users", admin only). `AuthModule` imports `UsersModule` to use
`UsersService` for credential lookups (see §1 notes).

All endpoints below require `@Roles(UserRole.ADMIN)` unless noted.

### 5.1 `POST /api/users`

Create a new user.

Request body:

```typescript
// CreateUserDto
{
  email: string;       // @IsEmail()
  password: string;    // @IsString() @MinLength(8) — hashed before storage
  firstName: string;   // @IsString() @IsNotEmpty()
  lastName: string;    // @IsString() @IsNotEmpty()
  role: 'admin' | 'employee'; // @IsEnum(UserRole)
}
```

Response `201 Created`: `UserResponseDto` (see §3.4 shape, minus
`lastLoginAt` which will be `null`).

Errors:
- `409 Conflict` — email already in use (active user).
- `400 Bad Request` — validation errors.

`createdBy` is set to the requesting admin's id (via `@CurrentUser()`).

---

### 5.2 `GET /api/users`

List users (paginated).

Query params:

```typescript
{
  page?: number;      // default 1
  limit?: number;     // default 20, max 100
  search?: string;    // matches email, firstName, or lastName (ILIKE)
  role?: 'admin' | 'employee';
  isActive?: boolean;
}
```

Response `200 OK`:

```typescript
{
  data: UserResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}
```

This paginated envelope (`{ data, meta }`) is the standard shape for **all**
list endpoints across the API (products, categories, etc. will reuse it).

---

### 5.3 `GET /api/users/:id`

Response `200 OK`: `UserResponseDto`.

Errors: `404 Not Found`.

---

### 5.4 `PATCH /api/users/:id`

Request body:

```typescript
// UpdateUserDto — all fields optional
{
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'employee';
  password?: string;   // if present, re-hashed; @MinLength(8)
  isActive?: boolean;  // toggles deactivate/reactivate
}
```

Response `200 OK`: `UserResponseDto`.

Errors:
- `404 Not Found`.
- `409 Conflict` — email collision with another active user.
- `400 Bad Request` — attempting to set `isActive: false` on **own** account
  (self-deactivation guard, parallels self-deletion guard below).

`updatedBy` is set to the requesting admin's id.

---

### 5.5 `DELETE /api/users/:id`

Soft-deletes the user (`softDelete()` — sets `deleted_at`).

Response `204 No Content`.

Errors:
- `404 Not Found`.
- `400 Bad Request` — `id === req.user.id` ("Users cannot delete
  themselves", Requirements §5.2). Message:
  `"You cannot delete your own account."`

> Open question carried from `docs/Requirements.md` §8: whether "deactivate"
> (5.2) and this `DELETE` (soft delete) should be the same action or two
> distinct ones. This contract treats them as **two distinct mechanisms**
> (`PATCH .../isActive=false` = deactivate/reactivate toggle, `DELETE` =
> permanent-ish soft delete, hidden from all lists). Confirm with
> stakeholder; easy to collapse into one if they want only one concept.

---

## 6. Product-classification lookup modules — shared CRUD contract

`departments`, `groups` (table `product_groups`, entity class `Group`), and
`brands` are three structurally identical lookup modules. Each follows the
shape below; route prefixes are `/api/departments`, `/api/groups`, and
`/api/brands` respectively. **All mutation endpoints
(`POST`/`PATCH`/`DELETE`) require `@Roles(UserRole.ADMIN)`**, mirroring the
`users` module RBAC pattern (§2.7). `GET` endpoints are available to any
authenticated user (admin or employee) since employees need these lists to
populate product create/edit forms.

### 6.1 Shared response shape — `<X>ResponseDto`

```typescript
{
  id: string;
  code: string;
  name: string;
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}
```

### 6.2 `POST /api/departments` | `/api/groups` | `/api/brands`

**Admin only.**

Request body — `Create<X>Dto`:

```typescript
{
  code: string;  // @IsString() @IsNotEmpty() @MaxLength(50)
  name: string;  // @IsString() @IsNotEmpty() @MaxLength(150)
}
```

Response `201 Created`: `<X>ResponseDto`.

Errors:
- `409 Conflict` — `code` already in use by an active row.
- `400 Bad Request` — validation errors.

`createdBy` set to the requesting admin's id.

---

### 6.3 `GET /api/departments` | `/api/groups` | `/api/brands`

Available to any authenticated user. Query params:

```typescript
{
  page?: number;   // default 1
  limit?: number;  // default 20, max 100
  search?: string; // matches code or name (ILIKE)
}
```

Response `200 OK` — standard paginated envelope (per §5.2):

```typescript
{
  data: <X>ResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}
```

> **Frontend note**: for populating select/dropdown inputs on the product
> form, the frontend should request a high `limit` (e.g. `limit=100`) since
> these lookup tables are expected to be small (tens of rows, not
> thousands). No separate "all, unpaginated" endpoint is defined for v1 —
> revisit if a shop ends up with hundreds of departments/groups/brands.

---

### 6.4 `GET /api/departments/:id` | `/api/groups/:id` | `/api/brands/:id`

Available to any authenticated user.

Response `200 OK`: `<X>ResponseDto`.

Errors: `404 Not Found`.

---

### 6.5 `PATCH /api/departments/:id` | `/api/groups/:id` | `/api/brands/:id`

**Admin only.**

Request body — `Update<X>Dto` (all fields optional):

```typescript
{
  code?: string; // @IsOptional() @IsString() @IsNotEmpty() @MaxLength(50)
  name?: string; // @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150)
}
```

Response `200 OK`: `<X>ResponseDto`.

Errors:
- `404 Not Found`.
- `409 Conflict` — `code` collision with another active row.
- `400 Bad Request` — validation errors.

`updatedBy` set to the requesting admin's id.

---

### 6.6 `DELETE /api/departments/:id` | `/api/groups/:id` | `/api/brands/:id`

**Admin only.** Soft-deletes (deactivates) the row — `softDelete()`, sets
`deleted_at`. This is the **only** deactivate mechanism for these lookups
(unlike `users`, there is no separate `isActive` boolean toggle — see
`docs/Schema.md` §3).

Response `204 No Content`.

Errors:
- `404 Not Found`.

> **Open issue carried from `docs/Schema.md` §8**: v1 does **not** block
> deactivation of a lookup row that's still referenced by active products
> (no `409 Conflict` check). Existing products keep their FK; the
> deactivated value simply disappears from `GET` lists used to populate
> product form dropdowns. Flagged for product-owner decision — see Schema.md
> §8 for the two proposed options.

---

## 7. Products Module

Route prefix: `/api/products`. Table: `products` (`docs/Schema.md` §4).
Every product has required `departmentId`, `groupId`, and `brandId`
(replacing the old freeform `department`/`group`/`line` varchar columns).
`GET` endpoints are available to any authenticated user; mutations follow
the role split below.

### 7.1 Shared nested lookup shape

Product responses embed each classification as a nested object (not just the
raw id), so the frontend can render `code`/`name` without a second request:

```typescript
// ProductLookupRef — embedded in ProductResponseDto
{
  id: string;
  code: string;
  name: string;
}
```

### 7.2 `POST /api/products`

Any authenticated user (admin or employee) per `docs/Requirements.md` §4
("Employee: Create and edit products").

Request body — `CreateProductDto`:

```typescript
{
  reference: string;     // @IsString() @IsNotEmpty() @MaxLength(100)
  description: string;   // @IsString() @IsNotEmpty() @MaxLength(255)
  salePrice: number;     // @Type(() => Number) @IsNumber() @IsPositive()
  stock: number;         // @Type(() => Number) @IsInt() @Min(0)
  departmentId: string;  // @IsUUID()
  groupId: string;       // @IsUUID()
  brandId: string;       // @IsUUID()
}
```

> **Note**: `cost` is intentionally **not** part of `CreateProductDto`/
> `UpdateProductDto`. It is a derived value, computed server-side as
> `round(salePrice / COST_FACTOR)` (see `apps/api/src/products/products.service.ts`)
> and persisted to the NOT NULL `cost` column on `products`. This is a
> deliberate product decision, not a gap.

Response `201 Created`: `ProductResponseDto` (§7.4).

Errors:
- `400 Bad Request` — validation errors, including `departmentId`/`groupId`/
  `brandId` not being valid UUIDs.
- `404 Not Found` — `departmentId`, `groupId`, or `brandId` does not
  reference an existing (non-deleted) row. Response body should indicate
  which field(s) failed, e.g.
  `{ "message": "Invalid brandId: brand not found", "field": "brandId" }`.
- `409 Conflict` — `reference` already in use by an active product.

`createdBy` set to the requesting user's id.

---

### 7.3 `GET /api/products`

Available to any authenticated user. Query params — `QueryProductsDto`:

```typescript
{
  page?: number;        // default 1
  limit?: number;       // default 20, max 100
  search?: string;      // matches reference or description (ILIKE)
  departmentId?: string; // @IsOptional() @IsUUID() — filter by department
  groupId?: string;      // @IsOptional() @IsUUID() — filter by group
  brandId?: string;      // @IsOptional() @IsUUID() — filter by brand
}
```

> **Replaces** the previous `department`/`group`/`line` string filters
> (`apps/api/src/products/dto/query-products.dto.ts`) with `*Id` UUID
> filters against the new FK columns. `line` filtering is removed entirely
> (no replacement — brand/`brandId` filtering covers the equivalent need).

Response `200 OK` — standard paginated envelope:

```typescript
{
  data: ProductResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}
```

---

### 7.4 `GET /api/products/:id`

Available to any authenticated user.

Response `200 OK` — `ProductResponseDto`:

```typescript
{
  id: string;
  reference: string;
  description: string;
  cost: number;
  salePrice: number;
  stock: number;
  department: ProductLookupRef;  // { id, code, name }
  group: ProductLookupRef;       // { id, code, name }
  brand: ProductLookupRef;       // { id, code, name }
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

> **Replaces** the previous flat `department: string`, `group: string`,
> `line: string` fields
> (`apps/api/src/products/dto/product-response.dto.ts`) with nested
> `department`/`group`/`brand` objects. There is no `line` field — Marca
> (`brand`) takes its place. The flat `*Id` values are intentionally **not**
> duplicated at the top level of the response (the nested object's `id` is
> sufficient); if the frontend needs the raw id for a form's initial value,
> it reads `product.department.id`, etc.

Errors: `404 Not Found`.

---

### 7.5 `PATCH /api/products/:id`

Any authenticated user (admin or employee).

Request body — `UpdateProductDto` (all fields optional):

```typescript
{
  reference?: string;
  description?: string;
  salePrice?: number;
  stock?: number;        // @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  departmentId?: string; // @IsOptional() @IsUUID()
  groupId?: string;      // @IsOptional() @IsUUID()
  brandId?: string;      // @IsOptional() @IsUUID()
}
```

Response `200 OK`: `ProductResponseDto`.

Errors:
- `404 Not Found` — product, or referenced `departmentId`/`groupId`/
  `brandId` not found.
- `409 Conflict` — `reference` collision with another active product.
- `400 Bad Request` — validation errors.

`updatedBy` set to the requesting user's id.

---

### 7.6 `DELETE /api/products/:id`

**Admin only** (deactivating a product is an admin action; employees can
create/edit per Requirements §4 but not deactivate — consistent with the
asymmetry already established for `users` where only admins manage
lifecycle state). Soft-deletes the product.

Response `204 No Content`.

Errors: `404 Not Found`.

> Flag for product-owner confirmation: `docs/Requirements.md` §5.3 says
> "Soft delete products (deactivate, not hard delete)" without specifying
> role. This contract assumes admin-only for the deactivate action,
> consistent with §4's role table ("Admin: Full access ... Employee: Create
> and edit products, view inventory" — deactivation isn't listed under
> Employee). Easy to relax to any authenticated user if incorrect.

---

## 8. Known limitations / open items for follow-up

1. **Stateless refresh tokens** — no server-side revocation. If "logout
   everywhere" or immediate access revocation becomes a hard requirement,
   add a `refresh_tokens` table (id, user_id, token_hash, expires_at,
   revoked_at) and check it in `jwt-refresh.strategy.ts`. Flagging now so
   the `User` entity FK pattern (§1.2 of Schema.md) can be reused for it
   later without rework.
2. **`is_active` lag on access tokens** — up to 15 minutes (see §2.4).
   Acceptable for v1; revisit if needed.
3. **Deactivate vs. soft-delete users** — two separate mechanisms proposed
   (§5.5 callout). Needs stakeholder confirmation.
4. **Rate limiting on `/api/auth/login`** — not addressed in this contract.
   Recommend `@nestjs/throttler` on the auth module to mitigate brute-force
   login attempts; not blocking for initial implementation but should be
   added before production deploy.
5. **`strict`/`noImplicitAny`** — `apps/api/tsconfig.json` currently has
   `"noImplicitAny": false` and no `"strict": true`, which conflicts with
   `CLAUDE.md`'s "TypeScript strict mode, no `any`" constraint. Not addressed
   here since it's a build-config change orthogonal to the auth module, but
   the Backend agent should be aware new auth code should still avoid `any`
   even though the compiler won't currently enforce it, and this should be
   reconciled in a dedicated tsconfig pass.
6. **First admin user / seed** — `docs/Schema.md` assumes a seed
   script/migration creates the first admin user with
   `created_by_id = NULL`. This seed mechanism (e.g. a TypeORM seed command
   or a data migration) is not yet designed — needed before `/api/auth/login`
   can be tested end-to-end. Recommend a small `apps/api/src/database/seeds/`
   script as part of the `users` module implementation.
7. **Existing product data migration** — the `products` table already has
   live `department`/`group`/`line` varchar data (per the migration plan in
   `docs/Schema.md` §8 / the dedicated migration-plan doc). Before the
   `NOT NULL` FK columns can be added, every distinct existing
   department/group/line value must be backfilled into `departments`,
   `product_groups`, and `brands` respectively, and each product row updated
   to point at the corresponding new id. This is a data migration, not just
   a schema migration — see the migration plan for the proposed approach.
8. **Lookup deactivation referential-integrity check** — not implemented in
   v1 (see §6.6 callout and `docs/Schema.md` §8). `DELETE
   /api/departments|groups|brands/:id` does not check whether active products
   still reference the row.
9. **No "list all, unpaginated" endpoint for lookups** — `GET
   /api/departments|groups|brands` is paginated like every other list
   endpoint (§6.3). Frontend dropdowns should request a high `limit`. Revisit
   if any shop's lookup tables grow beyond ~100 rows.
10. **`cost` field gap in current `CreateProductDto`** — see §7.2 callout;
    pre-existing gap (not introduced by this change) that the Backend agent
    should fix while touching `products` DTOs.
