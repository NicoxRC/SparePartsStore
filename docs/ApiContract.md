# CasaRespuestos — API Contract

This document defines the API contract and module structure needed to start
the **`auth`** module (and the minimal **`users`** module it depends on). It
follows the conventions and `User` entity defined in `docs/Schema.md`.
Other modules (`products`, `categories`, `brands`, `inventory`, `export`)
will get their own contract sections in follow-up revisions — this doc is
meant to be appended to, not replaced.

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

## 6. Known limitations / open items for follow-up

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
