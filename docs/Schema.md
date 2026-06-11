# CasaRespuestos — Database Schema

This document defines the normalized PostgreSQL schema and TypeORM entity
conventions for CasaRespuestos. It is written incrementally: this revision
covers the **conventions used by every entity**, the **`User` entity**
(required to unblock the `auth` module), the **`Product` entity**, and the
three product-classification lookup entities (**`Department`**, **`Group`**
/ `product_groups`, **`Brand`**). `InventoryMovement` and other entities will
be added in follow-up revisions but MUST follow the conventions defined here.

> **Note on `categories`/`brands` from `docs/Requirements.md` §5.4-§5.5**:
> the original "Category" and "Brand" lookup-table concept from the
> Requirements doc has been **superseded**. Product classification is now
> modeled as **three** required lookup relations — `Department`
> (Departamento), `Group`/`product_groups` (Grupo), and `Brand` (Marca) — see
> §4-§7 below. There is no separate `categories` table.

---

## 1. Conventions (apply to every entity)

These conventions come from `docs/Requirements.md` §6.4 and `CLAUDE.md`.
Every TypeORM entity in `apps/api/src/**/entities/*.entity.ts` MUST include
them unless explicitly noted otherwise.

### 1.1 Primary keys

- All tables use `id: uuid` as primary key, generated with
  `@PrimaryGeneratedColumn('uuid')`.
- Rationale: avoids leaking sequential row counts, safe for client-generated
  references, works well with offline-ish mobile flows later.

### 1.2 Audit columns

Every entity includes:

| Column      | Type                          | TypeORM decorator                                  | Notes |
|-------------|-------------------------------|-----------------------------------------------------|-------|
| `createdAt` | `timestamptz`                 | `@CreateDateColumn()`                               | set automatically |
| `updatedAt` | `timestamptz`                 | `@UpdateDateColumn()`                               | set automatically |
| `createdBy` | `uuid` nullable FK → `users.id` | `@ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })` + `@JoinColumn` + matching `@Column({ name: 'created_by_id', nullable: true })` for the raw FK | nullable so the **first user / seed data / system actions** don't require a self-reference |
| `updatedBy` | `uuid` nullable FK → `users.id` | same pattern as `createdBy`                          | updated on every mutation |

**Self-referential convention for `User`:** the `User` entity's own
`createdBy`/`updatedBy` columns are **nullable FKs to `users.id`** (self
relation). The very first admin user (created via seed script / migration)
has `createdBy = NULL` and `updatedBy = NULL`. Every subsequent user created
via the admin "create user" flow gets `createdBy = <admin's id>`.

This same nullable-self/foreign-FK pattern is reused on all other entities
(`Product.createdBy -> User`, etc.) — only `User` is self-referential.

Population of `createdBy`/`updatedBy` is **not** automatic at the DB level;
it is set by application code (service layer) from the authenticated
request's `req.user.id`, via a shared `@CurrentUser()` decorator (see
`docs/ApiContract.md` §4).

### 1.3 Soft delete

Every entity includes:

| Column      | Type            | TypeORM decorator      |
|-------------|-----------------|--------------------------|
| `deletedAt` | `timestamptz` nullable | `@DeleteDateColumn()` |

- Use TypeORM's built-in soft-delete (`softRemove()` / `softDelete()`).
- Default repository queries automatically exclude soft-deleted rows
  (TypeORM does this for `find*` methods when `@DeleteDateColumn` is
  present — no extra `withDeleted: true` unless explicitly needed for
  admin "show inactive" views).
- "Deactivate" actions in the UI (categories, brands, products, users) map
  to `softDelete()`, never `DELETE FROM`.

### 1.4 Naming conventions

- TypeORM entity class: `PascalCase` singular (e.g. `User`, `Product`).
- Table name: `snake_case` plural via `@Entity('users')`.
- Column names: `snake_case` in the DB via `@Column({ name: 'first_name' })`,
  `camelCase` in TypeScript. (Use a global `NamingStrategy` —
  `SnakeNamingStrategy` from `typeorm-naming-strategies` — so this doesn't
  need to be repeated on every column. Backend agent should add this package
  and wire it into the TypeORM module config.)
- Enum types: defined as TS `enum`, persisted via `@Column({ type: 'enum', enum: X })`,
  Postgres enum type name `snake_case` e.g. `user_role`.

### 1.5 Indexes

- Every FK column gets an index (TypeORM creates these automatically for
  `@ManyToOne` relations via `@JoinColumn`, but verify in migrations).
- Unique constraints are added via `@Column({ unique: true })` or
  `@Unique([...])` for composite uniqueness.
- Soft-deleted rows: for columns with uniqueness constraints that should
  allow reuse after deactivation (e.g. `email`, `sku`), prefer a **partial
  unique index** (`WHERE deleted_at IS NULL`) over a plain unique constraint.
  TypeORM doesn't support partial indexes via decorators directly — define
  these in a migration using `queryRunner.query(...)` with raw SQL, e.g.:

  ```sql
  CREATE UNIQUE INDEX users_email_unique_active
    ON users (email)
    WHERE deleted_at IS NULL;
  ```

  This is called out here so the Backend agent applies it consistently to
  `users.email`, `products.reference`, and `code` on each of the three
  product-classification lookup tables (`departments`, `product_groups`,
  `brands` — see §5-§7).

---

## 2. `User` Entity

Table: `users`

| Column          | Type                              | Constraints                                   | Notes |
|-----------------|-----------------------------------|------------------------------------------------|-------|
| `id`            | `uuid`                            | PK, default `gen_random_uuid()`                | |
| `email`         | `varchar(255)`                    | NOT NULL, partial-unique (active rows only)    | login identifier |
| `password_hash` | `varchar(60)`                     | NOT NULL                                       | bcrypt hash, **never** returned in API responses |
| `first_name`    | `varchar(100)`                    | NOT NULL                                       | |
| `last_name`     | `varchar(100)`                    | NOT NULL                                       | |
| `role`          | `enum('admin','employee')`        | NOT NULL, default `'employee'`                 | Postgres enum `user_role` |
| `is_active`     | `boolean`                         | NOT NULL, default `true`                       | distinct from soft delete — see note below |
| `last_login_at` | `timestamptz`                     | nullable                                        | updated on successful login |
| `created_at`    | `timestamptz`                     | NOT NULL, default `now()`                      | `@CreateDateColumn` |
| `updated_at`    | `timestamptz`                     | NOT NULL, default `now()`                      | `@UpdateDateColumn` |
| `deleted_at`    | `timestamptz`                     | nullable                                        | `@DeleteDateColumn` |
| `created_by_id` | `uuid`                            | nullable, FK → `users.id`, `ON DELETE SET NULL` | self-referential, see §1.2 |
| `updated_by_id` | `uuid`                            | nullable, FK → `users.id`, `ON DELETE SET NULL` | self-referential, see §1.2 |

### Notes

- **`is_active` vs `deleted_at`**: Requirements §5.2 says admins can
  "create, edit, and **deactivate** users". We use `is_active = false` for
  the deactivate action (a *toggleable* state — admin can reactivate), and
  reserve `deleted_at` (soft delete) for a true removal flow if one is added
  later. Practically: a deactivated user (`is_active = false`) must be
  rejected at login (`401 Unauthorized`) even though the row still exists
  and is not soft-deleted. This distinction matters because soft-deleted
  rows are excluded from default queries entirely (so an admin couldn't see
  or reactivate a soft-deleted user without `withDeleted: true`), whereas
  `is_active = false` keeps the user fully visible/manageable in the admin
  user list.
- **Self-deletion guard** (Requirements §5.2 "Users cannot delete
  themselves"): enforced in the `users` service layer by comparing the
  target user id to `req.user.id`, not at the DB level.
- **`role` enum** matches `docs/Requirements.md` §4 exactly: `admin` |
  `employee`. Defined in TypeScript as:

  ```typescript
  export enum UserRole {
    ADMIN = 'admin',
    EMPLOYEE = 'employee',
  }
  ```

- **Password hashing**: bcrypt with cost factor from `BCRYPT_ROUNDS` env var
  (already defined in `.env.example`). `password_hash` column stores the
  bcrypt output (60 chars). Always exclude from `class-transformer`
  serialization via `@Exclude()` on the entity property (combined with a
  global `ClassSerializerInterceptor`), AND/OR map to a response DTO that
  simply omits the field — Backend agent's choice, but pick one approach and
  apply consistently across all entities with sensitive fields.

### Indexes / constraints summary

```sql
-- Partial unique index, allows email reuse if a user row is ever soft-deleted
CREATE UNIQUE INDEX users_email_unique_active
  ON users (email)
  WHERE deleted_at IS NULL;

-- FK indexes (auto-created by TypeORM for the relations, listed for clarity)
CREATE INDEX users_created_by_id_idx ON users (created_by_id);
CREATE INDEX users_updated_by_id_idx ON users (updated_by_id);
```

---

## 3. Product-classification lookup tables — overview

`Product` rows must each reference exactly one **Department**
(Departamento), one **Group** (Grupo), and one **Brand** (Marca). All three
follow an identical shape and are described individually in §5-§7:

| Column          | Type           | Constraints                                  | Notes |
|-----------------|----------------|------------------------------------------------|-------|
| `id`            | `uuid`         | PK, default `gen_random_uuid()`                | |
| `code`          | `varchar(50)`  | NOT NULL, partial-unique (active rows only)    | short code shown in UI/exports |
| `name`          | `varchar(150)` | NOT NULL                                       | display name |
| `created_at`    | `timestamptz`  | NOT NULL, default `now()`                      | `@CreateDateColumn` |
| `updated_at`    | `timestamptz`  | NOT NULL, default `now()`                      | `@UpdateDateColumn` |
| `deleted_at`    | `timestamptz`  | nullable                                        | `@DeleteDateColumn` — "deactivate" |
| `created_by_id` | `uuid`         | nullable, FK → `users.id`, `ON DELETE SET NULL` | per §1.2 |
| `updated_by_id` | `uuid`         | nullable, FK → `users.id`, `ON DELETE SET NULL` | per §1.2 |

Each gets a partial unique index on `code`:

```sql
CREATE UNIQUE INDEX <table>_code_unique_active
  ON <table> (code)
  WHERE deleted_at IS NULL;
```

"Deactivate" in the admin UI = `softDelete()` on these tables (per §1.3).
Soft-deleted lookup rows are excluded from default `find*` queries — products
already pointing at a deactivated lookup row keep their FK (no cascade), but
the lookup won't appear in dropdowns for *new*/edited products. See §8 (open
issue) for the referential-integrity implication when deactivating a lookup
that's still referenced by active products.

---

## 4. `Product` Entity

Table: `products`

| Column          | Type             | Constraints                                     | Notes |
|-----------------|------------------|--------------------------------------------------|-------|
| `id`            | `uuid`           | PK, default `gen_random_uuid()`                  | |
| `reference`     | `varchar(100)`   | NOT NULL, partial-unique (active rows only)      | SKU / product code |
| `description`   | `varchar(255)`   | NOT NULL                                          | |
| `cost`          | `numeric(12,2)`  | NOT NULL                                          | purchase cost |
| `sale_price`    | `numeric(12,2)`  | NOT NULL                                          | |
| `stock`         | `int`            | NOT NULL, default `0`                            | quantity on hand |
| `department_id` | `uuid`           | NOT NULL, FK → `departments.id`, `ON DELETE RESTRICT` | replaces old `department` varchar |
| `group_id`      | `uuid`           | NOT NULL, FK → `product_groups.id`, `ON DELETE RESTRICT` | replaces old `group` varchar |
| `brand_id`      | `uuid`           | NOT NULL, FK → `brands.id`, `ON DELETE RESTRICT` | replaces old `line` varchar — Marca **takes the place of** Línea |
| `created_at`    | `timestamptz`    | NOT NULL, default `now()`                        | `@CreateDateColumn` |
| `updated_at`    | `timestamptz`    | NOT NULL, default `now()`                        | `@UpdateDateColumn` |
| `deleted_at`    | `timestamptz`    | nullable                                          | `@DeleteDateColumn` |
| `created_by_id` | `uuid`           | nullable, FK → `users.id`, `ON DELETE SET NULL`  | per §1.2 |
| `updated_by_id` | `uuid`           | nullable, FK → `users.id`, `ON DELETE SET NULL`  | per §1.2 |

### Notes

- **Removed columns**: `department` (varchar), `group` (varchar), `line`
  (varchar) are dropped entirely. The "línea" concept is **not** preserved —
  `brand_id` (Marca) replaces it as the third required classification axis.
- **Required FKs**: all three of `department_id`, `group_id`, `brand_id` are
  `NOT NULL` — every product must have a department, group, and brand,
  mirroring the "category/brand required" rule from `docs/Requirements.md`
  §5.4/§5.5 (now superseded text, but the *required* constraint carries
  forward onto these three columns).
- **`ON DELETE RESTRICT`**: since the lookup tables use soft delete (not hard
  delete) and the app never issues `DELETE FROM departments/...`, `RESTRICT`
  is effectively a safety net only — it would only fire if someone bypassed
  the ORM and hard-deleted a lookup row that's still referenced. Soft-deleted
  lookups remain referenced by `id` without issue (see §3).
- **TypeORM relations**: `@ManyToOne(() => Department, { nullable: false })`
  + `@JoinColumn({ name: 'department_id' })` (and analogous for `Group` →
  `product_groups` and `Brand`). FK indexes are auto-created by TypeORM for
  `@JoinColumn`-backed relations; verify they appear in the migration.

### Indexes / constraints summary

```sql
-- Partial unique index (already exists from CreateProductsTable migration)
CREATE UNIQUE INDEX products_reference_unique_active
  ON products (reference)
  WHERE deleted_at IS NULL;

-- New FK indexes for the lookup relations
CREATE INDEX products_department_id_idx ON products (department_id);
CREATE INDEX products_group_id_idx ON products (group_id);
CREATE INDEX products_brand_id_idx ON products (brand_id);
```

---

## 5. `Department` Entity (Departamento)

Table: `departments`

Follows the shape in §3 exactly. TypeScript entity class: `Department`.

```sql
CREATE UNIQUE INDEX departments_code_unique_active
  ON departments (code)
  WHERE deleted_at IS NULL;

CREATE INDEX departments_created_by_id_idx ON departments (created_by_id);
CREATE INDEX departments_updated_by_id_idx ON departments (updated_by_id);
```

Referenced by `products.department_id` (NOT NULL, `ON DELETE RESTRICT`).

---

## 6. `Group` Entity (Grupo) — table `product_groups`

TypeScript entity class: `Group`. Table name: **`product_groups`** (NOT
`groups`).

> **Naming rationale**: `group` is a reserved word in SQL (`GROUP BY`) and
> `groups` is also the literal name Postgres uses internally in some contexts
> and is a common collision target for other extensions/tooling. While
> `"groups"` (quoted) would technically work in Postgres, it invites
> recurring friction — accidental unquoted references in raw SQL/migrations,
> ORM query builders that don't always quote identifiers, and confusing error
> messages. To avoid all of that, the table is named **`product_groups`**,
> consistent with this schema's domain-prefixed naming for entities that are
> specific to product classification (mirrors `product_groups` reading
> naturally as "groups of products"). The TypeORM entity class remains
> `Group` (singular, PascalCase, per §1.4) — only the `@Entity('product_groups')`
> table name differs from the class-name-derived default.

Column shape follows §3 exactly.

```sql
CREATE UNIQUE INDEX product_groups_code_unique_active
  ON product_groups (code)
  WHERE deleted_at IS NULL;

CREATE INDEX product_groups_created_by_id_idx ON product_groups (created_by_id);
CREATE INDEX product_groups_updated_by_id_idx ON product_groups (updated_by_id);
```

Referenced by `products.group_id` (NOT NULL, `ON DELETE RESTRICT`).

---

## 7. `Brand` Entity (Marca)

Table: `brands`

Follows the shape in §3 exactly. TypeScript entity class: `Brand`. This
table **replaces** the old "línea" (`line` varchar column) on `Product` —
Marca is now the third required classification axis alongside Departamento
and Grupo.

```sql
CREATE UNIQUE INDEX brands_code_unique_active
  ON brands (code)
  WHERE deleted_at IS NULL;

CREATE INDEX brands_created_by_id_idx ON brands (created_by_id);
CREATE INDEX brands_updated_by_id_idx ON brands (updated_by_id);
```

Referenced by `products.brand_id` (NOT NULL, `ON DELETE RESTRICT`).

---

## 8. Forward-looking notes / open issues (not implemented yet)

These are noted so the `User`/`Product`/lookup entity designs don't conflict
with future work:

- `InventoryMovement` and other audit-style tables will reference
  `users.id` for "performed by" — same nullable FK pattern.
- A future `RefreshToken` table is **not** part of this design — see
  `docs/ApiContract.md` §2 for the chosen refresh-token strategy
  (stateless JWT refresh, no DB-backed token table for v1). If token
  revocation/blacklisting becomes a requirement, a `refresh_tokens` table
  can be added later without breaking the `User` entity.
- **Open issue — deactivating a lookup row in use**: §3 notes that
  soft-deleting a `Department`/`Group`/`Brand` row doesn't cascade or block,
  but it *does* mean existing products silently keep pointing at a
  classification value no longer selectable for new/edited products. Two
  follow-up options (not decided yet, flag for product owner):
  1. Block deactivation via `409 Conflict` if `COUNT(products WHERE
     <fk>_id = :id AND deleted_at IS NULL) > 0` (mirrors how the `users`
     module could guard against deleting a referenced row).
  2. Allow deactivation freely; surface affected products in the admin UI
     ("12 products use this group — they will keep their current value but
     you won't be able to select it for new products").
  No backend behavior should be implemented for this until the product owner
  picks one — default assumption for the first migration is **option 2**
  (no blocking check), since it's strictly additive and won't need a second
  migration if option 1 is chosen later.
- Full ER diagram and remaining entities (`InventoryMovement`, etc.) will be
  added in a follow-up revision of this document before the `inventory`
  module starts.

---

## 9. Migration plan: Department / Group / Brand + `products` FK changes

This section describes the migration(s) needed to go from the current state
(`products.department`/`group`/`line` as freeform varchar columns, no
`departments`/`product_groups`/`brands` tables) to the schema in §3-§7. The
existing migration `1781053132548-CreateProductsTable.ts` is **not**
modified — these are new, additive migrations that run after it.

Recommend **two separate migrations** (can be split further if helpful, but
at minimum: schema-creation must happen before the data backfill, and the
data backfill must happen before the `NOT NULL` FK columns are added):

### 9.1 Migration A — create lookup tables

1. Create three tables: `departments`, `product_groups`, `brands` — each
   with the column shape from §3 (`id`, `code`, `name`, `created_at`,
   `updated_at`, `deleted_at`, `created_by_id`, `updated_by_id`).
2. For each table:
   - FK `created_by_id` → `users.id` (`ON DELETE SET NULL`), named e.g.
     `fk_departments_created_by_id`.
   - FK `updated_by_id` → `users.id` (`ON DELETE SET NULL`), named e.g.
     `fk_departments_updated_by_id`.
   - Index on `created_by_id` and `updated_by_id` (e.g.
     `departments_created_by_id_idx`).
   - Partial unique index on `code` where `deleted_at IS NULL` (e.g.
     `departments_code_unique_active`), per §1.5 / §3.
3. `down()` drops all of the above in reverse order for all three tables.

This mirrors `1781053132548-CreateProductsTable.ts` structurally — same
column types, FK naming convention, and partial-index pattern.

### 9.2 Migration B — backfill data, then alter `products`

Run as a single migration so the backfill and the column changes are
atomic (or two migrations back-to-back if the team prefers smaller diffs —
but the backfill **must** complete before the `NOT NULL` constraint is
added, so they can't be reordered).

**Step 1 — backfill lookup tables from existing distinct values:**

```sql
-- Departments
INSERT INTO departments (id, code, name, created_at, updated_at)
SELECT gen_random_uuid(), department, department, now(), now()
FROM (SELECT DISTINCT department FROM products WHERE deleted_at IS NULL) d;

-- Groups (table product_groups)
INSERT INTO product_groups (id, code, name, created_at, updated_at)
SELECT gen_random_uuid(), "group", "group", now(), now()
FROM (SELECT DISTINCT "group" FROM products WHERE deleted_at IS NULL) g;

-- Brands (backfilled from the old "line" column)
INSERT INTO brands (id, code, name, created_at, updated_at)
SELECT gen_random_uuid(), line, line, now(), now()
FROM (SELECT DISTINCT line FROM products WHERE deleted_at IS NULL) l;
```

> Notes:
> - `code` and `name` are seeded with the same value (the old freeform
>   string) since there's no separate "code" concept in the legacy data.
>   Admins can edit `code`/`name` afterward via the new CRUD endpoints to
>   apply real short codes.
> - This only backfills from **non-soft-deleted** products. If
>   soft-deleted products reference department/group/line values not
>   present in any active product, those values won't get a lookup row,
>   and the FK backfill in Step 2 for those specific soft-deleted rows
>   would fail. Two options: (a) run the `SELECT DISTINCT` without the
>   `WHERE deleted_at IS NULL` filter (simplest, recommended — slightly
>   over-creates lookup rows but guarantees every product row, including
>   soft-deleted ones, has a backfill target), or (b) handle soft-deleted
>   products' FKs separately (set to a placeholder "Unclassified" lookup
>   row). **Recommended: option (a)** — drop the `WHERE` filter in the
>   `SELECT DISTINCT` subqueries above.
> - Empty-string or `NULL` values in the legacy `department`/`group`/`line`
>   columns (if any exist) need a fallback `code`/`name` (e.g.
>   `'UNCLASSIFIED'`) — verify with a pre-migration data audit
>   (`SELECT COUNT(*) FROM products WHERE department = '' OR department IS
>   NULL`, etc.) before running this in any environment with real data.

**Step 2 — add nullable FK columns, populate, then enforce `NOT NULL`:**

```sql
-- Add as nullable first (can't be NOT NULL until populated)
ALTER TABLE products ADD COLUMN department_id uuid;
ALTER TABLE products ADD COLUMN group_id uuid;
ALTER TABLE products ADD COLUMN brand_id uuid;

-- Populate from the backfilled lookup tables, matching on the old string value
UPDATE products p
SET department_id = d.id
FROM departments d
WHERE d.code = p.department;

UPDATE products p
SET group_id = g.id
FROM product_groups g
WHERE g.code = p."group";

UPDATE products p
SET brand_id = b.id
FROM brands b
WHERE b.code = p.line;

-- Enforce NOT NULL now that every row is populated
ALTER TABLE products ALTER COLUMN department_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN brand_id SET NOT NULL;

-- Add FKs
ALTER TABLE products ADD CONSTRAINT fk_products_department_id
  FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT;
ALTER TABLE products ADD CONSTRAINT fk_products_group_id
  FOREIGN KEY (group_id) REFERENCES product_groups (id) ON DELETE RESTRICT;
ALTER TABLE products ADD CONSTRAINT fk_products_brand_id
  FOREIGN KEY (brand_id) REFERENCES brands (id) ON DELETE RESTRICT;

-- Indexes
CREATE INDEX products_department_id_idx ON products (department_id);
CREATE INDEX products_group_id_idx ON products (group_id);
CREATE INDEX products_brand_id_idx ON products (brand_id);

-- Drop old columns
ALTER TABLE products DROP COLUMN department;
ALTER TABLE products DROP COLUMN "group";
ALTER TABLE products DROP COLUMN line;
```

**`down()` for Migration B** must reverse this: re-add `department`/
`group`/`line` as nullable varchar, backfill from the lookup tables via the
FK ids, drop the FK columns/constraints/indexes, then the lookup tables
themselves are dropped by Migration A's `down()`. Since `down()` here is
mainly a local-dev safety net (no production rollback expected once this
ships), a best-effort reverse that restores the varchar columns and copies
`code` back into them is sufficient — exact round-trip of `code`/`name`
edits made after the migration is out of scope for `down()`.

### 9.3 Order of operations summary

1. Run **Migration A** (create `departments`, `product_groups`, `brands`
   tables — empty).
2. Run **Migration B** (backfill rows into those tables from distinct
   `products.department`/`group`/`line` values, then add
   `department_id`/`group_id`/`brand_id` FK columns to `products`, populate,
   set `NOT NULL`, add FKs/indexes, drop old varchar columns).
3. Backend agent updates `Product` entity (remove `department`/`group`/
   `line` columns, add `department`/`group`/`brand` `@ManyToOne` relations
   with `@JoinColumn`s on `department_id`/`group_id`/`brand_id`), and adds
   the three new `Department`/`Group`/`Brand` entities + modules per
   `docs/ApiContract.md` §6-§7.
4. Run a **pre-migration data audit** in any environment with real data
   (per the note in §9.2) before applying Migration B — confirm no
   empty/NULL `department`/`group`/`line` values, or add a fallback
   `'UNCLASSIFIED'` row + `COALESCE` in the `UPDATE` statements.
