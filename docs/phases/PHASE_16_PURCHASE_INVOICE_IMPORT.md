# Phase 16 — Purchase invoice import (supplier XML to stock) (Backend + Client)

**Status: Backend done (API, migrations, tests); client built; parsing still unverified against a real supplier file — see Open question 1.** Local feature, **not a Dataico integration** (zero HTTP calls to Dataico). Branch: `feature/purchase-invoice-xml-import`.

## Goal

Bulk-load stock from the XML of an electronic invoice a **supplier** issued to this store (DIAN UBL 2.1). Someone uploads the XML; it becomes a **draft** of lines (reference, description, quantity). **Nothing touches stock or the catalog until a human reviews and confirms the whole draft.** Lines whose reference already exists in the catalog are reviewed and, on confirm, increase stock; lines that don't exist are completed by the reviewer (department, group, brand, sale price...) and the product is created **at confirm time**. Products are permanently linked to their supplier so the catalog can be filtered by supplier.

Relationship to other phases: independent of Phases 7-15. It does **not** reopen Phase 11 ("Eventos de recepción" — acknowledging/accepting supplier invoices toward DIAN stays out of scope); this phase only reads a supplier's invoice locally to receive stock. No DIAN event is ever sent.

## Change of scope after the first implementation (decided by the human)

**The draft keeps only reference, description and quantity from the XML; everything else is completed by the user, and the system never suggests a price.** Consequently: the XML's unit cost (`unit_cost`, "Costo en factura", the pre-IVA price question) is **gone** — the draft stores no price at all — and the whole product model dropped its derived `cost` and its `sale_type`, leaving only `sale_price` (see `RemoveCostAndSaleTypeFromProducts`, `docs/DATABASE.md`). Wherever this document below still mentions `unit_cost`, `saleType`/`new_sale_type`, D1 or Open question 2, that part is **superseded** by this paragraph.

## Decisions already made by the human (not re-litigated)

1. A new product is created only at confirm, never at upload.
2. A `suppliers` table exists, find-or-created from the XML's supplier NIT + name; `products.supplier_id` (nullable) links a product to it permanently.
3. Matching = exact match on `products.reference` (uppercased, trimmed) + manual relink by the reviewer. No remembered supplier-code mapping.
4. The whole draft is the unit of confirmation; stock changes go through `InventoryService.createMovement` (append-only, positive => `purchase`) with notes referencing the import.

## Defaults chosen by the architect (flip any of these if wrong)

| # | Default | Why |
|---|---|---|
| D1 | ~~The unit cost in the XML is display-only.~~ **Superseded:** the draft stores no XML price at all; the reviewer types every sale price. | See "Change of scope" above. |
| D2 | `products.supplier_id` is set **on creation**, and on an existing product **only if it is currently NULL** ("fill the blank"), never overwritten. A product restocked from a different supplier keeps its original supplier. | Overwriting would make the supplier filter unstable; filling blanks tags the legacy catalog for free. Wrong tags are fixable on the product form (D3). |
| D3 | `supplierId` is an optional field on the product create/update DTOs and a select on the product form; `null` on update clears it. | Only way to correct a wrong supplier tag; costs one select. |
| D4 | Confirm is **fully atomic** (one DB transaction: created products + movements + status flip). Achieved by letting `InventoryService.createMovement` and `ProductsService.create` accept an optional `EntityManager`. The `QuotationsService` "accept partial failure" trade-off is **not** used here. | A partially applied 80-line import is very hard to reconcile by hand; a quotation touches a few lines. |
| D5 | A "new" line whose reference appeared in the catalog between upload and confirm is **re-resolved at confirm time**: treated as an existing product (stock added, the typed price is discarded), and reported back in the response (`relinked`). | The physical parts did arrive; only the sale-price data becomes moot. Failing instead would force a reload for no benefit. |
| D6 | Two **new** lines with the same reference in one draft block confirm (issue `DUPLICATE_NEW_REFERENCE`); the reviewer deletes one and raises the other's quantity. | Auto-merging would silently drop line fidelity; explicit is simpler. |
| D7 | Non-integer XML quantities (e.g. `1.5`) do **not** fail the upload: the line keeps `xml_quantity` (read-only) and `quantity = NULL`, so the reviewer must type an integer. | `products.stock` is INT; the draft is exactly the place for human correction. |
| D8 | The raw XML is **not stored**. Only the parsed header (invoice number, issue date, CUFE, supplier) + lines + original file name. | An `AttachedDocument` can embed a base64 PDF (megabytes); nothing downstream consumes the raw file; the CUFE identifies it at DIAN if it's ever needed. Re-upload after discard is possible. |
| D9 | New permissions **without backfill**: employees get none by default; admin grants them. | Migration 25 backfilled the whole catalog to preserve pre-existing behavior; this feature has none to preserve, and confirm creates products and moves stock in bulk. |

## Data model

Conventions per `DATABASE.md`: UUID PKs, snake_case (via `SnakeNamingStrategy`), `created_by_id` FKs `SET NULL`, partial unique indexes, hand-written migrations.

### `suppliers`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `nit` | VARCHAR(20) NOT NULL | Digits only (dots/dashes/spaces stripped), **without** check digit. |
| `dv` | VARCHAR(2), nullable | Check digit, from the XML `schemeID` attribute. Informational. |
| `name` | VARCHAR(255) NOT NULL | Taken from the XML **only on creation**; an existing supplier's name is never overwritten by later uploads (an admin may have renamed it). Uppercased + trimmed, same as the lookup tables. |
| `created_by_id`, `updated_by_id` | UUID, nullable, FK -> `users.id`, `SET NULL` | |
| `created_at`, `updated_at`, `deleted_at` | TIMESTAMPTZ | Extends `BaseEntity`. No delete endpoint exists, so `deleted_at` is only a DBA escape hatch; kept for convention/partial-index consistency. |

Index: `UQ_suppliers_nit_active` — UNIQUE (`nit`) WHERE `deleted_at IS NULL`.

### `products` — one new column

`supplier_id` UUID, nullable, FK -> `suppliers.id`, **`RESTRICT`**; plain index `IDX_products_supplier_id`. No `NOT NULL` (legacy and hand-created products have no supplier). No many-to-many "product_suppliers" table (left out).

### `purchase_imports` (the draft header)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `supplier_id` | UUID NOT NULL, FK -> `suppliers.id`, `RESTRICT` | |
| `invoice_number` | VARCHAR(50) NOT NULL | The UBL `cbc:ID` as-is (it already includes the prefix, e.g. `SETP990000001`), trimmed + uppercased. |
| `issue_date` | DATE NOT NULL | UBL `cbc:IssueDate`. |
| `cufe` | VARCHAR(128), nullable | UBL `cbc:UUID`, trimmed + lowercased (a SHA-384 hex is 96 chars). Nullable only because a malformed/legacy XML may omit it. |
| `source_filename` | VARCHAR(255) NOT NULL | Display only. |
| `confirmed_at`, `discarded_at` | TIMESTAMPTZ, nullable | **State is derived, no status column** (same precedent as `quotations.invoiced_at`/`cancelled_at`, `cash_registers.closed_at`): both NULL = draft; `confirmed_at` set = confirmed; `discarded_at` set = discarded. |
| `confirmed_by_id`, `discarded_by_id`, `created_by_id` | UUID, nullable, FK -> `users.id`, `SET NULL` | |
| `created_at`, `updated_at` | TIMESTAMPTZ | **No `deleted_at`** — "discarded" is the removal state; an extra soft-delete would be a second way to say the same thing. Documented exception to the `BaseEntity` convention. |

Constraints / indexes:
- `CHK_purchase_imports_single_outcome`: `confirmed_at IS NULL OR discarded_at IS NULL`.
- **Duplicate protection (two layers, both partial so a discarded import frees the invoice for re-upload):**
  - `UQ_purchase_imports_supplier_invoice_active` — UNIQUE (`supplier_id`, `invoice_number`) WHERE `discarded_at IS NULL`.
  - `UQ_purchase_imports_cufe_active` — UNIQUE (`cufe`) WHERE `cufe IS NOT NULL AND discarded_at IS NULL`. Catches the same document arriving bare vs. wrapped in an `AttachedDocument`, or with a NIT typed differently.
- `IDX_purchase_imports_created_at` (`created_at DESC`), `IDX_purchase_imports_supplier_id`.

**What the reviewer sees on a duplicate:** the app-level pre-check (by supplier+number, then by CUFE) returns `409` with the extra fields `code: 'PURCHASE_IMPORT_DUPLICATE'`, `existingImportId`, `existingStatus` (`draft`|`confirmed`); the client shows "Esta factura ya fue cargada" with a link to that import. The DB unique-violation is caught as the race safety net (`isUniqueViolation()`), returning the same 409 (re-querying for `existingImportId`). `HttpExceptionFilter` passes extra body fields through unchanged.

### `purchase_import_items` (draft lines)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `purchase_import_id` | UUID NOT NULL, FK -> `purchase_imports.id`, `CASCADE` | |
| `line_number` | INT NOT NULL | 1-based position in the document (not the XML's own line id). UNIQUE with `purchase_import_id`. |
| `reference` | VARCHAR(100), nullable | Uppercased + trimmed. NULL when the XML has no usable code (or >100 chars) — the reviewer fills it or links an existing product. Editable. |
| `description` | VARCHAR(255), nullable | Truncated to 255 on parse. Editable. Used as the new product's description. |
| `xml_quantity` | NUMERIC(14,4) NOT NULL | Exactly what the XML said; never edited. |
| `quantity` | INT, nullable | Editable. Initialised to `xml_quantity` when it is an integer > 0, else NULL (D7). |
| `product_id` | UUID, nullable, FK -> `products.id`, `RESTRICT` | Set by auto-match, manual link, or (after confirm) the created product. |
| `match_type` | VARCHAR(10), nullable, CHECK IN (`'exact'`,`'manual'`) | NULL = "new". CHECK: `match_type IS NULL OR product_id IS NOT NULL`. |
| `new_department_id`, `new_group_id`, `new_brand_id` | UUID, nullable, FK -> lookups, `RESTRICT` | Reviewer-supplied; only meaningful while `product_id` is NULL. |
| `new_sale_price` | NUMERIC(12,2), nullable | Must be an integer >= 500 at confirm (same rule as `CreateProductDto`). |
| `new_tax_exempt` | BOOLEAN NOT NULL DEFAULT false | |
| `created_product` | BOOLEAN NOT NULL DEFAULT false | Set at confirm when this line created its product (drives the "Creado" chip on a confirmed import). |
| `created_at`, `updated_at` | TIMESTAMPTZ | No soft delete: the line is working data; the audit trail is the inventory movement. |

Indexes: `IDX_purchase_import_items_import` (`purchase_import_id`), `IDX_purchase_import_items_product` (`product_id`).

**Line status chip (derived, not stored):** `match_type = 'exact'` -> **Existe**; `'manual'` -> **Enlazado**; `NULL` -> **Nuevo**.

## Lifecycle and confirm algorithm

```
        upload (valid XML)                confirm (all lines valid)
  (none) ------------------> DRAFT ------------------------------> CONFIRMED  (terminal, immutable)
                               |
                               | discard
                               v
                           DISCARDED  (terminal; frees the invoice for re-upload)
```

Only a draft can be edited, have lines deleted, or be confirmed/discarded; anything else is `409`.

### Upload (`PurchaseImportsService.upload`)

1. Controller: multipart validated (size, extension/mime, non-empty). `PurchaseInvoiceXmlParser.parse(buffer)` -> typed result or a `422` with a `code` (see parsing spec).
2. Duplicate pre-check on CUFE, then (after supplier resolution) on supplier+invoice number -> `409` (above). Do the CUFE check first so nothing is created for a known duplicate.
3. `SuppliersService.findOrCreateByNit(nit, dv, name, userId)`: find by NIT; else create; on unique violation re-read.
4. Batch auto-match: one query `WHERE reference = ANY(:refs) AND deleted_at IS NULL` over the distinct non-null references; matched lines get `product_id` + `match_type = 'exact'`.
5. Insert header + all items in one `EntityManager.transaction` (header unique-violation -> 409). Cap: **max 500 lines** per import (`422 TOO_MANY_LINES`) to keep confirm's transaction short.
6. Respond `201` with the detail DTO.

### Line editing (drafts only)

- `reference` changed on a line **without** a manual link -> re-run the exact match (found: link `exact`; not found: unlink).
- `productId: <uuid>` -> manual link (`match_type = 'manual'`); the product must exist and not be soft-deleted (`404` otherwise). The reference/new_* fields are kept but ignored.
- `productId: null` -> "remove manual link": clears the link **and re-runs the exact match**, i.e. returns the line to what the system would do by itself (so it can bounce back to "Existe").
- `quantity`: integer >= 1. `salePrice`: integer >= 500 or `null`. Lookup ids are validated to exist.
- Reference/description are normalized with the **same functions** the product DTOs use (see backend plan, `product-normalize.util.ts`), because a service-level call bypasses DTO `@Transform`.

### Validation (`validateDraft()` — one pure function shared by the detail DTO and confirm)

Per line, an `issues[]` array; the detail DTO exposes it plus `readyToConfirm = items.length > 0 && every item has no issues`:

| Issue code | Applies to | Condition |
|---|---|---|
| `MISSING_QUANTITY` | all lines | `quantity` is NULL or < 1 |
| `MISSING_REFERENCE` | unlinked lines | `reference` NULL/empty |
| `MISSING_DESCRIPTION` | unlinked lines | `description` NULL/empty |
| `MISSING_CLASSIFICATION` | unlinked lines | any of department/group/brand NULL |
| `INVALID_SALE_PRICE` | unlinked lines | `new_sale_price` NULL, non-integer or < 500 |
| `DUPLICATE_NEW_REFERENCE` | unlinked lines | another unlinked line has the same reference (both flagged) |
| `LINKED_PRODUCT_DELETED` | linked lines | the linked product is soft-deleted since linking |

Import-level: `NO_LINES` (zero items).

### Confirm (`PurchaseImportsService.confirm(id, userId)`) — one transaction

```
em.transaction(async (em) => {
  1. Lock the header row: findOne(PurchaseImport, id, lock pessimistic_write).
     404 if missing; 409 (code PURCHASE_IMPORT_NOT_DRAFT) if confirmed_at/discarded_at set.
     -> a mobile double-tap or two reviewers cannot double-apply.
  2. Load items ORDER BY line_number (inside the tx) + supplier.
  3. Re-resolve: for linked lines load the products (active only); for unlinked
     lines with a reference, one batched lookup by reference among active products.
     An unlinked line whose reference now exists -> treat as existing, remember
     it for the `relinked` list (D5).
  4. validateDraft() on the re-resolved state. Any issue -> throw
     BadRequestException({ code: 'PURCHASE_IMPORT_INVALID', message, problems:
     [{ itemId, lineNumber, issue }] })  // nothing has been written yet
  5. For each line in line_number order:
       - existing product P:  productId = P.id
       - new line:  P = productsService.create({ reference, description, salePrice,
                    stock: 0, departmentId, groupId, brandId, taxExempt,
                    supplierId }, userId, em)
                    (stock 0: the movement below is what adds the units, so every unit
                    of stock has a movement in the audit trail)
                    unique violation on reference -> ConflictException
                    (code PRODUCT_REFERENCE_TAKEN, names the reference) -> rollback
       - inventoryService.createMovement({ productId, quantity,
           notes: `Compra proveedor ${supplier.name} — factura ${invoiceNumber} (importación XML)` },
           userId, em)
       - existing P with supplier_id NULL -> UPDATE products SET supplier_id = :s
           WHERE id = :p AND supplier_id IS NULL   (D2)
       - update the item: product_id = P.id, created_product = (line was new)
  6. UPDATE purchase_imports SET confirmed_at = now(), confirmed_by_id = :user.
})
```

Any failure rolls back everything (products, movements, supplier tags, status). Cost: ~6 queries per line; at the 500-line cap that is a few seconds at worst, acceptable for a rare bulk operation.

Response: counts (`createdProducts`, `restockedProducts`, `unitsAdded`, `suppliersAssigned`) and `relinked[]`.

## Transaction handling — recommendation

**Extend the two existing services with an optional `EntityManager`** (D4):

- `InventoryService.createMovement(dto, createdById, manager?: EntityManager)`. Extract the body into a private `applyMovement(manager, dto, createdById)`: read the product **inside the transaction with `pessimistic_write`** (`withDeleted()` preserved), reject if `stock + quantity < 0`, insert the movement, update stock. With no `manager`, wrap `applyMovement` in `movementsRepository.manager.transaction(...)` exactly like today; with a `manager`, run inside the caller's transaction (no nested transaction).
  - Side effect worth knowing: today the product is read **outside** the transaction, so two concurrent movements on the same product can lose an update (read-modify-write race). Moving the read inside with a row lock fixes that for every caller (invoices, quotations, notes) at no extra complexity. Existing callers keep their signature.
- `ProductsService.create(dto, createdById, manager?)`: with a manager, use `manager.getRepository(Product)` (and the lookup repositories) for the reference pre-check, lookup existence checks and the save; `supplierId` validated via `SuppliersService`.

Rejected alternative: leave `createMovement` opening its own transaction and accept partial failure like `QuotationsService` — rejected in D4.

## XML parsing spec

> **No real sample XML has been provided yet.** Every UBL path below is written from the public DIAN UBL 2.1 conventions and is marked **(verify)** = "to verify against a real supplier file before this phase is considered done" (`DEFINITION_OF_DONE`: manual test with a real file). This is a public DIAN/UBL standard, not a Dataico API, so the "never guess Dataico shapes" rule does not apply — but nothing here should be trusted without a real file. Development can start on hand-made fixtures.

### Library — `fast-xml-parser` (new dependency; nothing XML-related is installed today)

Why: pure JS, zero native deps, no DOM, tiny, works in Jest, maintained. `removeNSPrefix` gives namespace-prefix-agnostic reads (`cbc:ID`/`ID`/default namespace all look the same), `isArray` normalizes single-vs-many, CDATA is returned as text. Alternatives rejected: `xml2js` (older, callback-era, past prototype-pollution advisories), `@xmldom/xmldom` + `xpath` (heavier; more code for the same reads), `sax` (streaming, too low level). Pin to a current 5.x release and check for open advisories at install time.

Required config: `{ removeNSPrefix: true, ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: true, parseTagValue: false, parseAttributeValue: false, isArray: (name) => name === 'InvoiceLine' }`.
**`parseTagValue: false` is load-bearing** — with the default, a reference like `00123` becomes the number `123` and a NIT loses leading zeros. Every value stays a string until we convert it deliberately.

Also new dev dependency: `@types/multer` (for `Express.Multer.File`; `multer` itself already arrives via `@nestjs/platform-express`).

### Safety on untrusted uploads

- Size cap 5 MB at the multer layer (`limits.fileSize`; overflow -> 413).
- **Reject any content containing `<!DOCTYPE` or `<!ENTITY` (case-insensitive) before parsing** -> `422 FORBIDDEN_DOCTYPE`. DIAN UBL never carries a DTD, so this kills XXE and billion-laughs/entity-expansion at the door without depending on parser settings. Applied to the outer document **and** to the unwrapped inner string of an `AttachedDocument`. The parser never fetches external resources anyway.
- Decode as UTF-8, strip a BOM. DIAN mandates UTF-8; other declared encodings are not handled (`INVALID_XML` if it garbles).
- Value reads go through small helpers (`get`, `text`, `toArray`) that only touch the paths below — no dynamic property walking from file content; ignore `__proto__`/`constructor` keys.
- Line cap 500 (see upload).

### Document detection (after parse; root = first non-`?xml` key)

| Root | Behaviour |
|---|---|
| `Invoice` | Parse directly. |
| `AttachedDocument` | Read `AttachedDocument/Attachment/ExternalReference/Description` (**verify**): it holds the real, signed `Invoice` XML as CDATA or entity-escaped text. Normalize with `toArray`, take the first value that is a string containing `<`, run the DOCTYPE check on it, parse it again with the same config, expect root `Invoice`. One level only. No usable inner invoice -> `422 ATTACHED_DOCUMENT_WITHOUT_INVOICE`. |
| `CreditNote` / `DebitNote` | `422 UNSUPPORTED_DOCUMENT` — "Es una nota crédito/débito, no una factura de venta". |
| anything else (`ApplicationResponse`, HTML, ...) | `422 UNSUPPORTED_DOCUMENT` / `INVALID_XML` when nothing parses. |

`cbc:InvoiceTypeCode` is not checked (`01` sales invoice is the norm; exports/contingency also import fine). Documento soporte (`05`) would parse too; harmless.

### Fields read from `Invoice` (paths shown with the standard `cac:`/`cbc:` prefixes; all **verify**)

| Field | Path | Need | Notes |
|---|---|---|---|
| invoice number | `cbc:ID` | **must** | -> `422 MISSING_INVOICE_NUMBER` |
| issue date | `cbc:IssueDate` | **must** | `YYYY-MM-DD`; invalid -> `422 MISSING_ISSUE_DATE` |
| CUFE | `cbc:UUID` | optional | Element has attributes (`schemeName="CUFE-SHA384"`), so `text()` must accept `string \| { '#text' }`. Missing -> duplicate protection falls back to supplier+number only. |
| supplier NIT | `cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID`, fallback `.../cac:PartyLegalEntity/cbc:CompanyID` | **must** | Strip everything but digits. DV = that element's `schemeID` attribute. Missing -> `422 MISSING_SUPPLIER`. |
| supplier name | `.../cac:PartyTaxScheme/cbc:RegistrationName` -> `.../cac:PartyLegalEntity/cbc:RegistrationName` -> `.../cac:PartyName/cbc:Name` -> `.../cac:Person/cbc:FirstName + FamilyName` | **must** (any of the chain) | First non-empty wins (natural-person suppliers have no `RegistrationName`). |
| lines | `cac:InvoiceLine` (1..n, normalized to array) | **must** (>= 1) | 0 lines -> `422 NO_LINES`. |
| quantity | `cbc:InvoicedQuantity` | **must per line** | Decimal string. Integer > 0 -> `quantity`. Otherwise `quantity = NULL`, `xml_quantity` kept (D7). Unit code ignored. |
| description | `cac:Item/cbc:Description` (first if repeated) -> `cac:Item/cbc:Name` | optional | Truncated to 255. |
| reference | `cac:Item/cac:SellersItemIdentification/cbc:ID` -> `cac:Item/cac:StandardItemIdentification/cbc:ID` | optional | Trim + uppercase; >100 chars -> NULL. The Standard id may be a GTIN or a taxpayer-scheme code; it is only a fallback, no separate column. |

Everything else (taxes, totals, allowances, payment means, addresses, currency) is deliberately ignored.

### Tolerance rules

- Namespace-prefix agnostic (`removeNSPrefix`); a default-namespace document works identically.
- Single-vs-array: `InvoiceLine` forced to array via `isArray`; every other repeated element goes through `toArray()` at read time.
- Element-with-attributes vs plain-text handled by `text()`.
- Missing optional pieces never fail the upload; they surface as line `issues` in the draft, which is where a human fixes them.
- Errors are `UnprocessableEntityException({ message, code })`; `message` is Spanish-facing for the reviewer, `code` is stable for the client.

Parser output type: `{ invoiceNumber, issueDate, cufe | null, supplier: { nit, dv | null, name }, lines: [{ lineNumber, reference | null, description | null, xmlQuantity, quantity | null }] }`.

## API contract

Prefix `/api`, everything JWT-protected by default. Swagger per `DEFINITION_OF_DONE` (`@ApiTags`, `@ApiOperation`, `@ApiResponse` success + main error, `@ApiProperty` on DTOs, `@ApiConsumes('multipart/form-data')` + `@ApiBody` on upload). Lists return `PaginatedResponseDto<T>`. Mutations return the full **detail** DTO (same convention as quotations; a 500-line detail is ~100 KB worst case, fine).

### Permissions

New codes in `common/constants/permission.constant.ts`, all `@Roles(ADMIN, EMPLOYEE)` at the controller (auditor excluded, like quotations):

| Code | Grants |
|---|---|
| `purchase_imports.view` | list/detail |
| `purchase_imports.create` | upload, edit/delete lines, apply classification, discard |
| `purchase_imports.confirm` | confirm |

`IMPLIES`: `create` -> `view`, `products.view`, `catalogs.view` (the line form needs product search and the classification dropdowns); `confirm` -> `view`, `products.view`, `catalogs.view`. `confirm` deliberately does **not** imply `create` (a trusted employee may approve what another prepared). This fits the catalog rule "only actions a coarse `employee` could already do" — creating products and adding stock were already employee actions; nothing admin-only becomes assignable. Admin bypasses everything. Note `PermissionsGuard` uses **AND** for multiple codes on a route; each route below carries exactly one. Mirror the three codes in `apps/client/src/lib/permissions.ts` (`PERMISSION_SCOPES`) — `PermissionsEditor` then renders them with no further change.

### Suppliers — `SuppliersController`

| Method + path | Auth | Description |
|---|---|---|
| `GET /suppliers?search&page&limit` | any authenticated role, no `@RequirePermission` | Name/NIT search (`escapeLike()`), name ASC, `limit` <= 100. Same `{ data, meta }` shape as the lookup catalogs so `SearchableSelect` works unchanged. Not sensitive; needed by the products filter (auditors included). |
| `PATCH /suppliers/:id` | `@Roles(ADMIN)` | Body `{ name }` only (uppercased/trimmed). **NIT is identity and not editable.** |

No create (import creates), no delete (a supplier referenced by products can't go; nobody has asked). Response: `{ id, nit, dv, name, createdAt, updatedAt }`.

### Purchase imports — `PurchaseImportsController` (`/purchase-imports`)

| Method + path | Perm | Body / query | Success | Errors |
|---|---|---|---|---|
| `POST /purchase-imports` | `create` | multipart, field `file` | `201` detail | 400 no file / wrong type; 409 duplicate; 413 too big; 422 parse errors (`code`) |
| `GET /purchase-imports` | `view` | `status` (`draft`\|`confirmed`\|`discarded`), `supplierId`, `search` (invoice number / supplier name), `page`, `limit` | `200` paginated summaries | |
| `GET /purchase-imports/:id` | `view` | | `200` detail | 404 |
| `PATCH /purchase-imports/:id/items/:itemId` | `create` | partial line (below) | `200` detail | 400 validation; 404 item/product/lookup; 409 not a draft |
| `DELETE /purchase-imports/:id/items/:itemId` | `create` | | `200` detail | 404; 409 not a draft |
| `POST /purchase-imports/:id/apply-classification` | `create` | `{ departmentId?, groupId?, brandId? }` | `200` detail | 400 empty body; 404 lookup; 409 not a draft |
| `POST /purchase-imports/:id/confirm` | `confirm` | none | `200` confirm result | 400 `PURCHASE_IMPORT_INVALID` + `problems[]`; 404; 409 `PURCHASE_IMPORT_NOT_DRAFT` / `PRODUCT_REFERENCE_TAKEN` |
| `POST /purchase-imports/:id/discard` | `create` | none | `200` detail | 404; 409 not a draft |

No hard `DELETE /purchase-imports/:id` (discard is the removal state; rows are kept as history).

`apply-classification` is the one convenience beyond the bare minimum: an invoice from a single brand's distributor can easily have 60 new lines, and picking three selects per line on a phone is not workable. It sets each supplied field on every **new** line that has that field NULL (never overwrites what the reviewer already set). Sale price cannot be bulk-defaulted (each differs).

### Shapes

```ts
type PurchaseImportStatus = 'draft' | 'confirmed' | 'discarded';
type LineStatus = 'existing' | 'manual' | 'new';
type LineIssue =
  | 'MISSING_QUANTITY' | 'MISSING_REFERENCE' | 'MISSING_DESCRIPTION'
  | 'MISSING_CLASSIFICATION' | 'INVALID_SALE_PRICE'
  | 'DUPLICATE_NEW_REFERENCE' | 'LINKED_PRODUCT_DELETED';

interface PurchaseImportSummary {
  id: string;
  supplier: { id: string; name: string; nit: string };
  invoiceNumber: string;
  issueDate: string;            // YYYY-MM-DD
  status: PurchaseImportStatus; // derived server-side
  lineCount: number;
  sourceFilename: string;
  createdAt: string;
  createdByName: string | null;
  confirmedAt: string | null;
}

interface PurchaseImportDetail extends PurchaseImportSummary {
  cufe: string | null;
  readyToConfirm: boolean;
  items: PurchaseImportItem[];  // ORDER BY lineNumber
}

interface PurchaseImportItem {
  id: string;
  lineNumber: number;
  reference: string | null;
  description: string | null;
  xmlQuantity: number;          // read-only original
  quantity: number | null;
  status: LineStatus;
  product: { id: string; reference: string; description: string; stock: number } | null;
  newProduct: {                 // meaningful while product === null
    departmentId: string | null; groupId: string | null; brandId: string | null;
    salePrice: number | null; taxExempt: boolean;
  };
  createdProduct: boolean;      // true on confirmed imports for lines that created their product
  issues: LineIssue[];          // always [] on confirmed/discarded imports
}

// PATCH body — every field optional; unknown fields rejected (forbidNonWhitelisted)
interface UpdatePurchaseImportItemDto {
  reference?: string; description?: string; quantity?: number;
  productId?: string | null;    // uuid = manual link; null = remove manual link + re-match
  departmentId?: string | null; groupId?: string | null; brandId?: string | null;
  salePrice?: number | null; taxExempt?: boolean;
}

interface ConfirmPurchaseImportResponse {
  id: string; status: 'confirmed'; confirmedAt: string;
  createdProducts: number; restockedProducts: number; unitsAdded: number;
  suppliersAssigned: number;
  relinked: Array<{ lineNumber: number; reference: string }>;   // D5
}

// 400 PURCHASE_IMPORT_INVALID body (extra fields pass through the exception filter)
{ statusCode: 400, code: 'PURCHASE_IMPORT_INVALID', message: '...',
  problems: Array<{ itemId: string | null; lineNumber: number | null; issue: LineIssue | 'NO_LINES' }> }
```

### Products changes (API)

`ProductResponseDto` gains `supplier: { id, name } | null`; `QueryProductsDto` gains `supplierId?: string` (UUID); `findAll`/`findOne` join the supplier with `.withDeleted()` like the other lookups; `Create`/`UpdateProductDto` gain optional `supplierId` (D3).

### File upload mechanics

`@UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))` (memory storage — parsed once, never written to disk, nothing to clean up on Railway's ephemeral FS). `@UploadedFile() file: Express.Multer.File`. Accept when the name ends in `.xml` (case-insensitive) **or** the mime is `text/xml`/`application/xml` — mobile browsers often send `application/octet-stream` for `.xml`, so mime alone would reject valid files; the mime/extension check is only a fast reject, the real gate is "did it parse as an `Invoice`". The global `ValidationPipe` (`forbidNonWhitelisted`) is unaffected (no body fields). No new env vars; limits are code constants.

## Client (`apps/client`)

Routes (Spanish, like `/ventas`, `/cotizaciones`): `/compras` (list + upload) and `/compras/:id` (review). Both inside `EmployeeRoute` + `PermissionRoute permission="purchase_imports.view"`. Nav entry "Compras" (`!isAuditor && has('purchase_imports.view')`); reuse an existing icon or add one `IconInbox`/`IconUpload` to `icons.tsx`. Page buttons gate on `has('purchase_imports.create')` / `has('purchase_imports.confirm')`; the server's `readyToConfirm` is the source of truth for enabling Confirmar.

### Files (per `ARCHITECTURE.md`)

```
apps/client/src/
├── pages/
│   ├── PurchaseImportsListPage.tsx        # upload button, filter chips, drafts grouped by supplier
│   └── PurchaseImportDetailPage.tsx       # review screen (composes the components below; stays < ~200 lines)
├── components/purchase-imports/
│   ├── UploadPurchaseImportButton.tsx     # hidden <input type="file" accept=".xml,text/xml,application/xml">, client-side size/extension check, duplicate-409 alert with link
│   ├── PurchaseImportLineCard.tsx         # one mobile card per line: chip, inline edit, issues
│   ├── LineStatusChip.tsx                 # Existe / Enlazado / Nuevo
│   ├── NewProductFields.tsx               # department/group/brand selects, price, taxExempt
│   ├── ProductPickerDialog.tsx            # search + pick an existing product (relink)
│   ├── ApplyClassificationDialog.tsx      # bulk dept/group/brand for the new lines
│   └── ConfirmPurchaseImportDialog.tsx    # summary + confirm, shows problems[] / relinked[] on result
├── hooks/
│   ├── usePurchaseImports.ts              # list, detail, upload, updateItem, deleteItem, applyClassification, confirm, discard
│   └── (suppliers reuse useLookups — see below)
├── services/
│   ├── purchaseImports.ts                 # axios wrappers; upload sends FormData
│   └── suppliers.ts                       # PATCH /suppliers/:id (admin rename)
└── lib/schemas/purchaseImport.ts          # zod: quantity (z.coerce int >= 1), salePrice (int >= 500), reference/description trim + max, per CODING_STANDARDS
```

Mutation invalidation: line edits/deletes/apply/discard invalidate `['purchase-imports']`; **confirm** also invalidates `['products']`, `['inventory-movements']` and `['suppliers']` (it changes stock and creates products), same pattern as `useCreateMovement`.

### List page

- Filter chips like `QuotationsListPage`: "Borradores" (default), "Confirmadas", "Descartadas", "Todas"; search by invoice number/supplier; `Pagination`.
- **Grouped by supplier:** for the draft filter the API orders by supplier name then `createdAt DESC`; the client renders a supplier heading whenever the supplier changes. Other filters are `createdAt DESC` (plain history). Each row: invoice number, issue date, line count, status chip, uploader.
- Upload success -> navigate straight to `/compras/:id`. Duplicate 409 -> inline alert "Esta factura ya fue cargada" + link to `existingImportId`. 422 -> the server's Spanish message.

### Review screen (mobile-first, cards not a table)

- Header: supplier + NIT, invoice number, date, "N líneas". Counters: nuevas / existentes / con pendientes. Chips to filter lines: Todas / Pendientes / Nuevas / Existentes. Overflow menu: "Aplicar clasificación a las nuevas", "Descartar".
- **Line card** (`PurchaseImportLineCard`):
  - Top row: line number, **status chip** — `Existe` (exact match), `Enlazado` (manual), `Nuevo` — plus issue badges in the warning colour.
  - Editable on blur (PATCH per field, per-card spinner, no whole-page reload): reference (mono, uppercased), description, **quantity** (number input `inputMode="numeric"`, select-on-focus; shows "Factura: 1.5" when `xmlQuantity` differs).
  - `Existe`/`Enlazado`: product summary "REF — Descripción · stock N -> N+qty" (live preview), buttons "Cambiar producto" (opens `ProductPickerDialog`) and, for `Enlazado`, "Quitar enlace".
  - `Nuevo`: expandable "Datos del producto nuevo" (`NewProductFields`) with department/group/brand `SearchableSelect`, `CurrencyField` for the sale price, "Exento de IVA". Also a "Enlazar a producto existente" button (same picker) for the case where the reference differs from what's in the catalog.
  - "Quitar línea" (delete) with a confirm tap — for freight/labor/non-stock lines.
- **Sticky bottom bar** above the mobile nav: summary + **Confirmar**, disabled while `readyToConfirm` is false (tap shows the count of blocking issues and scrolls to the first). Confirm dialog states plainly: "Se crearán X productos y se sumará stock a Y (Z unidades)".
- After confirm: result banner (with `relinked` notes) and the page becomes read-only (`Creado`/`Existente` chips from `createdProduct`, no editors). Confirmed/discarded imports render read-only always.

### Reuse and small extensions of existing pieces

- `SearchableSelect`: extend `LookupResource` with `'suppliers'` (backend mirrors the lookup shape, `getLookups` already hits `/${resource}`); use **without** `allowCreate` for suppliers. Department/group/brand selects use it as-is. Mirror `QuickCreateProductDialog`/`ProductFormPage`, which pass `allowCreate` for those (lookup creation is admin-only server-side — pass it only when the user is admin, matching whatever those two already do; verify when implementing).
- `ProductPickerDialog`: not a lookup, so extract the product search list already inlined in `QuotationDetailPage` (search `TextField` + `useProducts` results list) into this dialog rather than copying it a second time; leave `QuotationDetailPage` alone unless the extraction is trivial.
- `Button`, `Alert`, `Spinner`, `TextField`, `SelectField`, `CurrencyField`, `Pagination`, `handleEnterAsTab` as elsewhere; status-chip colour tokens from `QuotationsListPage` (`bg-amber-tint`, `bg-ok-tint`, ...).
- Products: `ProductsListPage` gets a supplier `SearchableSelect` filter; `ProductCard` shows the supplier name when present; `ProductFormPage` gets an optional supplier select (D3); `ProductResponse`/`ProductsQuery` types extended.
- Admin rename of a supplier: minimal — a small inline "Renombrar" action on the supplier heading of the list page (admin only), calling `PATCH /suppliers/:id`. No suppliers CRUD page.

## Left out to keep it simple

- **Remembered supplier-code -> product mapping** (decision 3). Matching stays exact-reference + manual relink; a repeat invoice from the same supplier with unmatched codes means re-linking each time. Revisit only if that hurts in practice.
- **Storing the raw XML** (D8) and re-parsing later.
- **ZIP support** (see Open question 3) and multi-file upload; one XML per upload.
- **Auto-suggested sale price** / writing supplier cost anywhere (D1); updating an existing product's cost, price or description from the invoice.
- **Reading IVA/tax data** to pre-fill `taxExempt`; totals/tax reconciliation against the XML; currency handling (COP assumed); unit-of-measure (`unitCode`) and fractional quantities.
- **Many suppliers per product**, supplier contact fields (phone/email/address), supplier create/delete endpoints and a suppliers management page.
- **Fuzzy/partial matching**, matching on barcode/GTIN, or on description.
- **Editing a confirmed import / reverting it.** A mistake is corrected the usual way: opposite inventory movements (append-only) and, if needed, removing the created products.
- **Guarding against uploading the store's own sales invoice** (it would create a supplier equal to the store; harmless and discardable).
- **Credit/debit notes from suppliers** (rejected with a clear error), DIAN reception events (Phase 11 stays out of scope), any Dataico call.
- Backend integration/e2e tests and client tests (out of scope per `TESTING.md`).

## Open questions for the human

1. **Real sample XML files (blocking for sign-off, not for starting).** Please share 1-2 real invoices as your suppliers actually send them (ideally one that arrives as a bare `Invoice` and one as an `AttachedDocument` if you receive both, with any sensitive data you prefer to redact). Every path in the parsing spec is written from the public standard and needs verifying against these before the phase is done; supplier-specific quirks (where they put their product code, multiple description lines, free-of-charge lines) only show up in real files.
2. ~~How is the app's "cost" related to the supplier's price?~~ **Moot** — cost was removed from the product model.
3. **Do suppliers' invoices reach the shop as a bare `.xml` file, or inside a `.zip` (typical for DIAN emails, with the PDF alongside)?** If zipped, the user must extract on the phone first; supporting `.zip` upload is a small addition (an extra dependency plus picking the XML inside) but was left out until this is confirmed.

## Migration plan

Hand-written, per `DATABASE.md`'s notes (the raw `migration:generate` diff carries unrelated drift). Two migrations so each reverts cleanly. Use `migration:create` for the timestamps (must sort after `AddTaxExemptToProducts`, currently the last file).

| # | Migration | What it does |
|---|---|---|
| 26 | `AddTaxExemptToProducts` | **Doc backfill only — the migration already exists but was never added to this table.** Adds `products.tax_exempt BOOLEAN NOT NULL DEFAULT false`. |
| 27 | `CreateSuppliers` | Phase 16. `suppliers` table (audit FKs to `users`, partial unique index `UQ_suppliers_nit_active`), adds nullable `products.supplier_id` (FK `RESTRICT`) + `IDX_products_supplier_id`. Hand-written, same reason as the migrations above. |
| 28 | `CreatePurchaseImports` | Phase 16. `purchase_imports` (FK to `suppliers` `RESTRICT`, audit FKs, single-outcome CHECK, both partial unique indexes, `created_at DESC` and `supplier_id` indexes) and `purchase_import_items` (FK to `purchase_imports` `CASCADE`, FK to `products`/lookups `RESTRICT`, `match_type` CHECK, reuses the existing `sale_type` enum, unique `(purchase_import_id, line_number)`, indexes). Hand-written, same reason as the migrations above. |

`down()` drops in reverse (items, imports, then `products.supplier_id` + `suppliers`). No data backfill: existing products keep `supplier_id = NULL`. No permission backfill (D9).

## Docs to update when this ships

- `docs/DATABASE.md`: `suppliers`, `purchase_imports`, `purchase_import_items` sections; `products.supplier_id` row + relationships note + ER-overview mention; migrations table rows 26-28 (26 is the missing backfill); note the `purchase_imports` no-`deleted_at` exception; `InventoryService.createMovement` now takes an optional `EntityManager` (update the `inventory_movements` "Business logic" paragraph).
- `docs/GLOSSARY.md`: new terms **Proveedor (Supplier)** and **Factura de proveedor / Importación de compra (Purchase import)** with the draft -> confirmed/discarded flow; extend "Permisos" with the three new codes (and that they were not backfilled); adjust "Eventos de recepción" to say supplier invoices are now received locally for stock only (still no DIAN event); update "Inventory movement" (purchase movements can originate from an import, notes reference it).
- `docs/ARCHITECTURE.md`: add `suppliers/` and `purchase-imports/` to the module tree (with the "imports Products/Inventory/Suppliers modules, no circular dep" note), the client folders, `@nestjs/platform-express` multipart + `fast-xml-parser` mention, and the manager-accepting `InventoryService`/`ProductsService` pattern.
- `docs/PROJECT_ROADMAP.md`: new **Phase 16 — Purchase invoice import** entry (exit criteria below) and a one-line clarification under Phase 11 that this local feature is not that.
- `docs/phases/PHASE_5_INVENTORY.md`: one line noting the optional `EntityManager` and the in-transaction locked read.
- This file: flip Status to Done, tick the checklist, record the resolved open questions and the real-sample verification result (with placeholder values only — no real supplier data in the repo, per the Phase 15 precedent).
- No new env vars (`.env.example`/`ENVIRONMENT_VARIABLES.md` unchanged). `README.md` only if the new dependency changes a setup step (it shouldn't).

**Exit criteria:** an employee/admin with the right permission can upload a supplier XML (bare or attached), review and edit the draft on a phone, and confirm it once — creating the missing products and increasing stock through recorded movements atomically — with the same invoice impossible to import twice, and products filterable by supplier.

## Implementation plan (backend first; the client can start once step B10's contract is stubbed)

**Backend** (`apps/api`), small commits (Conventional Commits, scopes `suppliers`, `products`, `inventory`, `purchase-imports`):

1. Dependencies: `npm i fast-xml-parser`, `npm i -D @types/multer`.
2. Permission codes + `IMPLIES` entries (+ extend the existing permission constant tests if present).
3. `suppliers/` module (entity, DTOs, service with `findOrCreateByNit`, controller) + migration 27.
4. Products: entity relation, DTOs (`supplierId`), response `supplier`, `supplierId` query filter, `product-normalize.util.ts` (`normalizeProductReference`, `normalizeProductDescription` — used by the DTO `@Transform`s **and** the import service), `create(dto, userId, manager?)`.
5. `InventoryService.createMovement(..., manager?)` refactor to `applyMovement` with the locked in-transaction read.
6. `purchase-imports/xml/purchase-invoice-xml.parser.ts` + fixtures (hand-made until a real sample arrives) + spec.
7. Entities + migration 28; `validateDraft()` pure function + spec.
8. `PurchaseImportsService`: upload, list, detail, updateItem, deleteItem, applyClassification, discard.
9. `PurchaseImportsService.confirm` (transaction as specified).
10. Controller (multipart, Swagger, permissions) + `PurchaseImportsModule` (imports `SuppliersModule`, `ProductsModule`, `InventoryModule`) + register in `AppModule`.
11. `npm run lint`, `npm run test`, manual run with a **real** XML (blocked on Open question 1).

**Unit tests required** (`TESTING.md`: every branch, edge cases, errors; TypeORM mocked, no real DB/HTTP):

- `purchase-invoice-xml.parser.spec.ts`: bare Invoice; `AttachedDocument` with CDATA inner; with entity-escaped inner; without inner invoice; `CreditNote`/`DebitNote`/other root rejected; malformed XML; empty file; `<!DOCTYPE`/`<!ENTITY` rejected in the outer and in the inner document; single `InvoiceLine` vs several; no lines; missing invoice number / issue date / supplier; NIT fallback `PartyTaxScheme` -> `PartyLegalEntity`; name fallback chain (`RegistrationName` -> legal entity -> `PartyName` -> `Person`); NIT normalization (dots/dashes) and DV from `schemeID`; CUFE as string and as object-with-attributes, and absent; quantity `"2.000000"` -> 2, `"1.5"` -> `quantity` NULL/`xmlQuantity` 1.5, `"0"`; reference from Sellers vs Standard vs none vs >100 chars; leading-zero reference and NIT preserved (`parseTagValue: false`); description repeated/`Name` fallback/truncation; default-namespace and odd prefixes; BOM stripped; >500 lines.
- `purchase-imports` validator spec: each issue code, linked vs unlinked applicability, duplicate-new-reference flags both lines, `NO_LINES`, `readyToConfirm` true/false.
- `purchase-imports.service.spec.ts`: **upload** (new supplier / existing supplier keeps its name; duplicate by supplier+number -> 409 with `existingImportId`/`existingStatus`; duplicate by CUFE; unique-violation race -> same 409; discarded duplicate allowed; auto-match sets `exact` and leaves others new; >500 lines); **updateItem** (non-draft 409; reference edit re-matches an unlinked line; manual link kept on reference edit; manual link to missing/soft-deleted product; `productId: null` re-matches; quantity/price bounds; unknown lookup id 404; normalization applied); **deleteItem**; **applyClassification** (only new lines, only NULL fields, never overwrites, empty body 400); **discard** (draft ok; confirmed/discarded 409); **list** (status derivation per filter, supplier filter, search escaping, draft ordering); **confirm** (not found; confirmed/discarded -> 409; header locked; validation failure returns all `problems[]` and writes nothing; empty draft; happy path mixing new + existing lines with `stock: 0` creation then movement per line, all using the same `manager`; notes text; supplier assigned only to products with NULL supplier and never overwritten; unlinked line whose reference now exists -> restocked and listed in `relinked`; linked product soft-deleted -> problem; duplicate new references -> problem; product-create unique violation -> 409 `PRODUCT_REFERENCE_TAKEN` with `confirmed_at` never set; movement failure propagates and `confirmed_at` never set; response counts).
- `suppliers.service.spec.ts`: `findOrCreateByNit` (found / created / unique-violation race / NIT normalized), `update` (name normalization, 404), `findAll` (search escaped, pagination).
- `products.service.spec.ts` additions: `create` with `supplierId` and with a `manager` (uses the manager's repositories), supplier not found, `update` sets/clears `supplierId`, `findAll` `supplierId` filter, normalizer functions.
- `inventory.service.spec.ts` (**none exists today — new file**): rejects negative resulting stock; type derived purchase/adjustment; product not found; soft-deleted product still adjustable; without `manager` it opens its own transaction; with `manager` it does not (runs on the given one); stock updated to `stock + quantity`.

**Client** (`apps/client`; no test setup exists, so `npm run lint` + manual mobile-width testing is the bar):

1. `lib/permissions.ts` mirror; `services/purchaseImports.ts`, `services/suppliers.ts`; `hooks/usePurchaseImports.ts`; `lib/schemas/purchaseImport.ts`.
2. Suppliers in `LookupResource` + products list filter, card label, form select; extended product types.
3. `PurchaseImportsListPage` + `UploadPurchaseImportButton` (incl. duplicate/422 messages) + supplier grouping + admin rename.
4. Review screen: `LineStatusChip`, `PurchaseImportLineCard`, `NewProductFields`, `ProductPickerDialog`, `ApplyClassificationDialog`, `PurchaseImportDetailPage`.
5. `ConfirmPurchaseImportDialog` + result banner + read-only confirmed/discarded views.
6. Nav entry + routes; manual test at phone width with a real XML (upload, edit, relink, bulk classification, confirm, re-upload -> duplicate message, discard -> re-upload allowed).
7. `npm run lint`; self-check against `DEFINITION_OF_DONE.md`; PR once the whole phase is done (not mid-phase).

## Implementation notes (deviations from the design above)

- **`ProductsService.create`/`update` were silently dropping `taxExempt`** (the DTOs accepted it, the service never copied it onto the entity), so the product form's "Exento de IVA" checkbox never persisted. Fixed in the same commit that added `supplierId`, since new products from an import need it and those exact methods were being changed. Pre-existing bug, not caused by this phase.
- The shared `normalizeProductReference` now also **trims** (the DTOs previously only uppercased). Strictly a fix; the purchase import needs it because it writes references without going through a DTO.
- The parser maps any error thrown by `fast-xml-parser` (which itself refuses hostile tag names like `__proto__`) to `422 INVALID_XML` instead of letting it surface as a 500.
- `PurchaseImport` carries plain `supplierId`/`confirmedById`/`discardedById` columns alongside its relations so status flips and the supplier filter are simple column writes.
- Supplier tagging of an *existing* product uses a single `UPDATE products SET supplier_id` inside the confirm transaction, driven by the supplier loaded with the product in that same transaction ("fill the blank" only).

## Known risks / things to watch

- **Parsing correctness rests on unverified paths** until a real sample is tested (Open question 1). The tolerant reads + draft review are the safety net: a wrongly read reference shows up as "Nuevo" on the review screen, never as silent bad data, because nothing is applied before confirm.
- A wrong "Existe" match (same code, different part across suppliers) is the main data-quality risk of exact-reference matching; the review card shows the matched product's description next to the invoice's so a human can catch it, and "Cambiar producto" fixes it.
- JWT-embedded permissions mean a newly granted `purchase_imports.*` code takes effect on the next token refresh, same as every other permission.
- Moving `createMovement`'s read inside the transaction changes locking behavior for all callers; it is strictly safer, but it touches invoice/quotation/note flows, so run their existing specs.

## Related documents

- `docs/DATABASE.md` (`products`, `inventory_movements`, `quotations`), `docs/GLOSSARY.md` ("Permisos", "Inventory movement", "Cotización"), `docs/ARCHITECTURE.md`, `docs/PROJECT_ROADMAP.md`, `docs/TESTING.md`
- `docs/phases/PHASE_5_INVENTORY.md`, `docs/phases/PHASE_11_RECEPTION_EVENTS.md`, `docs/phases/PHASE_15_PAYROLL.md` (format precedent)
