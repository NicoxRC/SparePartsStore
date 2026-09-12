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
Adjustments issued against an already-sent invoice, referencing it by Dataico's `invoice_id` — a credit note reduces what's owed (return, discount, error correction), a debit note increases it (an additional charge the original invoice missed, e.g. a forgotten service fee or a late-payment interest). Both live under the same "Factura electrónica estándar" Dataico collection as the invoice itself.

**Credit note is blocked, not just pending**: the only shared example is contaminated with health-sector-specific fields (a `health` block, `operation: "SS_SIN_APORTE"`) copied identically across multiple differently-named requests in the collection — not usable as a reference for a standard sale. **Debit note** has one clean example but was deliberately deferred alongside it, at the human's request, rather than shipping half the pair. See `docs/phases/PHASE_10_INVOICING_STANDARD.md`.

### Reenviar factura / Resend invoice
Not a new document — re-triggers DIAN submission and/or the customer notification email on an invoice that **already exists** in Dataico (e.g. recovering from a failed DIAN submission or a failed email delivery), addressed by Dataico's own `uuid`. Confirmed and implemented: `PUT /invoices/{uuid}` with just `{ actions: { send_dian, send_email } }`. In code: `InvoicesService.resend()`, `POST /api/invoicing/invoices/:id/resend`. Updates the existing `invoices` row rather than creating a new one — see `docs/DATABASE.md`.

### Consulta Factura / Query invoice
Re-fetches an invoice's current state from Dataico by its business number (`GET /invoices?number=`), used here to refresh this app's local copy of an invoice's status/CUFE. In code: `InvoicesService.refreshStatus()`, `POST /api/invoicing/invoices/:id/refresh`. Does not recover an invoice Dataico accepted but that was never saved locally at all — that remains a known limitation, see `docs/phases/PHASE_10_INVOICING_STANDARD.md`.

### Resolución DIAN / DIAN resolution (numbering authorization)
DIAN authorizes a business to issue invoices only within a specific numbering range and validity window ("resolución de facturación"), per document type. An invoice sent outside its resolution's authorized range/date is invalid. Corresponds to Dataico's "8. Actualizar o vincular resoluciones" collection — this is why it's planned as an **early** invoicing phase (`PHASE_8_RESOLUTIONS.md`): an invoice can't legitimately be sent before a resolution is on file. The confirmed "Envío Factura" request (see `docs/phases/PHASE_10_INVOICING_STANDARD.md`) shows what a resolution looks like from the invoice side — `numbering: { resolution_number, prefix, flexible }`. A business can hold **more than one** resolution under the same `documentType: invoice` — Phase 8's `subtype` column (`ELECTRONICO` vs `POS`) distinguishes a standard-invoice resolution from a POS-specific one, both looked up via `ResolutionsService.findActiveForDocumentType(documentType, subtype)`. See `docs/phases/PHASE_12_POS.md`.

### CUFE (Código Único de Facturación Electrónica)
The unique code DIAN/the provider assigns to a validated electronic invoice — the legal proof-of-existence identifier a business must be able to retrieve and, in some cases, print (e.g. as a QR code) on the invoice representation. **Confirmed**: returned as `cufe` (lowercase) in Dataico's "Envío Factura" response, alongside a separate `uuid` field (Dataico's own internal document id — not the same value). Stored on `invoices.cufe`. See `docs/phases/PHASE_10_INVOICING_STANDARD.md`.

### Tercero (Third party) / Consulta DIAN Terceros
"Tercero" is the generic DIAN term for the other party in a transaction — here, the invoice's customer/recipient. Dataico's "7. Consulta DIAN Terceros" collection (`GET /dian_terceros?identification=&identification_type=`) is a lookup by identification number confirmed to return `{ identification, identification_type, company_name, email }` for a NIT — a lighter response than Phase 10's invoice `customer` block (no address/phone/city), just enough to confirm a company's legal name. In code: `ThirdPartiesService`, `GET /api/invoicing/third-parties`. See `docs/phases/PHASE_9_THIRD_PARTIES.md` — the response shape for a non-NIT (persona natural) lookup is not yet confirmed. Live lookup only, deliberately not cached/persisted (see `CLAUDE.md`'s "keep it simple"). Not to be confused with **Cliente / Customer (local)** below — that's this app's own saved address book, not a DIAN lookup.

### Cliente / Customer (local)
A small enhancement connecting Phases 10 and 12, **not a Dataico integration** — a persisted local "customer address book" (`customers` table) so store staff can search and reuse a customer across sales instead of retyping or re-looking-up every time. Created/edited directly by staff (admin or employee) via `CustomersService`, `POST/GET/PATCH /api/customers` — zero HTTP calls to Dataico. Distinct from **Tercero** above: "Tercero" is the live, uncached DIAN identity-validation lookup from Phase 9, while `customers` is this app's own reusable, persisted record — the two are not linked by foreign key, and `invoices`/`pos_invoices` still carry their own denormalized `customer_*` columns untouched by this table. See `docs/DATABASE.md` for the schema.

### Documento soporte (Support document)
A DIAN document a business issues **for itself** when it buys from a supplier who isn't obligated to invoice electronically (e.g. an informal/small supplier) — the buyer generates the document instead of receiving one. Corresponds to Dataico's "4. Documento soporte" collection. Relevant to this business if it regularly buys spare parts from informal suppliers; scope/priority pending confirmation with the human — see `PROJECT_ROADMAP.md`.

### Eventos de recepción (Reception events) — out of scope
DIAN's mechanism for the *receiving* party of an invoice to acknowledge/accept/reject it: Acuse de recibido, Aceptación Tácita/Expresa, Recibido de prestación, Rechazo. **Confirmed out of scope** — this is entirely about acting as the buyer acknowledging a supplier's invoice, not about tracking status on invoices this store issues (that's "Consulta Factura," see "Factura electrónica" below). Corresponds to Dataico's "6. Eventos de recepción" collection. See `docs/phases/PHASE_11_RECEPTION_EVENTS.md`.

### POS Electrónico (Electronic POS document)
A lighter-weight DIAN document type for point-of-sale transactions. **Confirmed as this store's primary sale flow** — most sales are counter sales. Corresponds to Dataico's "3. POS Electrónico" collection (`POST /pos-invoices`), confirmed only against staging/gamma test environments, no production URL yet. In code: `PosInvoicesService`, `POST /api/invoicing/pos-invoices`, `pos_invoices` table. See `docs/phases/PHASE_12_POS.md` for the confirmed payload and everything that differs from the standard invoice (Phase 10) — different host, flat top-level `send-dian`/`send-email`, nested item `product` object, array `payment-means`, no confirmed response shape.

### Nómina Electrónica (Electronic payroll)
DIAN's electronic payroll-reporting document type — mandatory in Colombia for any employer with formal employees, independent of whether that employer also invoices customers electronically. Corresponds to Dataico's "5. Nómina Electrónica" collection (`POST /payroll-entries`, on its own `payroll-api` host path). **Confirmed needed**: this store has formal employees. Originally marked out of scope on the mistaken assumption that it was unrelated to the invoicing pivot — corrected once asked directly. **This app is a pass-through only, not the source of truth for payroll** — figures are computed elsewhere and just forwarded. In code: `PayrollService`, `POST /api/invoicing/payroll-entries` (admin-only), `payroll_entries` table. See `docs/phases/PHASE_15_PAYROLL.md`.

### Factura electrónica — sector salud (Healthcare-sector invoice)
A specialized invoice variant with extra fields required for healthcare-sector billing (RIPS-adjacent data). Corresponds to Dataico's "2. Factura electrónica sector salud" collection. **Out of scope** — CasaRespuestos is a spare parts store, not a healthcare provider. Documented for completeness only.

## Related documents

- `DATABASE.md` — how these terms map to actual tables and columns
- `ARCHITECTURE.md` — where the business logic for these concepts lives in the codebase
- `PROJECT_ROADMAP.md` — phase order and in-scope vs. out-of-scope invoicing modules
