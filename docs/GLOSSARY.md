# Glossary

This document defines the business vocabulary used throughout the codebase, database, and documentation. A term defined here should be used consistently everywhere.

## Roles

### Admin
Full system access: users, products, catalogs (departments/groups/brands), inventory, invoicing. In code: `UserRole.ADMIN`.

### Employee
Can create/edit products and record inventory movements. Cannot manage users or catalogs. In code: `UserRole.EMPLOYEE`.

### Auditor
Read-only role. Can view products and inventory movement history, but the frontend's `EmployeeRoute` guard blocks it from the create/edit product routes. In code: `UserRole.AUDITOR` — added after the original two-role design, via the `AddAuditorRole` migration.

## Inventory domain

### Product
An item in the store's catalog. Identified by a unique `reference` (the SKU — also what the barcode scanner writes into, see "Barcode scanning" below) and `description`. In code: `Product` entity, `products` table.

### Departamento / Department, Grupo / Group, Marca / Brand
The three required classification lookups every product belongs to (exactly one of each — all `NOT NULL`). Historically imported from a legacy system called **SICAF** (also referred to as Sisco in earlier drafts of the requirements) — each has a legacy numeric `code`, now server-generated for any *new* entry rather than user-typed. See `DATABASE.md` for the exact shape; all three share it.

**Superseded, for the record:** an earlier design had a single free-text "categoría"/"marca" pair directly on `Product`. That was replaced by these three required lookup relations before any of it reached production — there is no migration path to document because the varchar-columns era (`department`/`group`/`line` on `products`) was already a lookup-adjacent design, just not normalized yet (see `DATABASE.md`'s `AddProductLookupForeignKeys` migration).

### Cost (Costo) vs. Sale price (Precio de venta)
`salePrice` is what staff actually type in — the number the store sells at. `cost` is **derived from it**, not entered directly: `cost = salePrice / factor`, where the factor depends on `saleType`. This is a deliberate reverse-markup calculation, not a data-entry field — see `DATABASE.md` for the exact factors.

### Sale type (Tipo de venta) — Normal / Neto
Selects which cost factor applies to a product's reverse markup calculation (see above). In code: `SaleType.NORMAL` / `SaleType.NETO`, column `products.sale_type`.

### Stock
The product's current on-hand quantity, stored directly on `Product.stock` and changed only through a recorded inventory movement (never edited directly). See "Inventory movement" below.

### Inventory movement (Movimiento de inventario)
A signed change to a product's stock, with an audit trail of who made it and why. In code: `InventoryMovement` entity, `inventory_movements` table — **append-only, no edit or delete endpoint exists.** A mistake is corrected by recording a new, opposite movement, not by editing the original.

**Movement type** is derived automatically from the sign of the quantity — the caller never chooses it directly:
- **Purchase (`purchase`)** — positive quantity, stock increases.
- **Adjustment (`adjustment`)** — negative quantity, stock decreases.
- **Initial (`initial`)** — exists only on historical rows the `CreateInventoryMovements` migration backfilled for products that already had stock before this table existed. No current endpoint can produce a new `initial` row.

### Barcode scanning
A frontend-only convenience — there is no dedicated barcode column or backend concept. `BarcodeScannerModal` decodes a barcode via the device camera (`@zxing/browser`) and writes the decoded text straight into the product form's **`reference`** field. The app deliberately conflates SKU/reference with barcode; if a product ever needs a barcode distinct from its reference, that's a schema change, not a frontend-only fix.

### Forced password change
`User.mustChangePassword` — set to `true` whenever an admin creates a user or resets someone's password, cleared only when that user changes their own password via `POST /auth/change-password`. Enforced globally: the flag rides in the JWT payload, and `JwtAuthGuard` rejects any request with `403 PasswordChangeRequired` unless the route is marked `@SkipPasswordCheck()`. The frontend's axios interceptor and `ProtectedRoute` both redirect to `/change-password` when this happens — belt and suspenders, not a duplicate implementation of the same rule.

## Invoicing domain (Dataico / DIAN)

Colombia requires electronic invoicing through a DIAN-authorized provider; **Dataico** is that provider for this project. `Sisco` — the legacy Excel-import invoicing tool this system used to export for — **is retired**; see `PROJECT_ROADMAP.md` for the retirement plan. General DIAN/legal terms below are standard Colombian electronic-invoicing concepts (public regulatory knowledge); anything about how *Dataico specifically* exposes them over its API is marked pending until confirmed against that module's shared reference — see `CLAUDE.md`.

### DIAN
*Dirección de Impuestos y Aduanas Nacionales* — Colombia's tax authority. Every electronic invoice, credit note, and debit note must ultimately be validated/authorized by DIAN; Dataico is the authorized intermediary this system talks to instead of DIAN directly.

### Factura electrónica (Electronic invoice)
The core invoicing document — what replaces a manually-issued paper/PDF invoice. Corresponds to Dataico's "1. Factura electrónica estándar" collection, "Estructura básica" variant (see `CLAUDE.md`'s "keep it simple" — this store doesn't need the collection's many special-tax variants). **Both the send request and its success response are confirmed and implemented** — `InvoicesService`, `POST /api/invoicing/invoices`, `invoices` table. See `docs/phases/PHASE_10_INVOICING_STANDARD.md` for the full payload. Resend/query requests are still pending.

### Nota crédito / Nota débito (Credit note / Debit note)
Adjustments issued against an already-sent invoice — a credit note reduces what's owed (return, discount, error correction), a debit note increases it (an additional charge). Both live under the same "Factura electrónica estándar" Dataico collection as the invoice itself. Request/response shape still pending — only "Envío Factura" has been confirmed so far.

### Resolución DIAN / DIAN resolution (numbering authorization)
DIAN authorizes a business to issue invoices only within a specific numbering range and validity window ("resolución de facturación"), per document type. An invoice sent outside its resolution's authorized range/date is invalid. Corresponds to Dataico's "8. Actualizar o vincular resoluciones" collection — this is why it's planned as an **early** invoicing phase (`PHASE_8_RESOLUTIONS.md`): an invoice can't legitimately be sent before a resolution is on file. The confirmed "Envío Factura" request (see `docs/phases/PHASE_10_INVOICING_STANDARD.md`) shows what a resolution looks like from the invoice side — `numbering: { resolution_number, prefix, flexible }` — but the "Actualizar o vincular resoluciones" collection's own create/update mechanics are still pending.

### CUFE (Código Único de Facturación Electrónica)
The unique code DIAN/the provider assigns to a validated electronic invoice — the legal proof-of-existence identifier a business must be able to retrieve and, in some cases, print (e.g. as a QR code) on the invoice representation. **Confirmed**: returned as `cufe` (lowercase) in Dataico's "Envío Factura" response, alongside a separate `uuid` field (Dataico's own internal document id — not the same value). Stored on `invoices.cufe`. See `docs/phases/PHASE_10_INVOICING_STANDARD.md`.

### Tercero (Third party) / Consulta DIAN Terceros
"Tercero" is the generic DIAN term for the other party in a transaction — here, the invoice's customer/recipient. Dataico's "7. Consulta DIAN Terceros" collection (`GET /dian_terceros?identification=&identification_type=`) is a lookup by identification number confirmed to return `{ identification, identification_type, company_name, email }` for a NIT — a lighter response than Phase 10's invoice `customer` block (no address/phone/city), just enough to confirm a company's legal name. In code: `ThirdPartiesService`, `GET /api/invoicing/third-parties`. See `docs/phases/PHASE_9_THIRD_PARTIES.md` — the response shape for a non-NIT (persona natural) lookup is not yet confirmed. Live lookup only, deliberately not cached/persisted (see `CLAUDE.md`'s "keep it simple").

### Documento soporte (Support document)
A DIAN document a business issues **for itself** when it buys from a supplier who isn't obligated to invoice electronically (e.g. an informal/small supplier) — the buyer generates the document instead of receiving one. Corresponds to Dataico's "4. Documento soporte" collection. Relevant to this business if it regularly buys spare parts from informal suppliers; scope/priority pending confirmation with the human — see `PROJECT_ROADMAP.md`.

### Eventos de recepción (Reception events)
DIAN's mechanism for the *receiving* party of an invoice to acknowledge/reject/dispute it (e.g. "recibido", "reclamo"), and generally the channel through which document status updates (accepted, rejected by DIAN) flow back. Corresponds to Dataico's "6. Eventos de recepción" collection — likely the closest thing to a webhook/status-callback mechanism this integration has. Exact mechanics (webhook vs. polling, payload shape) pending that module's reference.

### POS Electrónico (Electronic POS document)
A lighter-weight DIAN document type for point-of-sale transactions, an alternative to a full "factura electrónica" for qualifying sales. Corresponds to Dataico's "3. POS Electrónico" collection. Candidate to actually use for this store's day-to-day counter sales instead of full invoices, depending on DIAN's eligibility rules and what the business needs — a decision for the human before that phase starts, not something to assume.

### Nómina Electrónica (Electronic payroll)
DIAN's electronic payroll-reporting document type. Corresponds to Dataico's "5. Nómina Electrónica" collection. **Likely out of scope** for this project — CasaRespuestos's invoicing pivot is about selling to customers, not payroll reporting — but documented here for completeness since the collection exists in the shared workspace. See `PROJECT_ROADMAP.md`'s "Explicitly out of scope for now" table.

### Factura electrónica — sector salud (Healthcare-sector invoice)
A specialized invoice variant with extra fields required for healthcare-sector billing (RIPS-adjacent data). Corresponds to Dataico's "2. Factura electrónica sector salud" collection. **Out of scope** — CasaRespuestos is a spare parts store, not a healthcare provider. Documented for completeness only.

## Related documents

- `DATABASE.md` — how these terms map to actual tables and columns
- `ARCHITECTURE.md` — where the business logic for these concepts lives in the codebase
- `PROJECT_ROADMAP.md` — phase order and in-scope vs. out-of-scope invoicing modules
