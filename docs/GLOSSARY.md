# Glossary

This document defines the business vocabulary used throughout the codebase, database, and documentation. A term defined here should be used consistently everywhere.

## Roles

### Admin
Full system access: users, products, catalogs (departments/groups/brands), inventory, invoicing. In code: `UserRole.ADMIN`.

### Employee
A base role gating which whole app sections exist for this user's employment at all (invoicing, inventory, cash register, etc. — see `RolesGuard`/`@Roles`). Cannot manage users or catalogs — those stay admin-only, same as before. **Within** what an employee-role account can reach, individual permissions (see "Permisos" below) decide what *this specific* employee can actually see and do — two employees can have very different access despite sharing `UserRole.EMPLOYEE`. In code: `UserRole.EMPLOYEE`.

### Auditor
Read-only role. Can view products and inventory movement history, but the frontend's `EmployeeRoute` guard blocks it from the create/edit product routes. Fixed and untouched by the permission system below — an auditor's access never varies per account. In code: `UserRole.AUDITOR` — added after the original two-role design, via the `AddAuditorRole` migration.

## Permisos (granular per-employee permissions)

A local enhancement, **not a Dataico integration** — added because a coarse `employee` role treated every employee as identical, and a store may want one employee able to do something another shouldn't (the example that prompted this: access to Productos is one thing, being able to delete a product is another — though that specific example was already true before this system, since delete was already admin-only). Only ever meaningful for `role: employee` — `admin` is a fixed superuser and `auditor`'s fixed read-only access is untouched; neither uses this system at all.

A flat, code-owned catalog of `<scope>.<action>` codes (`products.view`, `cash_register.open`, `quotations.invoice`, etc. — see `common/constants/permission.constant.ts` for the full list and `docs/DATABASE.md` for the column) stored per user as `users.permissions text[]`. The catalog only ever contains actions a coarse `employee` could already do before this system existed — nothing admin-only (deleting a product/customer, catalog CRUD, managing users, resolutions, payroll) is assignable, so this system can never be used to grant an employee admin-level power.

Enforced by a new `@RequirePermission(...)` decorator + `PermissionsGuard`, which **coexists** with `@Roles`/`RolesGuard` rather than replacing it: `RolesGuard` still decides whether a role can reach a route at all, `PermissionsGuard` then refines that only for `employee` (it bypasses admin and auditor entirely). Permissions ride the JWT the same way `role` already does, so a change takes effect on the normal token-refresh cycle, not instantly.

Granting a permission auto-grants what it structurally implies (e.g. `products.create` also grants `products.view` and `catalogs.view`, since the product form's dropdowns need it — see `expandPermissions()`) — a small hardcoded map, not a rule engine, and verified against the actual client code rather than assumed (e.g. `invoices.create`/`quotations.create` imply `customers.*`/`third_parties.view` because the sale/quotation customer step genuinely depends on both).

Managed from the existing user edit form (`UserFormPage`, a "Permisos" section shown only when role is employee) via its own `PATCH /api/users/:id/permissions` endpoint — a full replace, same convention as `PATCH /quotations/:id/items`. See `docs/DATABASE.md` for the migration and backfill.

## Inventory domain

### Product
An item in the store's catalog. Identified by a unique `reference` (the SKU — also what the barcode scanner writes into, see "Barcode scanning" below) and `description`. In code: `Product` entity, `products` table.

### Departamento / Department, Grupo / Group, Marca / Brand
The three required classification lookups every product belongs to (exactly one of each — all `NOT NULL`). Historically imported from a legacy system called **SICAF** (also referred to as Sisco in earlier drafts of the requirements) — each has a legacy numeric `code`, now server-generated for any *new* entry rather than user-typed. See `DATABASE.md` for the exact shape; all three share it.

**Superseded, for the record:** an earlier design had a single free-text "categoría"/"marca" pair directly on `Product`. That was replaced by these three required lookup relations before any of it reached production — there is no migration path to document because the varchar-columns era (`department`/`group`/`line` on `products`) was already a lookup-adjacent design, just not normalized yet (see `DATABASE.md`'s `AddProductLookupForeignKeys` migration).

### Cost (Costo) vs. Sale price (Precio de venta)
`salePrice` is what staff actually type in — the number the store sells at. `cost` is **derived from it**, not entered directly: `cost = salePrice / factor`, where the factor depends on `saleType`. This is a deliberate reverse-markup calculation, not a data-entry field — see `DATABASE.md` for the exact factors.

**Confirmed: `salePrice` already includes IVA** — it's exactly what the customer pays, not a pre-tax base. A line's `taxRate: 0` is therefore only a flag for the "excluida"/exenta label on the invoice, not a separate calculation. Since Dataico reports `price`/`tax_base` as the pre-tax amount with `tax_amount` broken out, `InvoicesService.resolveItems()` unwraps `salePrice` back to its pre-tax equivalent (`grossPrice / (1 + taxRate / 100)`) before applying the per-line discount and computing tax — see that method's docstring. The client-side total preview in `InvoiceFormPage.tsx` (`computeItemTotal()`) mirrors the same math so the running total shown while building a sale matches what actually gets invoiced.

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
Adjustments issued against an already-sent invoice, referencing it by Dataico's `invoice_id` — a credit note reduces what's owed (return, discount, error correction) and returns stock to inventory, a debit note increases it (an additional charge or product the original invoice missed) and decrements stock further. Both live under the same "Factura electrónica estándar" Dataico collection as the invoice itself, and both use Dataico's *flexible numbering* — no DIAN `resolution_number` the way invoices need one, just this store's own prefix per note type (`DATAICO_DEBIT_NOTE_PREFIX`, `DATAICO_CREDIT_NOTE_PREFIX`). Both are confirmed and implemented; see `docs/phases/PHASE_10_INVOICING_STANDARD.md` for the full confirmed request shapes.

**Debit note.** `DebitNotesService`, `POST /api/invoicing/debit-notes`, `debit_notes` table. Reuses the target invoice's own stored customer data (no re-typing), validates stock up front, and — only after Dataico accepts — decrements inventory per item via the same `InventoryService.createMovement` the invoice flow already uses. The confirmed `reason` value is `'OTROS'` (hardcoded, not exposed as a picker).

**Credit note.** `CreditNotesService`, `POST /api/invoicing/credit-notes`, `credit_notes` table. The original shared example was contaminated with health-sector-specific fields (a `health` block, `operation: "SS_SIN_APORTE"`, `reason: "ANULACION"`) copied identically across multiple differently-named requests in the collection — **not** what this was built against. A second, genuinely clean example (sourced from Dataico's own documentation) confirmed the real shape: `reason: 'DEVOLUCION'` (hardcoded, the only trusted value), plus `payment_means`/`payment_means_type`/`payment_date` reused from the original invoice (unlike debit notes, whose confirmed examples never included these), and a hyphenated `measuring-unit` item field (debit notes use the underscored `measuring_unit` — the two note types' examples disagree on this and each is implemented matching its own evidence, not forced into consistency). No stock check — a credit note only ever returns merchandise — and inventory moves the opposite direction from a debit note (stock increases).

**Both note types' response shape is assumed, not confirmed** — no response example was ever shared for either, only requests. Both mirror the invoice's own confirmed response fields (`dian_status`/`cufe`/`uuid`/urls) as the same underlying Dataico document-resource family; first thing to verify once a real note of either kind goes through Dataico.

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
A small enhancement connecting Phases 10 and 12, **not a Dataico integration** — a persisted local "customer address book" (`customers` table) so store staff can search and reuse a customer across sales instead of retyping or re-looking-up every time. Created/edited directly by staff (admin or employee) via `CustomersService`, `POST/GET/PATCH/DELETE /api/customers` (delete is admin-only) — zero HTTP calls to Dataico. Distinct from **Tercero** above: "Tercero" is the live, uncached DIAN identity-validation lookup from Phase 9, while `customers` is this app's own reusable, persisted record — the two are not linked by foreign key, and `invoices`/`pos_invoices` still carry their own denormalized `customer_*` columns untouched by this table. Also stores a NIT check digit (`identification_dv`) and `phone`, both **local-only** — neither is part of the confirmed Dataico standard-invoice `customer` payload, so they're never sent to Dataico, only kept here and shown on the invoice form for this store's own record. See `docs/DATABASE.md` for the schema.

A "Clientes" client module (list/search/paginate/edit/delete, plus per-customer purchase history) lives on top of this — see `docs/DATABASE.md`'s note on `GET /api/customers/:id/history` for how the history is matched (identification pair, not FK).

### Caja / Apertura y cierre de caja (Cash register open/close)
A local-bookkeeping enhancement, **not a Dataico integration** — one shared cash register per calendar day for the whole store (not per user or per session), tracked in `cash_registers`. Opening ("abrir caja") is **mandatory before any new invoice or quotation can be created**: `InvoicesService.create`/`QuotationsService.create` both call `CashRegisterService.assertOpenToday()` and refuse with a 400 if no register is open for today — this gate applies only to creating new ones, not to viewing history or to resend/refresh/edit/cancel actions on an existing one. Opening now requires counting the physical cash on hand (`opening_amount`, "base") — the frontend shows the previous day's `counted_cash` as a placeholder only, never a pre-filled value, since the actual count must be re-done each day.

Closing ("cerrar caja") at the end of the day **auto-calculates a full report**, confirmed directly with the human — collected and owed are never combined into one number, since owed money isn't actually in the register:
- `total_amount` — **recaudado**, the sum of that day's `invoices.total_amount` (money actually collected).
- `total_owed` — **adeudado**, the sum of that day's `quotations.total_amount` still open (not yet invoiced or cancelled) — merchandise handed out on credit today that hasn't been paid for. Scoped strictly to quotations *created that day*: an unpaid quotation from a prior day is that day's debt, already reflected in that day's own close, and never counts again today.
- `total_cash`/`total_card`/`total_transfer` — `total_amount` broken down by payment method (debit/credit notes deliberately excluded — see `docs/DATABASE.md`).
- `expected_cash` — what should physically be in the drawer: `opening_amount + total_cash +` net of the day's `cash_movements` (see below).
- `counted_cash`/`cash_discrepancy` — what the cashier actually counts at close time, and the gap against `expected_cash`. If it doesn't square, staff can correct `counted_cash` afterward (`PATCH /api/cash-register/:id/counted-cash`, same roles as opening/closing) without reopening anything else about that day — the discrepancy is always shown, never hidden.

**Movimientos de caja (cash movements)** — `cash_movements`, entradas/salidas of cash that aren't a sale (e.g. bringing in change, paying a supplier out of the till). Requires a reason, and a signed `amount` (positive = entrada, negative = salida) instead of a separate type column, mirroring how `inventory_movements.quantity` already encodes direction by sign. Feeds into `expected_cash` at close time. Deliberately cash-only — no payment-method field, since these exist purely to reconcile physical cash, not card/transfer balances.

The report also lists that day's **nota débito/nota crédito** (see below) for visibility — a note can move real money without being a sale — but deliberately does **not** fold them into `total_cash`/`expected_cash`: a note inherits the original invoice's payment method (which may be card/transfer, not cash), so summing it into the cash math would misrepresent the drawer.

There is no reopen flow — once closed, a day's register's invoices/quotations/movements are done; only `counted_cash` stays correctable. Per-seller breakdown isn't tracked here — that's already covered by each invoice/quotation's own `created_by_id`. In code: `CashRegisterService`, `POST /api/cash-register/open`, `POST /api/cash-register/close`, `PATCH /api/cash-register/:id/counted-cash`, `POST /api/cash-register/movements`, `GET /api/cash-register/today`, `GET /api/cash-register`, `cash_registers`/`cash_movements` tables.

### Panel administrativo (Admin dashboard)
A local enhancement, **not a Dataico integration and not persisted anywhere** — a single read-only snapshot (`GET /api/dashboard/summary`, admin-only) composed on demand from `DashboardService`: today's caja status (reuses `CashRegisterService.getTodayStatus()`), a 7-day sales trend (sum of `invoices.total_amount` per store day), every currently open quotation's total across all days (not just today's — a different figure from `cash_registers.total_owed`, which is scoped to that one day), and inventory stats (`SUM(cost * stock)`, count and preview of out-of-stock products). "Low stock" deliberately means only `stock = 0` — there's no confirmed minimum-stock concept in the data model yet, so no threshold was invented; add one only once the human confirms what it should be. Deliberately left out to keep it simple: debit/credit notes (rare corrections, already visible in the caja report) and a "top selling products" widget (invoice line items live in each invoice's `request_payload` JSONB, not a queryable table — aggregating them isn't worth the complexity here). In code: `DashboardService`, `GET /api/dashboard/summary`.

### Cotización (Quotation / store credit)
A local enhancement, **not a Dataico integration** — merchandise handed over to a customer before they actually pay ("le fío/le doy crédito"), tracked in `quotations`/`quotation_items`. Creating one (from the "Cotizar" button on Venta's customer step) decrements inventory exactly like a real sale — the stock is physically gone — even though nothing is sent to DIAN yet; gated the same way a sale is, by `CashRegisterService.assertOpenToday()`. Its items are editable afterward (a customer returns something or asks for more), each edit applying only the net signed change to inventory, not a full re-decrement. A quotation is **not** frozen at its listed prices in the sense of ignoring later edits — but each line's price **is** locked at the moment it's added or last edited (`quotation_items.unit_price`, a snapshot of the product's then-current `sale_price`), confirmed with the human: the customer keeps the price they were quoted, not whatever the product costs by the time they pay. A quotation resolves one of two ways: **Facturar**, converting it into a real `Invoice` (billed either to the quotation's own customer or to someone else entirely, e.g. a different payer settling the account) — which does not decrement stock again, since that already happened; or **Cancelar**, returning all of its reserved stock and closing it with no invoice created. No stored status column — derived from `invoiced_at`/`cancelled_at`, same as `cash_registers.closed_at`. In code: `QuotationsService`, `POST/GET/PATCH /api/quotations`, `quotations`/`quotation_items` tables. See `docs/DATABASE.md`.

### Documento soporte (Support document)
A DIAN document a business issues **for itself** when it buys from a supplier who isn't obligated to invoice electronically (e.g. an informal/small supplier) — the buyer generates the document instead of receiving one. Corresponds to Dataico's "4. Documento soporte" collection. Relevant to this business if it regularly buys spare parts from informal suppliers; scope/priority pending confirmation with the human — see `PROJECT_ROADMAP.md`.

### Eventos de recepción (Reception events) — out of scope
DIAN's mechanism for the *receiving* party of an invoice to acknowledge/accept/reject it: Acuse de recibido, Aceptación Tácita/Expresa, Recibido de prestación, Rechazo. **Confirmed out of scope** — this is entirely about acting as the buyer acknowledging a supplier's invoice, not about tracking status on invoices this store issues (that's "Consulta Factura," see "Factura electrónica" below). Corresponds to Dataico's "6. Eventos de recepción" collection. See `docs/phases/PHASE_11_RECEPTION_EVENTS.md`.

### POS Electrónico (Electronic POS document) — **removed**
A lighter-weight DIAN document type for point-of-sale transactions, corresponding to Dataico's "3. POS Electrónico" collection. Built in Phase 12, then **removed** — the store no longer uses it as a sale flow; standard invoicing (`invoices`) is the only sale/document channel now. `PosInvoicesService`, its routes, `pos_invoices` table, and its client pages are all gone from the codebase. See `docs/phases/PHASE_12_POS.md` for the historical record of what was built and confirmed, and `PROJECT_ROADMAP.md` for the removal.

### Nómina Electrónica (Electronic payroll) — **hidden, not removed**
DIAN's electronic payroll-reporting document type — mandatory in Colombia for any employer with formal employees, independent of whether that employer also invoices customers electronically. Corresponds to Dataico's "5. Nómina Electrónica" collection (`POST /payroll-entries`, on its own `payroll-api` host path). **Confirmed needed**: this store has formal employees. Built in Phase 15; **currently hidden from the client nav** — not in active use for now, but expected back, so the backend, routes, and pages are untouched, only the nav link is gone (see `PROJECT_ROADMAP.md`). **This app is a pass-through only, not the source of truth for payroll** — figures are computed elsewhere and just forwarded. In code: `PayrollService`, `POST /api/invoicing/payroll-entries` (admin-only), `payroll_entries` table. See `docs/phases/PHASE_15_PAYROLL.md`.

### Factura electrónica — sector salud (Healthcare-sector invoice)
A specialized invoice variant with extra fields required for healthcare-sector billing (RIPS-adjacent data). Corresponds to Dataico's "2. Factura electrónica sector salud" collection. **Out of scope** — CasaRespuestos is a spare parts store, not a healthcare provider. Documented for completeness only.

## Related documents

- `DATABASE.md` — how these terms map to actual tables and columns
- `ARCHITECTURE.md` — where the business logic for these concepts lives in the codebase
- `PROJECT_ROADMAP.md` — phase order and in-scope vs. out-of-scope invoicing modules
