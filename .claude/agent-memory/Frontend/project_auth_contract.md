---
name: project-auth-contract
description: Auth flow (JWT localStorage + refresh interceptor) and products API contract shapes used by apps/client
metadata:
  type: project
---

**Auth flow** (implemented 2026-06-09, verified live against API at
`http://localhost:3000/api`):

- `POST /api/auth/login` -> `{ accessToken, refreshToken, user: { id, email,
  firstName, lastName, role: 'admin'|'employee' } }`
- `POST /api/auth/refresh` body `{ refreshToken }` -> `{ accessToken,
  refreshToken }` (rotated, both tokens change every refresh)
- `POST /api/auth/logout` -> 204, no server-side invalidation (stateless JWT)
- `GET /api/auth/me` -> full `UserProfile` incl. `isActive`, `lastLoginAt`,
  `createdAt`, `updatedAt`

Tokens stored in `localStorage` (keys `casarespuestos.accessToken` /
`casarespuestos.refreshToken`, see `apps/client/src/lib/storage.ts`). Axios
instance in `apps/client/src/lib/api.ts` has a response interceptor that on
401 (excluding `/auth/refresh` and `/auth/login` requests) attempts one
refresh, queues concurrent failed requests until the refresh resolves, and
on refresh failure clears tokens + redirects to `/login`.

**Products contract** (`apps/api/src/products`):
- Create/update body: `{ reference, description, salePrice, department,
  group, line }` — `cost` is NEVER sent, server-computed and only present in
  responses (read-only, shown in edit form).
- List: `GET /api/products?page&limit&search&department&group&line` ->
  `{ data: ProductResponse[], meta: { total, page, limit, totalPages } }`
- Delete is admin-only (`@Roles(UserRole.ADMIN)`); create/update allowed for
  admin + employee. UI hides delete button based on `user.role` from
  `/auth/me`.

**Verification approach used:** No headless browser available in this env
(no chromium/playwright). Verified end-to-end via curl against the live
NestJS dev server (login, refresh, products CRUD, 403 on employee delete)
plus `tsc -b` / `vite build` / `eslint` passing clean. Created a test
employee user (`employee.fe@casarespuestos.com` / `Employee123!`) in the dev
DB for role-based UI testing — left in place for future test runs.

See [[project-client-setup]] for the project scaffold this was built on top of.
