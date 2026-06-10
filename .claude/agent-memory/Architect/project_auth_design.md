---
name: project-auth-design
description: Key decisions in docs/Schema.md and docs/ApiContract.md for the auth/users module — conventions reused by all future entities/modules
metadata:
  type: project
---

Designed `docs/Schema.md` (entity conventions + User entity) and
`docs/ApiContract.md` (auth + users API contract, module folder structure)
to unblock the Backend agent's auth module work (as of 2026-06-09).

Key reusable conventions established (apply when designing future
modules — products, categories, brands, inventory, export):

- **Every entity**: uuid PK, `createdAt`/`updatedAt`/`deletedAt` (soft
  delete via `@DeleteDateColumn`), nullable `createdBy`/`updatedBy` FKs to
  `users.id` (`ON DELETE SET NULL`), populated by service layer from
  `@CurrentUser()`, not DB defaults.
- **Naming**: snake_case columns/tables via `SnakeNamingStrategy` from
  `typeorm-naming-strategies` (Backend agent needs to add this package and
  wire it into TypeORM config — not yet done).
- **Partial unique indexes** (`WHERE deleted_at IS NULL`) for columns like
  `email`, `sku`, `name` so soft-deleted rows don't block reuse — must be
  added via raw SQL in migrations, TypeORM decorators don't support this.
- **Pagination envelope** `{ data: T[], meta: { total, page, limit, totalPages } }`
  is the standard shape for ALL list endpoints — reuse for products,
  categories, brands, inventory list endpoints too.
- **`is_active` (toggle, deactivate/reactivate) vs `deletedAt` (soft
  delete) are treated as two distinct mechanisms** on User — `isActive`
  for the "deactivate user" admin flow (Requirements 5.2), `deletedAt` for
  a separate hard-ish removal. This split is **flagged as an open question
  for stakeholder confirmation** — may need to collapse into one. Watch for
  this when products/categories/brands ask for "deactivate" too — Requirements
  5.4/5.5 use the word "deactivate" for categories/brands which might map to
  soft-delete directly there (no separate isActive column needed) since
  those don't have the same login-gating concern as users.

JWT/auth decisions:
- Refresh token sent in request body (not httpOnly cookie) — chosen for
  Vercel/Railway cross-origin simplicity. localStorage on frontend per
  CLAUDE.md.
- Stateless JWT, no refresh_tokens table in v1 — flagged as limitation,
  easy to add later reusing the createdBy/FK pattern.
- JwtAuthGuard + RolesGuard registered globally via APP_GUARD; `@Public()`
  decorator opts out (used only on login/refresh).
- UserRole enum lives in `common/enums/user-role.enum.ts` (shared across
  modules, not inside `users/`).

Open items carried into future work: see `docs/ApiContract.md` §6
(rate limiting on login, tsconfig strict mode conflict with CLAUDE.md,
seed script for first admin user not yet designed).

See also [[project_tsconfig_decisions]], [[project_folder_names]],
[[project_infra]].
