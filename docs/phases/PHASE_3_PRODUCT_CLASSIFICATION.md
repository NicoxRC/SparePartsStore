# Phase 3 — Product classification (Departamento / Grupo / Marca)

**Status: Done.**

## Goal

Replace ad hoc free-text product classification with three required, admin-managed lookup catalogs.

## What shipped

- `departments`, `product_groups` (entity `Group`), `brands` tables — identical shape, each with a legacy-style numeric `code` and a `name`
- Migration backfilled these from the `products` table's original plain-varchar `department`/`group`/`line` columns, then dropped those columns — see `docs/DATABASE.md`'s `AddProductLookupForeignKeys`
- "Línea" renamed to **Marca (brand)** in the same pass — there is no separate línea concept
- `code` generation made server-side (next free integer), removed from create/update DTOs entirely
- Admin-only create/update/soft-delete; any authenticated role can list (to populate product forms)
- `CatalogsPage`, generic `LookupListPage`/`LookupFormPage` on the frontend, reused across all three resources

## Exit criteria (met)

Every product references exactly one department, group, and brand; admins manage all three from one `Catálogos` screen.

## Related documents

- `docs/DATABASE.md` (lookup tables), `docs/GLOSSARY.md`
