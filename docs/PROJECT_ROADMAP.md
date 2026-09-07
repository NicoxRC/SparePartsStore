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

Corresponds to Dataico's "8. Actualizar o vincular resoluciones" collection. Built **before** the invoicing phase itself, deliberately — a business can't legally send an invoice without an active DIAN numbering resolution on file (see `GLOSSARY.md`). See `docs/phases/PHASE_8_RESOLUTIONS.md` — pending that module's shared reference.

**Exit criteria:** an admin can view/associate the DIAN resolution(s) this business is authorized to invoice under.

## Phase 9 — Consulta DIAN Terceros

Corresponds to Dataico's "7. Consulta DIAN Terceros" collection — third-party (customer) lookup/validation, used to fill in correct legal identification data before issuing an invoice against a customer. See `docs/phases/PHASE_9_THIRD_PARTIES.md` — pending reference.

**Exit criteria:** a customer's legal ID data can be looked up/validated from the invoice-creation flow instead of hand-typed and hoped-correct.

## Phase 10 — Factura electrónica estándar (core invoicing)

The centerpiece of the pivot. Corresponds to Dataico's "1. Factura electrónica estándar" collection: send invoice, resend invoice, query invoice, credit note, debit note. See `docs/phases/PHASE_10_INVOICING_STANDARD.md` — pending reference for exact payload/response shapes.

**Exit criteria:** an invoice can be created against a sale, sent to Dataico, validated by DIAN, and its CUFE/status retrieved — plus credit/debit notes issued against an already-sent invoice.

## Phase 11 — Eventos de recepción (status/reception events)

Corresponds to Dataico's "6. Eventos de recepción" collection — very likely this integration's status-callback mechanism (accepted/rejected by DIAN, etc.). See `docs/phases/PHASE_11_RECEPTION_EVENTS.md` — pending reference for whether this is a webhook this API must expose, or a query this API polls.

**Exit criteria:** an invoice's real DIAN status is reflected in this system without the admin having to check Dataico's own portal manually.

## Phase 12 — POS Electrónico

Corresponds to Dataico's "3. POS Electrónico" collection — a lighter document type that may fit this store's day-to-day counter sales better than a full invoice. **Priority pending a decision with the human** on whether counter sales should use this instead of (or alongside) Phase 10's full invoice flow. See `docs/phases/PHASE_12_POS.md`.

## Phase 13 — Documento soporte

Corresponds to Dataico's "4. Documento soporte" collection — self-issued document for purchases from suppliers not obligated to invoice electronically. **Priority pending confirmation** of how often this business actually buys from informal suppliers. See `docs/phases/PHASE_13_SUPPORT_DOCUMENTS.md`.

## Phase 14 — Retire Sisco export

Once Phase 10 (or whichever invoicing phase first reaches production use) is live and trusted, remove the `export` module (`GET /export/articulos` and `ExportService`) and its Sisco-format `.xlsx` generation entirely — confirmed with the human as the intended end state (see the "Sisco" decision recorded in `GLOSSARY.md`). Don't remove it opportunistically as a "cleanup" inside an unrelated phase; this is its own deliberate phase so there's a clear point where Sisco was still the fallback and a clear point where it wasn't.

**Exit criteria:** `export` module deleted, its route gone, `docs/ARCHITECTURE.md`/`DATABASE.md` updated to drop references to it as current, not just historical.

---

## Explicitly out of scope for now

| Item | Why deferred |
|---|---|
| Nómina Electrónica (Dataico collection 5) | Payroll reporting, unrelated to this store's customer-facing invoicing pivot. Revisit only if the business explicitly asks for it. |
| Factura electrónica — sector salud (Dataico collection 2) | Healthcare-sector billing fields; this is a spare parts store, not a healthcare provider. |
| CI/CD pipeline | Not set up; manual deployment acceptable at current scale (see `DEFINITION_OF_DONE.md`). |
| End-to-end / integration tests | Unit tests on services are the current bar (see `TESTING.md`). |
| Fixed test coverage thresholds | Deliberately not enforced — see `TESTING.md`. |

## Related documents

- `DATABASE.md` — the data model each phase builds against
- `ARCHITECTURE.md` — technical structure supporting these phases
- `GLOSSARY.md` — business/Dataico/DIAN terms referenced throughout
- `docs/phases/`, `docs/phasesClient/` — per-phase scope briefs
