---
name: project-employee-permissions-design
description: Per-employee granular permissions design (2026-09-17) — text[] column, flat catalog, dual-guard, JWT-embedded, no DB permissions table
metadata:
  type: project
---

Designed the move from coarse `employee` role (all employees equal) to
per-individual-employee granular permissions, requested by the store owner
because some employees should be able to do things others can't (both
menu-section access and specific in-section actions). `admin` stays a fixed
superuser (bypasses all checks), `auditor` stays the fixed read-only role,
untouched — the new system only applies to `role: employee` users.

Key decisions (see the full handoff report in this conversation's
transcript for the complete permission catalog, migration SQL, and
before/after controller sketches — not duplicated here):

- **Storage: `users.permissions TEXT[] NOT NULL DEFAULT '{}'`**, not a new
  `permissions`/`user_permissions` table. Reasoning: the catalog is a
  compile-time TS constant (`const PERMISSIONS = [...] as const`), not
  admin-editable metadata, so there's nothing to normalize into rows — same
  "free validated string, not enum, not a table" pattern already
  established for `dian_resolutions.subtype` / `customers.identification_type`
  / `customers.party_type` (see [[project_auth_design]] for the earlier
  entity conventions this still follows: uuid PK, audit cols, etc.).
  Chose `text[]` over a Postgres enum specifically because the catalog is
  expected to grow as new modules ship (e.g. a future Documento Soporte
  phase adds its own scope) and a Postgres enum can have values added but
  **never removed** — same constraint that already bit `AddAuditorRole`.
- **Permissions ride in the JWT payload**, same as `role`/`mustChangePassword`
  already do — needed so `PermissionsGuard` stays a stateless per-request
  check (no extra DB hit), consistent with how `JwtStrategy.validate()`
  already builds `AuthenticatedUser` purely from the token. Tradeoff: a
  permission change doesn't take effect until the employee's token refreshes
  — identical staleness behavior to a role change today, not a new problem.
- **Two guards coexist**, they don't replace each other: `RolesGuard`
  (existing, coarse, unchanged) runs first, then a new `PermissionsGuard`
  reading a new `@RequirePermission(...)` decorator (same `SetMetadata`
  shape as `@Roles`). `PermissionsGuard` is a no-op unless
  `request.user.role === EMPLOYEE` — admin and auditor always bypass it,
  so existing `@Roles(ADMIN)`-only endpoints (users, catalogs mutations,
  resolutions, payroll, dashboard, export) need zero changes.
- **The permission catalog only covers what a coarse `employee` could
  already do** — anything that was ADMIN-only before (product/customer
  delete, catalog create/update/delete, user management) stays a hard
  `@Roles(ADMIN)` gate, deliberately excluded from the assignable catalog.
  This was the direct answer to "should delete-without-view even be
  assignable" — it structurally can't be, since delete was never made
  employee-configurable in the first place.
- **Normalization rule, enforced server-side, not just in the UI**: any
  non-`.view` permission in a scope silently implies (auto-adds) that
  scope's `.view` permission when saved. Plus a short hardcoded cross-scope
  implication list (e.g. `products.create`/`products.update` imply
  `catalogs.view` since the product form's dropdowns need it;
  `invoices.create`/`quotations.create`/`inventory.create` imply
  `products.view` since you can't add a line item you can't search for).
  Deliberately did NOT imply `quotations.invoice → invoices.create` (different
  entry points, a store may legitimately want an employee who can only
  finalize existing quotations) — flagged as a considered-and-rejected
  implication, not an oversight.
- **New enforcement surface, called out explicitly, not silent**: products/
  catalogs list+read endpoints currently have *no* `@Roles` at all (any
  authenticated role passes). Added `@RequirePermission('products.view')` /
  `'catalogs.view'` to them anyway, since the human's own example named
  Productos section access as something that should be per-employee
  configurable. Admin/auditor are unaffected (guard bypasses non-employee
  roles); only employees are newly gated — backward-compat handled by the
  migration backfilling every existing `employee` row with the full
  current permission set so nothing breaks the moment it ships.
- **No new audit table** for permission changes — reused the `users` row's
  existing `updatedBy`/`updatedAt` (same as any other user edit). No
  permission groups/templates, no resource-level ACLs — flat per-user set,
  per CLAUDE.md's "keep it simple" for this store.
- Endpoint: `PATCH /api/users/:id/permissions` (admin-only, full replace,
  400s if the target user isn't `role: employee`) — kept separate from
  `PATCH /api/users/:id` (general profile edit) for single-responsibility,
  same reasoning as cash register's own separate `counted-cash` endpoint.

See also [[project_auth_design]], [[project_cash_register_design]] (the
`assertOpenToday()`/action-shape precedent used when designing the
`cash_register.*` permission actions, which aren't generic CRUD).
