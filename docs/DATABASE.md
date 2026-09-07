# Database

This document describes the data model, naming conventions, and migration policy for CasaRespuestos's PostgreSQL database. It reflects what is **actually implemented today** (verified against the entities and migrations in `apps/api/src`), not an aspirational design.

## Conventions

### Primary keys — UUID

Every table uses a UUID primary key:

```typescript
@PrimaryGeneratedColumn('uuid')
id: string;
```

### Naming — snake_case in the DB, camelCase in code

TypeORM's `SnakeNamingStrategy` (`typeorm-naming-strategies`) is registered globally in `app.module.ts` and `database/data-source.ts`. Every camelCase entity property maps automatically to a snake_case column — no manual `@Column({ name: '...' })` needed for this alone (e.g. `passwordHash` → `password_hash`, `createdById` → `created_by_id`).

### Audit columns — `createdBy` / `updatedBy`

Populated by application code from the authenticated request (`@CurrentUser()`), never automatically at the DB level. Pattern: nullable `ManyToOne` to `User`, `onDelete: 'SET NULL'`. `User` itself is self-referential (the very first admin, created by the seed script, has both as `NULL`).

### Soft delete

Every entity extending `common/entities/base.entity.ts` gets `deletedAt: Date | null` via `@DeleteDateColumn()`, and services call `softRemove()`/`softDelete()` — never a hard `DELETE`. TypeORM excludes soft-deleted rows from default `find*` queries automatically.

**`InventoryMovement` is the one entity that does NOT extend `BaseEntity`** — no `deletedAt`, no `updatedAt`. It's an append-only audit trail (see below); there is deliberately no way to edit or delete a movement once created.

### "Unique among active rows" — partial unique indexes

Several tables need a value to be unique only while the row is alive, so a soft-deleted row's value can be reused (e.g. re-inviting a user with the same email after their account was removed). This is done with a **partial unique index**, not a plain `UNIQUE` column constraint:

```sql
CREATE UNIQUE INDEX users_email_unique_active ON users (email) WHERE deleted_at IS NULL;
```

Same pattern on `products.reference` and on `code` for each of the three lookup tables (`departments`, `product_groups`, `brands`).

## Entity-relationship overview

```
users                          products
┌──────────────────────┐       ┌──────────────────────────┐
│ id (PK)               │       │ id (PK)                  │
│ email                 │       │ reference                │
│ password_hash         │       │ description              │
│ first_name            │       │ cost                      │
│ last_name             │       │ sale_price                │
│ role                  │       │ sale_type                 │
│ is_active             │       │ stock                     │
│ must_change_password  │       │ department_id (FK)───────┼──┐
│ last_login_at         │       │ group_id (FK)─────────────┼──┼──┐
│ created_by_id (self)  │       │ brand_id (FK)──────────────┼──┼──┼──┐
│ updated_by_id (self)  │       │ created_by_id (FK→users)   │  │  │  │
│ created_at            │       │ updated_by_id (FK→users)   │  │  │  │
│ updated_at            │       │ created_at / updated_at    │  │  │  │
│ deleted_at            │       │ deleted_at                 │  │  │  │
└──────────────────────┘       └──────────────────────────┘  │  │  │
        ▲                                                       │  │  │
        │ created_by / updated_by (every table below too)       │  │  │
        │                                                        ▼  │  │
┌───────┴──────┐   ┌──────────────┐   ┌──────────────┐   departments │  │
│ (referenced  │   │              │   │              │   ┌──────────┴┐ │
│  by every    │   │              │   │              │   │ id (PK)   │ │
│  table's     │   │              │   │              │   │ code      │ │
│  audit cols) │   │              │   │              │   │ name      │ │
└──────────────┘   │              │   │              │   │ audit...  │ │
                    │              │   │              │   └───────────┘ │
                    │              │   │              │   product_groups│
                    │              │   │              │   ┌────────────┴┐
                    │              │   │              │   │ id (PK)      │
                    │              │   │              │   │ code         │
                    │              │   │              │   │ name         │
                    │              │   │              │   │ audit...     │
                    │              │   │              │   └──────────────┘
                    │              │   │              │   brands
                    │              │   │              │   ┌──────────────┐
                    │              │   │              │   │ id (PK)       │
                    │              │   │              │   │ code          │
                    │              │   │              │   │ name          │
                    │              │   │              │   │ audit...      │
                    │              │   │              │   └──────────────┘
                    └──────────────┘   └──────────────┘

inventory_movements
┌───────────────────────┐
│ id (PK)                │
│ product_id (FK, CASCADE)
│ movement_type          │
│ quantity (signed int)  │
│ notes                  │
│ created_by_id (SET NULL)
│ created_at             │
└───────────────────────┘  (no updated_at, no deleted_at — append-only)
```

### Relationships

- A **product** belongs to exactly one **department**, one **group**, and one **brand** (all three `NOT NULL`, `onDelete: RESTRICT` — a lookup in active use can't be hard-removed, though in practice lookups are only ever soft-deleted anyway).
- A **product** has many **inventory movements** (1:N), `onDelete: CASCADE` on the FK (a hard-deleted product takes its movements with it — soft-deleted products keep theirs, since soft-delete never touches other tables).
- Every table's `created_by`/`updated_by` reference **users**, `onDelete: SET NULL`.

## Enums

Defined in `apps/api/src/common/enums/` and mirrored as Postgres enum types:

| Enum | Values | Notes |
|---|---|---|
| `UserRole` (`user_role`) | `admin`, `employee`, `auditor` | `auditor` added later via `AddAuditorRole` migration — Postgres enum values can be added but never removed, see that migration's `down()`. |
| `SaleType` (`sale_type`) | `normal`, `neto` | Drives the reverse cost calculation — see `products` below. |
| `MovementType` (`movement_type`) | `initial`, `purchase`, `adjustment` | `initial` is never produced by any endpoint — it only exists because the `CreateInventoryMovements` migration backfilled one `initial` movement per pre-existing product with stock > 0. See `inventory_movements` below. |

## Tables

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `email` | VARCHAR(255) | Partial-unique among non-deleted rows |
| `password_hash` | VARCHAR(60) | bcrypt hash, cost from `BCRYPT_ROUNDS` (default 10) |
| `first_name`, `last_name` | VARCHAR(100) | |
| `role` | ENUM `user_role` | default `employee` |
| `is_active` | BOOLEAN | default `true` — deactivate without deleting |
| `must_change_password` | BOOLEAN | default `false` — see "Forced password change" in `GLOSSARY.md` |
| `last_login_at` | TIMESTAMPTZ, nullable | set on successful login |
| `created_by_id`, `updated_by_id` | UUID, nullable, self-FK → `users.id`, `SET NULL` | first admin has both `NULL` |
| `created_at`, `updated_at`, `deleted_at` | TIMESTAMPTZ | standard, see Conventions |

**Self-protection rules (enforced in `UsersService.update`/`.remove`, not at the DB level):** a user cannot deactivate their own account, cannot demote themselves away from `admin` while currently `admin`, and cannot delete (soft-remove) their own account. Setting a new `password` on update always flips `must_change_password` back to `true`.

### `products`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `reference` | VARCHAR(100) | uppercased at the DTO layer; partial-unique among non-deleted rows; doubles as the barcode-scanner target field (see `GLOSSARY.md` "Barcode scanning") — there is no separate barcode column |
| `description` | VARCHAR(255) | capitalized (first letter upper, rest lower) at the DTO layer |
| `cost` | NUMERIC(12,2) | **derived, not entered directly** — see calculation below |
| `sale_price` | NUMERIC(12,2) | the actual source-of-truth price entered by the user |
| `sale_type` | ENUM `sale_type` | default `normal`; selects which factor derives `cost` |
| `stock` | INT | default `0`; the live/current stock count — see `inventory_movements` for how it changes |
| `department_id` | UUID, FK → `departments.id` | `NOT NULL`, `RESTRICT` |
| `group_id` | UUID, FK → `product_groups.id` | `NOT NULL`, `RESTRICT` |
| `brand_id` | UUID, FK → `brands.id` | `NOT NULL`, `RESTRICT` |
| `created_by_id`, `updated_by_id` | UUID, nullable, FK → `users.id`, `SET NULL` | |
| `created_at`, `updated_at`, `deleted_at` | TIMESTAMPTZ | standard |

**Cost calculation (reverse markup):** `cost = round(salePrice / COST_FACTORS[saleType])`, with `COST_FACTORS = { normal: 1.65, neto: 1.30 }`. The sale price is what staff actually enter; cost is back-computed from it, not the other way around. Recalculated automatically whenever `salePrice` or `saleType` changes (create or update) — never edited directly.

**Read behavior worth knowing:** `findAll`/`findOne` deliberately use `.withDeleted()` on the department/group/brand joins (while still filtering `products.deletedAt IS NULL` on the product itself) so a product's classification still displays correctly even if that lookup was later soft-deleted/deactivated. The export module uses the same pattern.

**History:** `department`/`group`/`line` originally existed as **plain varchar columns** (`CreateProductsTable` migration). `AddProductLookupForeignKeys` backfilled the three lookup tables from the distinct string values, added the FK columns, matched rows by code, set them `NOT NULL`, and **dropped the old varchar columns**. "Línea" was renamed to **"Marca" (brand)** in this same migration — there is no separate línea concept.

### `departments`, `product_groups`, `brands`

Identical shape across all three (Departamento / Grupo / Marca — see `GLOSSARY.md`):

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `code` | VARCHAR(50) | **Server-generated, not user-editable.** Next free positive integer as a string: `MAX(CAST(code AS INTEGER))` over rows matching `^[0-9]+$`, including soft-deleted ones (`.withDeleted()`), `+ 1`. Not exposed in any `*ResponseDto` — internal only, used by the export module. Numeric because the original values were imported from a legacy system (SICAF/Sisco). |
| `name` | VARCHAR(150) | Uppercased + trimmed at the DTO layer |
| `created_by_id`, `updated_by_id` | UUID, nullable, FK → `users.id`, `SET NULL` | |
| `created_at`, `updated_at`, `deleted_at` | TIMESTAMPTZ | standard |

Table names: `departments`, `product_groups` (entity class `Group`), `brands`.

### `inventory_movements`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `product_id` | UUID, FK → `products.id`, `CASCADE` | |
| `movement_type` | ENUM `movement_type` | **Auto-derived server-side from the sign of `quantity`, never client-supplied**: positive → `purchase`, negative → `adjustment`. `initial` only exists on rows the `CreateInventoryMovements` migration backfilled (one per pre-existing product with stock > 0, timestamped at that product's own `created_at`, `created_by_id = NULL`) — no endpoint can produce a new `initial` row. |
| `quantity` | INT | Signed — positive adds to stock, negative subtracts. `0` is rejected (`@NotEquals(0)` on the DTO). |
| `notes` | VARCHAR(500), nullable | |
| `created_by_id` | UUID, nullable, FK → `users.id`, `SET NULL` | |
| `created_at` | TIMESTAMPTZ | `@CreateDateColumn` — **no `updated_at`, no `deleted_at`: this table is append-only.** |

**Business logic (`InventoryService.createMovement`):** loads the product, computes `newStock = product.stock + quantity`, rejects with 400 if it would go negative ("Stock insuficiente..."), then inserts the movement row and updates `Product.stock` **in one DB transaction**. There is no endpoint to edit or delete a movement — a correction is made by recording a new, opposite movement.

**Read behavior worth knowing:** `MovementResponseDto`'s `newStock` field is actually **the product's current stock at read time**, not a point-in-time snapshot of what stock became right after that specific movement. Every row for the same product shows the same (current) `newStock` when listed together. This is a known simplification, not a bug to silently "fix" without checking whether the UI relies on the current behavior — flag it if a future phase needs a true historical snapshot.

## Migrations (chronological)

| # | Migration | What it did |
|---|---|---|
| 1 | `CreateUsersTable` | `user_role` enum (`admin`,`employee`), `users` table, self-FK audit columns, partial unique index on `email`. |
| 2 | `CreateProductsTable` | `products` table with plain varchar `department`/`group`/`line` (pre-lookup era). |
| 3 | `CreateProductLookupTables` | `departments`, `product_groups`, `brands` tables. |
| 4 | `AddProductLookupForeignKeys` | Backfills lookups from distinct existing string values, adds/populates FK columns on `products`, sets them `NOT NULL` + `RESTRICT`, drops the old varchar columns. |
| 5 | `AddStockToProducts` | Adds `products.stock INT NOT NULL DEFAULT 0`. |
| 6 | `AddMustChangePasswordToUsers` | Adds `users.must_change_password BOOLEAN NOT NULL DEFAULT false`. |
| 7 | `AddSaleTypeToProducts` | `sale_type` enum, adds `products.sale_type` default `normal`. |
| 8 | `AddAuditorRole` | `ALTER TYPE user_role ADD VALUE 'auditor'` — irreversible `down()` (Postgres can't drop enum values). |
| 9 | `CreateInventoryMovements` | `movement_type` enum, `inventory_movements` table (FKs, indexes on `product_id` and `created_at DESC`), backfills one `initial` movement per pre-existing product with stock > 0. |

Seed scripts (`database/seeds/`, not migrations — run manually via `npm run seed:*`): `seed-admin.ts` (idempotent — skips if the email already exists; reads `SEED_ADMIN_*` env vars) and `seed-product-lookups.ts` (idempotent bulk-seed of the legacy SICAF department/group/brand catalog — 15 departments, 24 groups, ~260 brands — skips rows whose `code` already exists).

**Migration workflow:** `npm run migration:generate -- src/database/migrations/<Name>` after changing an entity, review the generated SQL before committing it, `npm run migration:run` locally to apply, `npm run migration:revert` to undo the last one. `synchronize: false` always — schema changes only ever happen through a migration, never TypeORM auto-sync.

## Invoicing tables (Dataico) — not implemented yet

No invoicing-related tables exist today. Each Dataico module (see `PROJECT_ROADMAP.md`) needs its own schema — at minimum something to persist DIAN resolutions/numbering ranges (Phase 8), and a local record of every invoice/credit note/debit note sent (Phase 10: status, Dataico's own document ID, the DIAN CUFE/response, timestamps) so the app has its own source of truth independent of querying Dataico live every time.

**Do not design this schema from guesswork.** The exact fields depend on what each Dataico endpoint actually requires/returns, confirmed per-module as its reference is shared (see `CLAUDE.md`). Run the Architect agent for each invoicing phase once that reference is available.

**Partial exception — Phase 10's "Envío Factura" request is already confirmed** (recorded in full in `docs/phases/PHASE_10_INVOICING_STANDARD.md`), which is enough to sketch — **not implement** — a rough shape for an eventual `invoices` table:

- `id`, `product`/audit columns following this document's usual conventions
- `dataico_number`, `dataico_account_id`, `resolution_number`, `prefix` — mirroring the confirmed request's `invoice.number`/`dataico_account_id`/`numbering.*`
- `customer_*` fields mirroring the confirmed `invoice.customer.*` block, or a FK to a `third_parties`/`customers` table once Phase 9 (Consulta DIAN Terceros) confirms whether lookups get persisted locally
- `status`, `cufe`, `dian_response` — **not yet confirmed**, since only the request side of "Envío Factura" has been shared, not its response shape
- Line items as a child table (`invoice_items`) mirroring `invoice.items[]` (`sku`, `quantity`, `description`, `price`, `discount_rate`, plus a nested taxes shape) — `sku` likely maps to `products.reference`

This is a sketch to save re-deriving the same information later, not a migration to write now — Phase 10 hasn't started (it comes after Phases 8 and 9, per `PROJECT_ROADMAP.md`), and the response shape, resend/query/credit-note/debit-note requests, and full enum value lists are still unconfirmed (see that phase doc's "Still not confirmed" section).

## Related documents

- `ARCHITECTURE.md` — where the business logic operating on this data lives
- `GLOSSARY.md` — the business terms behind these tables (sale type, movement type, forced password change, etc.)
- `PROJECT_ROADMAP.md` — which phase adds the invoicing tables above
