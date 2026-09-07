# Phase 15 — Nómina Electrónica (Backend)

**Status: Confirmed needed — legal requirement. Awaiting the "5. Nómina Electrónica" Dataico reference.**

## Goal

Report this store's payroll to DIAN electronically through Dataico. Unlike most of this roadmap, this isn't a customer-facing convenience — it's a compliance obligation: **this business has formal employees, and Colombia requires electronic payroll reporting for any employer with formal employees.** Confirmed directly with the human (see `docs/PROJECT_ROADMAP.md`'s "Guiding principle" note — this phase was originally marked out of scope on the wrong assumption that it was payroll-reporting-in-general and unrelated to the invoicing pivot, corrected once asked plainly).

## Blocked on

The "5. Nómina Electrónica" collection's request/response reference hasn't been shared yet. This is likely a substantial payload (payroll periods, employee identification, earnings/deductions breakdown, social security contributions) — do not guess any of it.

## Before scoping this phase

This app currently has **no employee/payroll data model at all** — `User` entities are system/login accounts (admin, employee, auditor roles), not a payroll record (salary, contract type, social security affiliations, etc.). Scoping this phase needs to also answer: does this app become the source of truth for payroll data, or does it just submit payroll figures that are computed/tracked elsewhere (e.g. an accountant's own system) to Dataico? That's a real product-scope question for the human, not just a technical one — don't assume "build a full payroll module" without confirming that's actually wanted, per `CLAUDE.md`'s "keep it simple."

## Scope (firms up once the reference and the above are confirmed)

- [ ] `invoicing/payroll/` module
- [ ] Data model for whatever this app needs to track to submit a payroll period (pending the scope question above)
- [ ] Whatever request/response Dataico's collection defines

## Related documents

- `docs/PROJECT_ROADMAP.md` (Phase 15), `docs/GLOSSARY.md`
