# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three roles, all staff of one physical store (not external customers — this is an internal operations tool):

- **Empleado (employee):** counter staff. Uses the app many times a day, standing at the counter with a customer waiting — searching products, ringing up a sale, issuing a DIAN electronic invoice, opening/closing the cash drawer, quoting a sale on credit. Granular per-employee permissions decide exactly which of these actions a given employee can do.
- **Admin:** the store owner/manager. Full access — everything an employee can do, plus user/permission management, product catalogs, DIAN resolutions, payroll, and the admin dashboard (sales trend, caja status, inventory value, out-of-stock alerts).
- **Auditor:** a fixed, read-only role (an accountant) — views products and inventory movement history only.

Confirmed: employee and admin are equally primary — the app must work as well for fast, repetitive counter transactions as it does for oversight/reporting. No separate customer-facing surface exists.

## Product Purpose

An inventory + point-of-sale + DIAN-compliant electronic invoicing system for a single small car spare-parts store in Colombia ("La Casa de los Repuestos," Pasto, Nariño). It replaced a legacy DOS-era system ("Sisco," dot-matrix receipt printouts) and now issues real electronic invoices to DIAN through the Dataico API, alongside inventory tracking, a local customer address book, "cotizaciones" (store credit — merchandise handed over before payment), and daily cash-register reconciliation. Success is a counter sale that's faster and more accurate than the old system, with a legally valid electronic invoice at the end of it — not a feature-complete ERP.

## Positioning

Not a generic multi-tenant POS/ERP — it's shaped tightly around what one small counter-sale car-parts business actually needs from DIAN electronic invoicing (Dataico's "Factura electrónica estándar" module, deliberately not its full 8-module surface), with zero enterprise ceremony a competitor's generic small-business tool would carry (no multi-store, no complex approval chains, no inventory forecasting). The mechanism a bigger product couldn't cheaply copy: it's opinionated about what this one store needs and refuses everything else, on purpose.

## Operating Context

- Used live at a physical retail counter, phone/tablet in hand or propped on the counter, with a customer standing there waiting — every extra tap or moment of confusion is felt in real time, not reviewed later.
- Also used seated, at a desk (open/close cash register at start/end of day, admin reviewing the dashboard, managing catalogs/users) — a slower, more deliberate mode than the counter-sale flow.
- Physical printed output is a real, current part of the workflow: DIAN-certified invoice receipts (Dataico's own PDF, with a DIAN-verification QR/CUFE — never regenerated locally), a cierre-de-caja ticket, and a cotización ticket with a blank signature line used as a paper IOU before the customer pays later. These print to an actual receipt printer as often as to "save as PDF."
- Colombian legal/tax context throughout: DIAN, CUFE, IVA, NIT/CC identification, "Consumidor final," resoluciones de numeración — this vocabulary is load-bearing, not decoration, and must stay accurate wherever it appears in the UI.

## Capabilities and Constraints

- Stack: NestJS API + PostgreSQL, React + Vite SPA, Tailwind, TanStack Query, React Hook Form + Zod. Mobile-first, but also used on desktop for admin/back-office tasks.
- Hard constraint: Dataico's own invoice PDF (with DIAN's QR/CUFE) is never recreated or reskinned locally — any invoice-document design work stops at "surface the real PDF well," not "redesign the invoice."
- Hard constraint: this is a real, currently-operating tool for a working store — a rework must preserve every existing capability and workflow (nothing here is a mockup); "bold" cannot come at the cost of a slower or more error-prone counter transaction.
- The store's explicit, standing instruction (documented project-wide) is to keep the *product* simple — no enterprise feature depth, no functionality the store didn't ask for. This governs scope and functional complexity; it does not mean the interface must look plain — the store now wants the app rebuilt to feel and look meaningfully better, not merely "the minimum."
- Existing local enhancements beyond the Dataico integration itself: local customer address book, cotizaciones (store credit), cash-register open/close reconciliation with manual cash movements, an admin dashboard, per-employee granular permissions.

## Brand Commitments

- Name: "La Casa de los Repuestos" (store) / CasaRespuestos (internal project name).
- Existing logo asset (house-roof mark over "REPUESTOS") stays as-is — not being redesigned in this pass.
- A reddish accent tone tied to the logo is a binding part of the brand and must carry into the new visual world as its accent color — the rest of the palette, typography, and overall style are open.

## Evidence on Hand

- Real logo file: `apps/client/src/assets/logo.png`.
- Real printed output samples reviewed this session: a Dataico electronic invoice receipt (with DIAN QR/CUFE), a cierre-de-caja comprobante, and a daily sales-by-payment-method ticket — all from the store's actual prior (Sisco-era and current) printouts, useful as evidence of real field-usage receipt formats, not as the visual target for the app's own screen UI.
- No user research, personas, or usage analytics beyond what's inferable from the roles/workflows already built.

## Product Principles

1. Counter-transaction speed is sacred — the employee flow (search product → add to sale → pay → invoice) is the single most-repeated path in the whole app and must never get slower or more ambiguous for the sake of visual ambition.
2. DIAN/legal vocabulary and figures are load-bearing, not decorative — never obscure or re-style away from clarity for stylistic effect.
3. One store, not a platform — every design decision should read as built specifically for this car-parts counter, not as a generic admin-panel template with this store's name on it.
4. The real logo and its reddish accent are the one fixed anchor; everything else in the visual system can be rebuilt around them.
5. Never touch Dataico's own certified invoice PDF — that document's design is out of this app's hands by law, not by choice.

## Accessibility & Inclusion

No standard or user need beyond ordinary legibility has been established. Given real counter-floor lighting conditions and frequent one-handed phone use, treat contrast and touch-target size as load-bearing, not optional — but no formal WCAG level has been confirmed as a requirement.
