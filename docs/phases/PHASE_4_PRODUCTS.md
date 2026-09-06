# Phase 4 — Products

**Status: Done** (barcode scanning and the sale-type/reverse-cost model were added slightly later, in the same domain — documented here rather than as separate phases).

## Goal

Full product CRUD, mobile-first, with fast data entry.

## What shipped

- `Product` entity: `reference` (unique among active rows, uppercased), `description` (auto-capitalized), `salePrice`, `saleType`, derived `cost`, `stock`, required department/group/brand
- **Reverse cost calculation**: `cost = round(salePrice / COST_FACTORS[saleType])`, `COST_FACTORS = { normal: 1.65, neto: 1.30 }` — recalculated on create/update whenever `salePrice`/`saleType` changes. See `docs/DATABASE.md`.
- `GET /products/check-reference` — live duplicate-check used by the form (debounced 500ms)
- `ProductFormPage`: create/edit form, `SearchableSelect` for department/group/brand (each with inline "create new"), currency-formatted sale price field
- **Barcode scanner**: `BarcodeScannerModal` (`@zxing/browser`), camera-based, writes the decoded value straight into the `reference` field — frontend-only, no dedicated barcode column. See `docs/GLOSSARY.md`.
- `ProductsListPage`: search, expandable filters, role-gated create/edit/delete

## Exit criteria (met)

A product can be created/edited/searched/filtered/soft-deleted from a phone in the field, including scanning a barcode straight into the reference field.

## Related documents

- `docs/DATABASE.md` (`products` table, cost calculation), `docs/GLOSSARY.md` ("Barcode scanning", "Sale type")
