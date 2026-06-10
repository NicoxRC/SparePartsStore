---
name: products-module
description: Conventions and business rules implemented in the products module (cost calc, numeric columns, unique reference index)
metadata:
  type: project
---

The `products` module (`apps/api/src/products/`) was implemented directly
(without an Architect pass) per user instruction, but follows the same
conventions as `users`/`auth` from `docs/Schema.md` and `docs/ApiContract.md`.

Key business rule: `Product.cost` is NEVER accepted from the client. It is
always server-calculated as `salePrice / 1.5`, rounded to 2 decimals, in
`ProductsService` (`create` always computes it; `update` recomputes it only
when `salePrice` changes). `CreateProductDto`/`UpdateProductDto` deliberately
omit a `cost` field entirely.

**Why:** Business rule from the store owner — cost is derived, not entered.
**How to apply:** If other entities later need money/decimal columns, reuse
the `decimalTransformer` pattern in `product.entity.ts` (TypeORM returns
`numeric` columns as strings by default; the transformer converts to/from
JS `number`). Also reuse the partial-unique-index-on-non-deleted-rows pattern
(`products_reference_unique_active`, mirrors `users_email_unique_active`) for
any other "soft-deletable but unique" lookup fields (e.g. future
`categories.name`, `brands.name`).

RBAC for products: create/update allowed for both ADMIN and EMPLOYEE; soft
delete (`DELETE /api/products/:id`) is ADMIN only; list/get require auth but
no specific role. This mirrors Requirements §4 and was confirmed by the user
as correct for this module.

Migration: `1781053132548-CreateProductsTable.ts` (timestamp chosen to sort
right after `1781053132547-CreateUsersTable.ts`). Not yet run against the DB
— user reviews/runs migrations themselves.

See [[workflow-preferences]] for how this implementation was authorized.
