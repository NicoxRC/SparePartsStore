---
name: project-purchase-import-design
description: Phase 16 design (supplier UBL XML -> draft -> confirm to stock); key decisions and the one blocker (no real XML sample)
metadata:
  type: project
---

Phase 16 design doc lives at docs/phases/PHASE_16_PURCHASE_INVOICE_IMPORT.md (designed 2026-09-20, branch feature/purchase-invoice-xml-import). Read it before touching the feature.

Decisions worth remembering:
- New tables `suppliers`, `purchase_imports` (state derived from confirmed_at/discarded_at, no deleted_at), `purchase_import_items`; nullable `products.supplier_id` set on create, and on existing products only if NULL.
- Confirm is atomic: `InventoryService.createMovement` and `ProductsService.create` get an optional `EntityManager` param; createMovement's product read moves inside the tx with a lock (fixes a latent lost-update race).
- Parser: `fast-xml-parser` with `parseTagValue:false` (keeps leading zeros) and a hard reject of `<!DOCTYPE`/`<!ENTITY`; handles bare Invoice and AttachedDocument (inner Invoice in CDATA).
- New permissions purchase_imports.view/create/confirm, deliberately NOT backfilled to existing employees.
- DATABASE.md migrations table was missing AddTaxExemptToProducts (drift); the doc assigns it row 26, Phase 16 rows 27-29 (29 = RemoveCostAndSaleTypeFromProducts, added later).

**Changed after this design (2026-09-21, decided by the human) — the phase doc's "Change of scope" / "Rule added later" sections are authoritative:**
- The draft keeps ONLY reference, description, quantity from the XML; the system never suggests a price (no `unit_cost`, cost-vs-supplier-price question is moot). Products lost `cost` and `sale_type` entirely — only `sale_price` remains.
- An Excel template path (`source = 'excel'`) creates the same draft, with the sale price typed by the user; supplier NIT/name live in the sheet header.
- A line matched to an existing product may carry a new sale price (applied on confirm, noted in the movement); the app's description always wins over the file's.
- A sale's price must never change when the product's does: quotation edits keep quoted prices, credit notes use the invoice's price (debit notes still current price — open).
- The client's XML button is switched off until a real XML verifies the parser.

**Why:** the human gave no real XML sample, so every UBL path is "verify" until one arrives. Also open: cost-vs-supplier-price meaning (suggested sale price) and whether suppliers send .zip.

**How to apply:** when implementing or reviewing Phase 16, do not treat the parsing paths as verified; ask for a real sample before sign-off. See [[project-employee-permissions-design]] for the permission pattern reused.
