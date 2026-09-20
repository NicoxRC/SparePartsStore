# Phase 5 — Inventory movements

**Status: Done.**

## Goal

Track every stock change with a reason, instead of stock being silently editable.

## What shipped

- `InventoryMovement` entity — append-only (no `updatedAt`/`deletedAt`, no edit/delete endpoint), FK to `Product` (`CASCADE`), signed `quantity`, `notes`
- `movementType` **auto-derived** from the sign of `quantity` (never client-supplied): positive → `purchase`, negative → `adjustment`. `initial` exists only on migration-backfilled historical rows.
- `POST /inventory/movements`: loads the product, computes new stock, rejects with 400 if it would go negative, writes the movement + updates `Product.stock` in one transaction
- `GET /inventory/movements`: paginated history, filterable by product, readable by `admin`/`employee`/`auditor`
- `InventoryPage`: toggle between product list (with a "+ Stock" quick-adjust modal showing a live stock preview and insufficient-stock warning) and movement history feed

## Known simplification carried forward

`MovementResponseDto.newStock` reflects the product's **current** stock at read time, not a point-in-time snapshot right after that specific movement — every historical row for a product shows the same current figure when listed together. Documented in `docs/DATABASE.md`; don't "fix" this without checking whether anything downstream assumes the current behavior.

## Exit criteria (met)

Every stock change is attributable to a user, a reason, and a timestamp; stock can never go negative through this endpoint.

## Related documents

- `docs/DATABASE.md` (`inventory_movements`), `docs/GLOSSARY.md`

## Follow-up (Phase 16)

`InventoryService.createMovement(dto, createdById, manager?)` now accepts an optional `EntityManager` so the purchase-import confirm can apply a whole invoice inside one transaction. The product read moved **inside** the transaction under a `pessimistic_write` row lock, which also closes the read-modify-write race two concurrent movements on the same product had before. Behavior for existing callers (invoices, quotations, notes) is unchanged. See `docs/phases/PHASE_16_PURCHASE_INVOICE_IMPORT.md`.
