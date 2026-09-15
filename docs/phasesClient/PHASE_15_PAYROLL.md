# Phase 15 — Nómina Electrónica (Frontend)

**Status: Done, currently hidden from the nav (see below).** Confirmed legal requirement — this store has formal employees.

**As of 2026-09-15**: the "Nómina electrónica" nav entry was removed from `AuthenticatedLayout` — not in active use for now, but expected back per the human. Everything below is still in the codebase and reachable at its route; only the nav link is gone. Re-enabling is just adding the nav entry back.

## What shipped

- **`PayrollListPage`** (`/invoicing/payroll-entries`, **admin-only**) — table of submitted payroll periods, DIAN status badge, "Consultar" action per row (no "Reenviar" — not implemented on the backend for this module).
- **`PayrollFormPage`** (`/invoicing/payroll-entries/new`, admin-only) — dynamic accrual/deduction line-item lists (`useFieldArray`), full employee fields entered per submission (no employee picker or stored employee record — this app keeps no HR data, per the confirmed backend scope). An in-form banner reminds admins that figures are computed elsewhere and just forwarded here.
- Fields with only one confirmed value so far (`identificationType`, `workerType`, `subCode`, `paymentMeans`, `contractType`, `periodicity`) are rendered as single-option selects.
- `services/payroll.ts` + `hooks/usePayroll.ts`.

## Deliberately left out (keep it simple)

- No batch submission UI — matches the backend (single-entry create only, see the backend phase doc).
- No "Reenviar" action — not available on the backend for this module.
- No employee autocomplete/lookup — there is no employee table to search against.

## Related documents

- `docs/phases/PHASE_15_PAYROLL.md`
