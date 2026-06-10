---
name: common-utils
description: Shared helpers in common/utils/ for unique-violation translation and ILIKE search escaping — reuse for categories/brands and any future search/uniqueness logic
metadata:
  type: project
---

Two shared helpers exist in `apps/api/src/common/utils/`:

- `database-error.util.ts` exports `isUniqueViolation(error: unknown): boolean`
  — detects a TypeORM `QueryFailedError` wrapping a Postgres `23505` unique
  violation. Used as a TOCTOU safety net: wrap `repository.save(...)` in
  create/update in a try/catch, and if `isUniqueViolation(error)` throw the
  module's existing `ConflictException` (e.g. `'Reference already in use'`,
  `'Email already in use'`). Keep the existing pre-check (`findByX`) for
  nicer error messages in the common case — this catch is just the race
  safety net.

- `escape-like.util.ts` exports `escapeLike(value: string): string` — escapes
  `\`, `%`, `_` in a search term before interpolating into an `ILIKE`
  pattern. Always pair with `ESCAPE '\\'` in the query string, e.g.:
  `"(col ILIKE :search ESCAPE '\\')"` with `{ search: \`%${escapeLike(search)}%\` }`.

**Why:** Found in code review of `products`/`users` modules — TOCTOU race on
`reference`/`email` uniqueness checks caused unhandled 500s instead of 409,
and unescaped `search` params caused false-positive ILIKE matches (literal
`_` in part references) and `search=%` returning the whole table.

**How to apply:** When implementing `categories`/`brands` (or any future
module with a partial-unique-index-on-non-deleted-rows + searchable text
field, see [[products-module]]), use both helpers from the start rather than
duplicating the pre-check-only or raw-interpolation pattern.
