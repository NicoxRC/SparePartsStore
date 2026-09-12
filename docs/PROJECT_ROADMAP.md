# Project Roadmap

High-level development phases for CasaRespuestos. Answers "what comes before what" — not a sprint plan, not a fixed time box. There's no external tracker; a phase here is the unit of tracking (see `CONTRIBUTING.md`).

## Design philosophy — keep it simple

The client is a small car spare-parts store, not an enterprise, and has explicitly asked for the app to stay simple and fast — see `CLAUDE.md`. Dataico's API surface (8 modules, DIAN compliance, tax/retention/charge line items) makes it easy to over-build far past what a small store's actual counter-sale workflow needs. Every phase below should be scoped to what this specific store needs, not to "complete coverage" of what Dataico's API can do — see each phase's own notes for what's deliberately left out.

## How to read this roadmap

Phases 1–6 are **already built** — documented here retrospectively so the roadmap reflects reality, with a phase brief in `docs/phases/` for each. Phase 7 onward is the **invoicing pivot**: CasaRespuestos moving from inventory-only to inventory + Dataico-based electronic invoicing. Each invoicing phase corresponds to one of the 8 Dataico Postman collections shared with this project, and its `docs/phases/PHASE_N_....md` brief stays a high-level goal only until that module's API reference is actually shared — see `CLAUDE.md`.

---

## Phase 1 — Foundation

**Done.** Repository structure, Docker Compose for local PostgreSQL, NestJS scaffolded (TypeORM connection, global `ValidationPipe`, `/api` prefix), React + Vite scaffolded (routing, Tailwind, TanStack Query). See `docs/phases/PHASE_1_FOUNDATION.md`.

## Phase 2 — Auth, users, and roles

**Done.** JWT access+refresh auth, `User` entity, three roles (`admin`/`employee`/`auditor` — auditor added slightly later), forced password change on account creation/reset, self-protection rules (can't deactivate/demote/delete your own account). See `docs/phases/PHASE_2_AUTH_USERS.md`.

## Phase 3 — Product classification (Departamento / Grupo / Marca)

**Done.** Three required lookup catalogs a product must reference, migrated off the original free-text/varchar columns, legacy SICAF codes preserved and now server-generated for new entries. See `docs/phases/PHASE_3_PRODUCT_CLASSIFICATION.md`.

## Phase 4 — Products

**Done.** Full CRUD, reverse cost-from-sale-price calculation (normal/neto), reference uniqueness check, barcode scanner writing into the reference field. See `docs/phases/PHASE_4_PRODUCTS.md`.

## Phase 5 — Inventory movements

**Done.** Append-only, signed stock movements (auto-derived purchase/adjustment type), transactional stock update, insufficient-stock rejection, movement history view. See `docs/phases/PHASE_5_INVENTORY.md`.

## Phase 6 — Sisco Excel export

**Done, and now being retired** (see Phase 14). `.xlsx` export matching the legacy SICAF/Sisco `ARTICULOS` import format. See `docs/phases/PHASE_6_SISCO_EXPORT.md`.

---

## Phase 7 — Dataico foundation

Shared plumbing every invoicing phase depends on, so it's built once instead of per-module: `invoicing/dataico/dataico-client.service.ts` (authenticated HTTP client), typed config via `ConfigService`, and — since the invoicing phases add a lot of new surface area worth documenting properly from day one — a global exception filter and `@nestjs/swagger` setup for the whole API (see `ARCHITECTURE.md`'s "Response format" note). Auth mechanics (API key vs. OAuth vs. something else) depend on Dataico's actual docs — see `docs/phases/PHASE_7_DATAICO_FOUNDATION.md`.

**Exit criteria:** a shared, tested Dataico client exists that every subsequent invoicing module can inject rather than re-implement; every new endpoint from this point on is Swagger-documented.

## Phase 8 — DIAN resolutions (Actualizar o vincular resoluciones)

**Done.** Corresponds to Dataico's "8. Actualizar o vincular resoluciones" collection. Built **before** the invoicing phase itself, deliberately — a business can't legally send an invoice without an active DIAN numbering resolution on file (see `GLOSSARY.md`). See `docs/phases/PHASE_8_RESOLUTIONS.md`.

**Exit criteria (met):** an admin can view/associate the DIAN resolution(s) this business is authorized to invoice under.

## Phase 9 — Consulta DIAN Terceros

**Backend done; frontend integration point is Phase 10.** Corresponds to Dataico's "7. Consulta DIAN Terceros" collection — third-party (customer) lookup/validation, used to fill in correct legal identification data before issuing an invoice against a customer. See `docs/phases/PHASE_9_THIRD_PARTIES.md`.

**Exit criteria:** a customer's legal ID data can be looked up/validated from the invoice-creation flow instead of hand-typed and hoped-correct. *(Lookup endpoint ready; wiring it into the invoice form happens as part of Phase 10.)*

## Phase 10 — Factura electrónica estándar (core invoicing)

**Send, resend, and query done. Credit/debit notes blocked/deferred** — see `docs/phases/PHASE_10_INVOICING_STANDARD.md`. The centerpiece of the pivot. Corresponds to Dataico's "1. Factura electrónica estándar" collection ("Estructura básica" variant — see `CLAUDE.md`'s "keep it simple").

**Exit criteria:** an invoice can be created against a sale, sent to Dataico, validated by DIAN, with its CUFE/status retrieved and re-checkable on demand, a failed send/email retriable without duplicating the document *(met — also decrements stock automatically)* — plus credit/debit notes issued against an already-sent invoice *(blocked: the only shared credit-note example is contaminated with health-sector fields; debit note deferred alongside it by choice)*.

## Phase 11 — Eventos de recepción — **out of scope, confirmed with the human**

Corresponds to Dataico's "6. Eventos de recepción" collection. Turned out, once its real request list was seen (Acuse de recibido, Aceptación Tácita/Expresa, Rechazo, Recibido de prestación), to be entirely about acting as the **receiving** party of an invoice — acknowledging/accepting/rejecting a bill a *supplier* sends this store — not a status-callback mechanism for invoices this store issues. Confirmed with the human this isn't a current need (Phase 10's "Consulta Factura" already covers checking this store's own issued-invoice status). See `docs/phases/PHASE_11_RECEPTION_EVENTS.md`.

## Phase 12 — POS Electrónico — **Done** (send + query)

Corresponds to Dataico's "3. POS Electrónico" collection. **Confirmed as this store's primary sale flow** — most sales are counter sales, so this is the document type staff use most, ahead of Phase 10's full invoice form in the nav. See `docs/phases/PHASE_12_POS.md` — reference confirmed only against staging/gamma test environments, no production URL yet; response shape unconfirmed (mapped as a documented assumption).

**Exit criteria:** a counter sale can be issued as a POS Electrónico document, as fast or faster than the full-invoice flow *(met, pending confirmation against a real Dataico response once available)*.

## Phase 13 — Documento soporte

Corresponds to Dataico's "4. Documento soporte" collection — self-issued document for purchases from suppliers not obligated to invoice electronically. **Still pending confirmation** of how often this business actually buys from informal suppliers — the human wasn't sure when asked. See `docs/phases/PHASE_13_SUPPORT_DOCUMENTS.md`.

## Phase 14 — Retire Sisco export

Once Phase 10 (or whichever invoicing phase first reaches production use) is live and trusted, remove the `export` module (`GET /export/articulos` and `ExportService`) and its Sisco-format `.xlsx` generation entirely — confirmed with the human as the intended end state (see the "Sisco" decision recorded in `GLOSSARY.md`). Don't remove it opportunistically as a "cleanup" inside an unrelated phase; this is its own deliberate phase so there's a clear point where Sisco was still the fallback and a clear point where it wasn't.

**Exit criteria:** `export` module deleted, its route gone, `docs/ARCHITECTURE.md`/`DATABASE.md` updated to drop references to it as current, not just historical.

## Phase 15 — Nómina Electrónica — **Done** (send + query)

Corresponds to Dataico's "5. Nómina Electrónica" collection. **Reclassified from "out of scope" after asking the human directly**: this store has formal employees, and DIAN requires electronic payroll reporting for any business with formal employees — this isn't a nice-to-have, it's a compliance obligation independent of the customer-facing invoicing pivot. Confirmed scope: this app is a pass-through only (submits already-calculated figures), not the source of truth for payroll. See `docs/phases/PHASE_15_PAYROLL.md`.

**Exit criteria:** this store's payroll can be reported to DIAN electronically through Dataico, meeting the legal requirement. *(met — batch submission and resend deliberately deferred, see the phase doc)*

---

## Guiding principle for what else might belong here

Per the human directly: **the goal of this pivot isn't "the minimum to invoice," it's every Dataico service this specific business actually needs** — the phases above got re-evaluated once framed that way (POS and Nómina both moved from "maybe" to "confirmed needed"). When a new Dataico collection's relevance is unclear, ask directly rather than defaulting to "probably not needed" — see how Phase 12/15 flipped once asked plainly. "Keep it simple" (`CLAUDE.md`) still governs *how* each confirmed-needed phase gets built (no unneeded variants/fields), it's not a reason to leave a real need unbuilt.

## Explicitly out of scope for now

| Item | Why deferred |
|---|---|
| Factura electrónica — sector salud (Dataico collection 2) | Healthcare-sector billing fields; this is a spare parts store, not a healthcare provider. |
| Eventos de recepción (Dataico collection 6, Phase 11) | Only relevant for acknowledging invoices *received from suppliers* — confirmed with the human this isn't a current need. |
| CI/CD pipeline | Not set up; manual deployment acceptable at current scale (see `DEFINITION_OF_DONE.md`). |
| End-to-end / integration tests | Unit tests on services are the current bar (see `TESTING.md`). |
| Fixed test coverage thresholds | Deliberately not enforced — see `TESTING.md`. |

## Related documents

- `DATABASE.md` — the data model each phase builds against
- `ARCHITECTURE.md` — technical structure supporting these phases
- `GLOSSARY.md` — business/Dataico/DIAN terms referenced throughout
- `docs/phases/`, `docs/phasesClient/` — per-phase scope briefs
