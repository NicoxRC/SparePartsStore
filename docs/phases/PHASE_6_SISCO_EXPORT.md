# Phase 6 — Sisco Excel export

**Status: Done — and now scheduled for retirement, see `docs/phases/PHASE_14_RETIRE_SISCO.md`.**

## Goal (historical)

Before Dataico, this system's only path to invoicing software was exporting the full catalog as an `.xlsx` file matching a legacy invoicing tool's ("Sisco"/SICAF) import format.

## What shipped

- `GET /export/articulos` (ADMIN-only) — streams `articulos.xlsx`, sheet `ARTICULOS`, 32 columns matching the legacy import layout. Only reference/description/cost/price/department/group/brand are populated from real data; the rest (barcode, línea, talla, IVA, etc.) are emitted blank to match the legacy shape.
- Uses the same `.withDeleted()` lookup-resolution pattern as `ProductsService` so a soft-deleted department/group/brand doesn't break the export.
- `ProductsListPage`'s admin-only "Exportar" button, `useExportArticulos` hook.

## Why this is being retired, not extended

Dataico's API is a **direct** integration — invoices are sent and validated with DIAN in real time, which is what actual electronic invoicing requires. An Excel re-import into a separate tool was always a workaround, not real invoicing. See `docs/GLOSSARY.md`'s "Sisco" note and `docs/PROJECT_ROADMAP.md`'s Phase 14.

## Related documents

- `docs/DATABASE.md`, `docs/PROJECT_ROADMAP.md` (Phase 14)
