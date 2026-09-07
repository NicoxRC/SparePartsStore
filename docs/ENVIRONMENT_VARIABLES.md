# Environment Variables

This document explains every environment variable used across `api` and `client`.

## General rules

- **Never commit a `.env` file** — it's in `.gitignore`.
- **Every variable must exist in `.env.example`** with a placeholder value.
- Adding a new variable updates `.env.example` **and** this document in the same change (see `DEFINITION_OF_DONE.md`).
- Production values are set directly in Railway's / Vercel's dashboards — never sent over chat or committed anywhere.

---

## API (`apps/api/.env`)

```bash
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=casarespuestos_dev
DB_USER=casarespuestos
DB_PASSWORD=your-database-password-here

DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGINS=http://localhost:5173

BCRYPT_ROUNDS=10

SEED_ADMIN_EMAIL=admin@casarespuestos.com
SEED_ADMIN_PASSWORD=ChangeMe123!
SEED_ADMIN_FIRST_NAME=Admin
SEED_ADMIN_LAST_NAME=User
```

### Variable reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✅ | Port the NestJS server listens on. |
| `NODE_ENV` | ✅ | `development` \| `production` \| `test`. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | ✅ | Individual Postgres connection vars — **these are what `app.module.ts` and `database/data-source.ts` actually read.** |
| `DATABASE_URL` | ⚠️ Listed, not consumed | Documented for a future Railway-style single-connection-string deploy, but the current TypeORM config only reads the individual `DB_*` vars above — setting only `DATABASE_URL` and leaving the others blank will **not** work today. Don't remove it from `.env.example` without first wiring it up, since Railway's PostgreSQL plugin injects exactly this. |
| `JWT_ACCESS_SECRET` | ✅ | Signs the access token. Different from `JWT_REFRESH_SECRET` — never reuse the same value for both. |
| `JWT_ACCESS_EXPIRES_IN` | ✅ | Default `15m`. |
| `JWT_REFRESH_SECRET` | ✅ | Signs the refresh token. |
| `JWT_REFRESH_EXPIRES_IN` | ✅ | Default `7d`. |
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins. **Empty means every cross-origin request is blocked** — `main.ts` logs a warning at boot if this is unset, it doesn't silently allow everything. |
| `BCRYPT_ROUNDS` | ✅ | Password hashing cost factor, default `10`. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_FIRST_NAME`, `SEED_ADMIN_LAST_NAME` | Only for `npm run seed:admin` | Creates the first admin account. Change the password after first login. The seed is idempotent — skips if the email already exists. |

### Invoicing (Dataico)

```bash
DATAICO_BASE_URL=https://api.dataico.com/direct/dataico_api/v2
DATAICO_AUTH_TOKEN=replace-with-the-real-dataico-auth-token
DATAICO_ACCOUNT_ID=replace-with-the-real-dataico-account-id
DATAICO_POS_BASE_URL=https://staging.dataico.com/direct/dataico_api/v2
DATAICO_PAYROLL_BASE_URL=https://api.dataico.com/direct/payroll-api/v2
```

| Variable | Required | Description |
|---|---|---|
| `DATAICO_BASE_URL` | ✅ | Confirmed against a real request. `DataicoClientService` prepends this to every call (e.g. `POST {DATAICO_BASE_URL}/invoices`). |
| `DATAICO_AUTH_TOKEN` | ✅ | Sent as a **custom `Auth-token` header** on every request — not `Authorization: Bearer`, not OAuth. There is no token refresh flow. Get the real value from the Dataico account this store invoices under; never commit it. |
| `DATAICO_ACCOUNT_ID` | ✅ | Added Phase 10 — the `dataico_account_id` every invoice payload requires, identifying which Dataico account this store invoices under. Stable per deployment, so it's configured once here instead of re-entered on every invoice. |
| `DATAICO_POS_BASE_URL` | ✅ | Added Phase 12 (POS Electrónico). **Points at a staging/test host, not production** — no production POS URL has been provided yet (see `docs/phases/PHASE_12_POS.md`). Deliberately a separate variable from `DATAICO_BASE_URL` so swapping in the real production URL later needs no code change, and so it can never accidentally make the rest of the API (invoices, resolutions, terceros) point at staging too. |
| `DATAICO_PAYROLL_BASE_URL` | ✅ | Added Phase 15 (Nómina Electrónica). Same host as `DATAICO_BASE_URL` but a different API path (`payroll-api` instead of `dataico_api`) — a separate variable so the payroll path can change independently. |

Further invoicing phases reuse `DATAICO_BASE_URL`/`DATAICO_AUTH_TOKEN`/`DATAICO_ACCOUNT_ID` via the shared `DataicoClientService` unless, like POS and Payroll, they turn out to live on a different host or path — check each phase's own doc rather than assuming.

---

## Client (`apps/client/.env`)

```bash
VITE_API_URL=http://localhost:3000
```

Vite only exposes `VITE_`-prefixed variables to the browser bundle — this is a security measure so server-only secrets never end up in client code.

### Variable reference

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Base URL of the API, **without** the `/api` prefix — `lib/api.ts` appends `/api` itself. `http://localhost:3000` locally; the Railway API URL in production. |

Accessed in code as:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## Setting variables in production

- **Railway (`api`)**: Project → Variables tab. If a PostgreSQL plugin is attached, prefer referencing its values (`${{Postgres.PGHOST}}`, etc.) over hardcoding them, once `DATABASE_URL`/individual-var wiring is finalized — see the `DATABASE_URL` note above.
- **Vercel (`client`)**: Project → Settings → Environment Variables. Remember `VITE_*` variables are baked in at build time — redeploy after changing one.

## Related documents

- `README.md` — initial local setup referencing this file
- `DATABASE.md` — what the database variables connect to
- `DEFINITION_OF_DONE.md` — requirement to update this file when adding a variable
