# CasaRespuestos — Database Schema

This document defines the normalized PostgreSQL schema and TypeORM entity
conventions for CasaRespuestos. It is written incrementally: this revision
covers the **conventions used by every entity** plus the **`User` entity**,
which is required to unblock the `auth` module. Other entities (`Product`,
`Category`, `Brand`, `InventoryMovement`, etc.) will be added in follow-up
revisions but MUST follow the conventions defined here.

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
  `users.email` now and `products.sku`, `categories.name`, `brands.name`
  later.

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

## 3. Forward-looking notes (not implemented yet)

These are noted so the `User` entity design doesn't conflict with future
work:

- `InventoryMovement` and other audit-style tables will reference
  `users.id` for "performed by" — same nullable FK pattern.
- A future `RefreshToken` table is **not** part of this design — see
  `docs/ApiContract.md` §2 for the chosen refresh-token strategy
  (stateless JWT refresh, no DB-backed token table for v1). If token
  revocation/blacklisting becomes a requirement, a `refresh_tokens` table
  can be added later without breaking the `User` entity.
- Full ER diagram and remaining entities (`Product`, `Category`, `Brand`,
  `InventoryMovement`) will be added in a follow-up revision of this
  document before the `products`/`inventory` modules start.
