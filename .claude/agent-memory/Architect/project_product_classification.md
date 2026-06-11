---
name: project-product-classification
description: Product classification model is Department/Group/Brand (not Category/Brand) — table/route names and the product_groups naming decision
metadata:
  type: project
---

As of 2026-06-10, the original `categories`/`brands` lookup-table plan from
`docs/Requirements.md` §5.4-§5.5 is **dead — do not resurrect it**. Product
classification is three required FK lookups on `Product`, all NOT NULL:

- **Department** (Departamento) — table `departments`, route `/departments`
- **Group** (Grupo) — TS entity class `Group`, but table is **`product_groups`**
  (NOT `groups`) and route is `/groups`. Reason: `group`/`groups` collides
  with the SQL reserved word `GROUP BY` and invites raw-SQL/migration
  footguns even when quoted. Domain-prefixed `product_groups` avoids this
  while the TS class stays singular `Group` per naming convention.
- **Brand** (Marca) — table `brands`, route `/brands`. **Replaces línea
  entirely** — `Product.line` (varchar) is removed with no replacement
  concept; `brandId`/`brand` takes its place as the third axis.

All three are structurally identical: `id` (uuid), `code` (varchar, partial
unique index where `deleted_at IS NULL`), `name`, full audit columns
(createdAt/updatedAt/createdBy/updatedBy), soft delete. CRUD is admin-only
for mutations, GET open to any authenticated user (employees need these for
product form dropdowns). See `docs/Schema.md` §3-§9 and
`docs/ApiContract.md` §6-§7 for full schema/contract, including the
two-migration plan (create lookup tables, then backfill + alter `products`
to drop `department`/`group`/`line` varchars and add
`department_id`/`group_id`/`brand_id` NOT NULL FKs).

Open issue (not resolved): whether deactivating a lookup row still
referenced by active products should be blocked (409) or allowed silently —
flagged in Schema.md §8 / ApiContract.md §6.6 for product-owner decision,
default v1 behavior is "allow silently".

Also flagged: `CreateProductDto` was missing `cost` validation even before
this change (pre-existing gap, `products.cost` is NOT NULL) — Backend agent
should add it while touching these DTOs.

See also [[project_auth_design]] for the shared entity/pagination/RBAC
conventions these new lookup modules reuse.
