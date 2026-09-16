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

### `dian_resolutions`

Added Phase 8 — a DIAN numbering resolution successfully synced to Dataico. See `docs/GLOSSARY.md` ("Resolución DIAN") and `docs/phases/PHASE_8_RESOLUTIONS.md`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `document_type` | ENUM `dian_resolution_document_type` (`invoice`, `support_docs`) | Which Dataico numbering-sync endpoint this resolution was sent to. |
| `prefix` | VARCHAR(20) | |
| `subtype` | VARCHAR(50) | Free validated string, not a TypeScript enum — only `ELECTRONICO`/`POS` are confirmed so far, and locking in a full enum would mean guessing the rest. |
| `resolution_code`, `resolution_code_message` (nullable), `resolution_number` | VARCHAR | Mirror Dataico's own `code`/`code-msg`(or `code_msg`)/`number` fields — see the phase doc for the exact per-document-type wire format. |
| `range_start`, `range_end` | INT | The resolution's authorized numbering range. |
| `technical_key` | VARCHAR(255), nullable | Only ever set for `document_type = 'invoice'`, per the confirmed reference. |
| `start_date`, `end_date` | DATE | The resolution's validity window. |
| `created_by_id` | UUID, nullable, FK → `users.id`, `SET NULL` | |
| `created_at` | TIMESTAMPTZ | **No `updated_at`, no `deleted_at` — append-only**, same convention as `inventory_movements`. A resolution is never edited; it's superseded by syncing a new one. The most recently created row for a given `(document_type, prefix)` is the active one — there is no separate "is active" flag. |

**Business logic (`ResolutionsService.create`):** builds Dataico's request body (field names differ by `document_type` — see the phase doc), calls Dataico, and **only inserts the local row if Dataico accepts it** — a rejected sync is never recorded as "on file."

### `invoices`

Added Phase 10 — a local record of every invoice sent to Dataico. See `docs/GLOSSARY.md` ("Factura electrónica") and `docs/phases/PHASE_10_INVOICING_STANDARD.md` for the full confirmed request/response.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `number` | INT | What **this app** sent as the invoice number (caller-supplied, not auto-incremented — see the phase doc). |
| `prefix`, `resolution_number` | VARCHAR | Copied from the active `dian_resolutions` row used at send time. |
| `dataico_number` | VARCHAR, nullable | Dataico's own echoed number (e.g. `"FVE1225"` — prefix+number concatenated), distinct from `number` above. |
| `customer_identification_type`, `customer_identification` | VARCHAR | |
| `customer_company_name`, `customer_first_name`, `customer_family_name` | VARCHAR, nullable | Denormalized onto the invoice rather than a separate customers table — this app doesn't persist third-party lookups (see Phase 9), so there's nothing to join against. |
| `customer_email` | VARCHAR | |
| `issue_date`, `payment_date` | DATE | |
| `dian_status`, `customer_status`, `email_status` | VARCHAR, nullable | Snapshotted from Dataico's response at send time — **not refreshed later**; a status-refresh mechanism is Phase 11's job (Eventos de recepción), not this table's. |
| `cufe` | VARCHAR, nullable | |
| `dataico_uuid` | VARCHAR, nullable | Dataico's internal document id — distinct from the CUFE. |
| `xml_url`, `pdf_url` | VARCHAR, nullable | |
| `qr_code` | TEXT, nullable | The DIAN QR payload text (not an image) — small enough to store directly. |
| `dian_messages` | JSONB, nullable | Array of validation notice strings — can be non-empty even on an accepted invoice. |
| `total_amount` | NUMERIC(12,2) | Computed at send time from the items actually sent (base + tax per item). |
| `request_payload` | JSONB | The exact body sent to Dataico — the full legal record of what was invoiced (line items, taxes, customer data), since there's no separate `invoice_items` table. |
| `response_payload` | JSONB, nullable | Dataico's response, **minus the `xml` field** (the full base64 UBL document — redundant with `xml_url`, would bloat every row). |
| `created_by_id` | UUID, nullable, FK → `users.id`, `SET NULL` | |
| `created_at` | TIMESTAMPTZ | No `deleted_at`, and no `invoice_items` child table — line items live inside `request_payload` rather than being normalized, since Dataico's item/tax shape is still only partially confirmed (see the phase doc's "Still not confirmed" section) and promoting it to rigid columns now would mean modeling fields that might not generalize once notas crédito/débito are confirmed. |
| `updated_at` | TIMESTAMPTZ | Added via `AddUpdatedAtToInvoices` (a follow-up migration, not the original `CreateInvoices`). **Unlike every other table in this document, `invoices` is NOT append-only** — a resend or a status refresh (see below) legitimately updates the same row's status/CUFE/urls in place, since it's a correction to the same legal document, not a new one. |

**Business logic (`InvoicesService.create`):** resolves the active `invoices`-type resolution from `dian_resolutions`, validates stock for every line item up front, sends the request, and — only after Dataico accepts it — decrements stock per item via the existing `InventoryService.createMovement` and persists this row. See the phase doc for the full ordering rationale (a DIAN-accepted invoice can't be un-sent, so failing on insufficient stock has to happen before the Dataico call, not after).

**Business logic (`InvoicesService.resend` / `.refreshStatus`):** both call Dataico (`PUT /invoices/{dataico_uuid}` for resend, `GET /invoices?number=` for refresh) and update the SAME row's status/CUFE/urls via a shared `mapDataicoResponse()` helper — also used by `create` — rather than inserting a new row. See `docs/phases/PHASE_10_INVOICING_STANDARD.md`.

### `pos_invoices` — **removed**

Added Phase 12, **dropped** by the `DropPosInvoices` migration once POS Electrónico stopped being this store's sale flow (see `PROJECT_ROADMAP.md`). It held a local record of every POS Electrónico document sent to Dataico, as its own table separate from `invoices` (the two document types' confirmed request shapes differed too much — nested item `product` object, array `payment-means`, no `dataico_account_id`/`env`/`operation`, different tax shape — to share a schema). Historical shape and rationale stay in `docs/phases/PHASE_12_POS.md`.

### `customers`

Added as a small enhancement connecting Phases 10 and 12 (not a numbered roadmap phase) — a persisted local "customer address book" so store staff can search/reuse a customer across sales instead of retyping or re-looking-up every time. See `docs/GLOSSARY.md` ("Cliente / Customer (local)") for how this differs from "Tercero."

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `identification_type` | VARCHAR(20) | Free string (not a TS enum, same reasoning as `dian_resolutions.subtype`), uppercased at the DTO layer. |
| `identification` | VARCHAR(50) | |
| `identification_dv` | VARCHAR(5), nullable | NIT check digit ("dígito de verificación") — only meaningful when `identification_type = 'NIT'`, free text (not computed/validated server-side). **Local-only**: not part of the confirmed Dataico standard-invoice `customer` payload (see `docs/phases/PHASE_10_INVOICING_STANDARD.md`), so it is never sent to Dataico — stored here purely for this store's own record-keeping/display. |
| `party_type` | VARCHAR(20) | Canonical values `PERSONA_JURIDICA` / `PERSONA_NATURAL` (the standard-invoice vocabulary), validated with `@IsIn` at the DTO layer — not a DB enum. The POS flow's `NATURAL`/`JURIDICA` values are mapped to/from this only in the frontend; this entity is flow-agnostic. |
| `company_name` | VARCHAR(255), nullable | |
| `first_name`, `family_name` | VARCHAR(150), nullable | |
| `tax_level_code` | VARCHAR(20), nullable | |
| `regimen` | VARCHAR(50), nullable | |
| `country_code` | VARCHAR(2), nullable | DB default `CO` |
| `department`, `city` | VARCHAR(10), nullable | DANE codes as free text, matching how the existing invoice form already handles this — no lookup catalog. |
| `address_line` | VARCHAR(255), nullable | |
| `email` | VARCHAR(255) | `NOT NULL`, validated `@IsEmail()` |
| `phone` | VARCHAR(50), nullable | |
| `responsable_iva` | BOOLEAN | default `false` |
| `created_by_id`, `updated_by_id` | UUID, nullable, FK → `users.id`, `SET NULL` | |
| `created_at`, `updated_at`, `deleted_at` | TIMESTAMPTZ | standard, see Conventions |

**Uniqueness**: partial unique index on `(identification_type, identification) WHERE deleted_at IS NULL` — the same composite technique used elsewhere in this document, enforced at the DB level plus an app-level pre-check in `CustomersService` for a clean `ConflictException` message (see `CODING_STANDARDS.md`'s two-layer pattern).

**Business logic**: this is a standalone local address book, not FK'd from `invoices`/`pos_invoices` — those tables keep their existing denormalized `customer_*` columns untouched (see those tables above; they predate this table and there was nothing to join against at the time). `customers` has no `remove()`/delete endpoint in v1 — nothing references it by FK, so a stale entry costs nothing.

### `payroll_entries`

Added Phase 15 — a local record of every Nómina Electrónica period submitted to Dataico. **This app is not the source of truth for payroll** — every figure (salary, accruals, deductions) is already calculated elsewhere and just forwarded here; see `docs/phases/PHASE_15_PAYROLL.md`. That's why `employee_payload`/`accruals`/`deductions` are JSONB rather than normalized columns/tables — there is no employee table to join against.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `number`, `prefix` | INT / VARCHAR | What this app sent. |
| `employee_identification`, `employee_name` | VARCHAR | Promoted to real columns purely for listing/search; everything else about the employee lives in `employee_payload`. |
| `employee_payload` | JSONB | Full employee object exactly as sent to Dataico (hyphenated field names, `code` auto-set equal to `identification` — see the phase doc). |
| `salary` | NUMERIC(14,2) | |
| `periodicity` | VARCHAR | Confirmed value seen: `MENSUAL`. |
| `initial_settlement_date`, `final_settlement_date`, `issue_date`, `payment_date` | DATE | |
| `accruals`, `deductions` | JSONB | Free-form `{code, amount, days?, percentage?, description?}` line items — not a locked enum, this app doesn't validate payroll business rules. |
| `notes` | JSONB, nullable | |
| `dian_status`, `cufe`, `dataico_uuid`, `xml_url`, `pdf_url` | nullable | **Not confirmed** — no Nómina response example was ever shared; these mirror the confirmed standard-invoice response's field names as an assumption, see the phase doc. |
| `request_payload` | JSONB | The exact body sent to Dataico. |
| `response_payload` | JSONB, nullable | Dataico's response, minus the `xml` field (same convention as `invoices`/`pos_invoices`). |
| `created_by_id` | UUID, nullable, FK → `users.id`, `SET NULL` | |
| `created_at`, `updated_at` | TIMESTAMPTZ | Mutable like `invoices`/`pos_invoices` (a future refresh updates in place), not append-only. |

**Business logic (`PayrollService.create`):** builds the confirmed payload (including the `send_dian` underscore exception amid an otherwise hyphenated payload, and `employee.code` auto-derived from `employee.identification`), submits it, and persists this row only after Dataico accepts.

**Business logic (`PayrollService.refreshStatus`):** `GET /payroll-entries/{prefix}/{number}` — **path segments, not a query string**, unlike every other confirmed Dataico resource.

### `cash_registers`

Local bookkeeping, **not a Dataico integration** — one row per calendar day the store opens/closes its cash register ("apertura y cierre de caja"). See `docs/GLOSSARY.md` ("Caja").

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `register_date` | DATE | Plain `UNIQUE` index (not the partial/soft-delete-aware kind used elsewhere) — this table has no soft delete and nothing else FKs to it. One row per day, store-wide — not per user/session. |
| `opened_at` | TIMESTAMPTZ | `NOT NULL` |
| `opened_by_id` | UUID, nullable, FK → `users.id`, `SET NULL` | |
| `closed_at` | TIMESTAMPTZ, nullable | `NULL` until closed. **State is derived from `closed_at IS NULL`** — no status enum, same reasoning as `dian_resolutions`/`invoices` not carrying a redundant status column when a timestamp already implies it. |
| `closed_by_id` | UUID, nullable, FK → `users.id`, `SET NULL` | |
| `total_amount` | NUMERIC(12,2), nullable | `NULL` until closed. **Auto-computed at close time** as the sum of that day's `invoices.total_amount` — what was actually collected ("recaudado"), never manually entered. |
| `total_owed` | NUMERIC(12,2), nullable | `NULL` until closed. **Auto-computed at close time** as the sum of that day's `quotations.total_amount` still open (not invoiced/cancelled) — what was handed out on credit and not yet collected ("adeudado"). Deliberately scoped to quotations *created that day*: a quotation opened on a prior day and still unpaid was already counted in that day's own close and never rolls forward — see `docs/GLOSSARY.md` ("Cotización"). |

**No generic `created_at`/`updated_at`, no `deleted_at`** — `opened_at`/`closed_at` already timestamp the row's only two events, and there's no remove endpoint (nothing references this table, and per business rule a closed day is never reopened).

**Business logic (`CashRegisterService`):** `open()` rejects with 409 if today's register already exists (open or closed) — one open/close cycle per day, no reopen flow. `close()` rejects with 404 if nothing was opened today, 409 if already closed; otherwise computes and persists both `total_amount` (collected) and `total_owed` (owed) — two separate figures, deliberately never summed into one "total" (owed isn't money actually in hand). **`assertOpenToday()` gates `InvoicesService.create`/`QuotationsService.create`** — a new invoice or quotation can't be created without an open register for today (400 if none). "Today" and both daily totals are computed against the **store's local calendar day (`America/Bogotá`, fixed UTC-5)**, not server time — see `common/utils/store-date.util.ts` — since Railway runs UTC and a naive UTC "today" would roll the day boundary at 7pm local time. Per-seller detail isn't tracked here; each invoice/quotation already records its own `created_by_id`. Reads `Invoice`/`Quotation` directly (not via `InvoicesService`/`QuotationsService`) for these two aggregates — both of those services depend on this one for the open-register gate, so going through them here would be circular.

### `quotations` / `quotation_items`

Local enhancement (not a numbered roadmap phase, and not a Dataico integration — a "cotización" is store credit: merchandise handed over before the customer pays, never sent to DIAN itself). See `docs/GLOSSARY.md`.

`quotations`:

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `number` | INT | Local sequence (`MAX(number)+1`, no DIAN resolution/prefix involved — same simplification as `invoices.number`'s fallback path), displayed client-side as `COT-0001`. |
| `customer_identification_type`, `customer_identification`, `customer_identification_dv`, `customer_party_type`, `customer_tax_level_code`, `customer_regimen`, `customer_company_name`, `customer_first_name`, `customer_family_name`, `customer_country_code`, `customer_department`, `customer_city`, `customer_address_line`, `customer_email`, `customer_phone` | VARCHAR, mostly nullable | Same shape as `invoices`' own `customer_*` columns, denormalized the same way — plus `customer_identification_dv`/`customer_phone`, which `invoices` doesn't persist (Dataico doesn't need them) but a quotation, never sent to Dataico directly, keeps for its own record. |
| `notes` | TEXT, nullable | |
| `total_amount` | NUMERIC(12,2) | Cached — recomputed by `QuotationsService` whenever items change. |
| `invoiced_at` | TIMESTAMPTZ, nullable | |
| `invoice_id` | UUID, nullable, FK → `invoices.id`, `SET NULL` | |
| `cancelled_at` | TIMESTAMPTZ, nullable | |
| `created_by_id`, `updated_by_id` | UUID, nullable, FK → `users.id`, `SET NULL` | |
| `created_at`, `updated_at`, `deleted_at` | TIMESTAMPTZ | standard, see Conventions |

**No stored status column** — derived from `invoiced_at`/`cancelled_at` (`cancelled_at` set → cancelled; else `invoiced_at` set → invoiced; else open), same reasoning as `cash_registers.closed_at`.

`quotation_items`:

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `quotation_id` | UUID, FK → `quotations.id`, `CASCADE` | |
| `product_id` | UUID, FK → `products.id`, `RESTRICT` | |
| `quantity` | INT | |
| `tax_rate` | NUMERIC(5,2) | |
| `discount` | NUMERIC(12,2), nullable | Same "flat COP amount, not a percentage" semantics as `CreateInvoiceItemDto.discount`. |
| `unit_price` | NUMERIC(12,2) | **The locked price** — a snapshot of `products.sale_price` (gross, IVA-inclusive) taken when this row is created or last touched by an edit, confirmed with the human: the customer keeps the price they were quoted, even if the product's price changes before they come back to pay. |
| `created_at`, `updated_at` | TIMESTAMPTZ | No soft delete — a row removed by an edit has no further use once the inventory movement it triggered (the real audit trail) is recorded. |

**Business logic (`QuotationsService`):**
- `create()` — gated on `CashRegisterService.assertOpenToday()` (stock is leaving today, same as a real sale), validates stock for every line up front, decrements it via `InventoryService.createMovement` (one negative movement per line, same helper `InvoicesService` uses), *then* persists the `quotations`/`quotation_items` rows — same fail-before-persisting ordering `InvoicesService.create` uses, and the same accepted partial-failure risk if a movement fails mid-loop.
- `updateItems()` — only while open. Full-replace: diffs old vs. new items by `product_id`, computes one signed inventory movement per product whose net quantity changed (a lower quantity, or a removed line, returns the difference), validates stock for every net increase up front, then re-snapshots `unit_price` for every line in the new list (an edit is a fresh pricing checkpoint, not just the changed lines).
- `invoice()` — only while open. Converts to a real `Invoice` via `InvoicesService.create()`, passing each item's locked `unit_price` through `CreateInvoiceItemDto.unitPriceOverride` (an internal-only field, never set by the normal Venta form) and telling `create()` to skip its own stock check/decrement via an internal-only 3rd parameter — required for correctness, not just to avoid double-counting: by invoice time, `products.stock` no longer includes these reserved units at all, so re-running the normal sufficiency check would fail a legitimate sale. Bills either to the quotation's own customer columns or to a caller-supplied override (`InvoiceQuotationDto.customer`, required when `useSameCustomer` is false).
- `cancel()` — only while open. One positive (return) movement per line, sets `cancelled_at`.

The shared "unwrap IVA-inclusive price → subtract discount → recompute tax" math (`InvoicesService.resolveItems()` and `QuotationsService` both need it) lives in `common/utils/invoice-math.util.ts`'s `computeLineAmounts()`.

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
| 10 | `CreateDianResolutions` | Phase 8. `dian_resolution_document_type` enum (`invoice`, `support_docs`), `dian_resolutions` table (FK to `users`, indexes on `(document_type, prefix)` and `created_at DESC`). |
| 11 | `CreateInvoices` | Phase 10. `invoices` table (FK to `users`, indexes on `created_at DESC` and `customer_identification`). |
| 12 | `AddUpdatedAtToInvoices` | Phase 10 (resend/query follow-up). Adds `invoices.updated_at` — needed once resend/refresh started updating existing rows instead of only ever inserting. |
| 13 | `CreatePosInvoices` | Phase 12. `pos_invoices` table (FK to `users`, index on `created_at DESC`), including `updated_at` from the start. |
| 14 | `CreatePayrollEntries` | Phase 15. `payroll_entries` table (FK to `users`, index on `created_at DESC`), including `updated_at` from the start. |
| 15 | `CreateCustomers` | Small enhancement (not a numbered phase). `customers` table (FKs to `users` for both audit columns, partial unique index on `(identification_type, identification)`, indexes on `created_at DESC` and `identification`). Hand-written — no live database was reachable to generate/verify it against, see the note in this migration's PR/commit. |
| 16 | `DropPosInvoices` | POS Electrónico removal (see `PROJECT_ROADMAP.md`). Drops the `pos_invoices` table. Hand-written, same reason as `CreateCustomers` — no live database reachable to generate against. |
| 17 | `CreateCashRegisters` | Local enhancement (not a numbered phase). `cash_registers` table (FKs to `users` for `opened_by`/`closed_by`, plain unique index on `register_date`). Generated against a live local DB and reviewed before committing — see `DATABASE.md`'s migration workflow. |
| 18 | `AddIdentificationDvToCustomers` | Local enhancement (not a numbered phase). Adds `customers.identification_dv VARCHAR(5)`, nullable — NIT check digit, local-only (see `customers` above). Hand-written, same reason as `CreateCashRegisters`/`DropPosInvoices` — the raw `migration:generate` diff against the live local DB included unrelated drift across every other table (stale `created_at`/`updated_at` column types, FK constraint churn), discarded in favor of a minimal hand-written `ALTER TABLE`. |
| 19 | `CreateQuotations` | Local enhancement (not a numbered phase). `quotations` and `quotation_items` tables (FKs to `invoices`/`users`/`products`, index on `quotations.created_at DESC` and `quotation_items.quotation_id`). Hand-written, same reason as the two migrations above — the raw `migration:generate` diff against the live local DB included the same unrelated drift across every other table. |
| 20 | `AddTotalOwedToCashRegisters` | Local enhancement (not a numbered phase). Adds `cash_registers.total_owed NUMERIC(12,2)`, nullable — the day's still-open-quotations total, alongside the existing `total_amount` (collected). Hand-written, same reason as the migrations above. |

Seed scripts (`database/seeds/`, not migrations — run manually via `npm run seed:*`): `seed-admin.ts` (idempotent — skips if the email already exists; reads `SEED_ADMIN_*` env vars) and `seed-product-lookups.ts` (idempotent bulk-seed of the legacy SICAF department/group/brand catalog — 15 departments, 24 groups, ~260 brands — skips rows whose `code` already exists).

**Migration workflow:** `npm run migration:generate -- src/database/migrations/<Name>` after changing an entity, review the generated SQL before committing it, `npm run migration:run` locally to apply, `npm run migration:revert` to undo the last one. `synchronize: false` always — schema changes only ever happen through a migration, never TypeORM auto-sync.

## Remaining invoicing tables (Dataico) — not implemented yet

`dian_resolutions` (Phase 8) and `invoices` (Phase 10, send-only) are done. Still missing: credit notes, debit notes, and any status-refresh/reception-event table (Phase 11) — their request/response shapes aren't confirmed yet.

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
