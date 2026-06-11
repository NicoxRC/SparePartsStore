---
name: lookup-modules
description: departments/groups/brands CRUD modules implemented per Schema.md §5-7 and ApiContract.md §6 — shared shape, RBAC, migration
metadata:
  type: project
---

Implemented three structurally identical lookup CRUD modules:
`apps/api/src/departments/`, `apps/api/src/groups/` (entity class `Group`,
table `product_groups`), `apps/api/src/brands/`. Each has
entities/<x>.entity.ts, dto/{create,update,query,response}, <x>.service.ts,
<x>.controller.ts, <x>.module.ts — all mirroring `users`/`products` patterns
(see [[products-module]], [[common-utils]]).

Shape: `id` (uuid), `code` (varchar(50), partial-unique active rows), `name`
(varchar(150)), audit columns, soft delete. Response DTO exposes only
`{ id, code, name, createdAt, updatedAt }` — no createdBy/updatedBy.

RBAC: POST/PATCH/DELETE = `@Roles(UserRole.ADMIN)`; GET (list+byId) = any
authenticated user (no @Roles decorator needed since RolesGuard allows
unrestricted access when no roles metadata present).

DELETE = softDelete via `softRemove()`, 204, no in-use check (per Schema.md
§8 open issue — deliberately not implemented for v1).

Migration: `1781141633862-CreateProductLookupTables.ts` — single migration,
loops over `['departments', 'product_groups', 'brands']` creating each table
with the same column set, FK names `fk_<table>_created_by_id` /
`fk_<table>_updated_by_id`, indexes `<table>_created_by_id_idx` /
`<table>_updated_by_id_idx`, and partial unique index
`<table>_code_unique_active WHERE deleted_at IS NULL`. Mirrors
`1781053132548-CreateProductsTable.ts` structurally but factored as a loop
since all three tables are identical.

Registered in `app.module.ts`: `DepartmentsModule`, `GroupsModule`,
`BrandsModule` added after `ProductsModule`.

**Done (follow-up completed)**: Migration B
(`1781141633863-AddProductLookupForeignKeys.ts`) backfills lookup tables from
distinct `department`/`group`/`line` values (no `deleted_at` filter, per
Schema.md §9.2 option (a)), adds `department_id`/`group_id`/`brand_id` FKs
(`ON DELETE RESTRICT`) + indexes, drops old varchar columns. `Product` entity
now has `@ManyToOne` relations (`department`, `group`, `brand`) with
`@JoinColumn`s; DTOs use `departmentId`/`groupId`/`brandId` (`@IsUUID()`);
`ProductResponseDto` exposes nested `ProductLookupRef { id, code, name }` for
each. `ProductsService` validates FK existence (404
`Invalid <field>: <x> not found`) and joins relations in `findAll`/`findOne`.
`ProductsModule` now also registers `Department`/`Group`/`Brand` repositories
via `TypeOrmModule.forFeature`. The `cost`/`COST_FACTOR=1.65` server-calc rule
(see [[products-module]]) was preserved untouched — `cost` is still not part
of any DTO.
