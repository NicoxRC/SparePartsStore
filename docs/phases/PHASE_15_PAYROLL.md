# Phase 15 — Nómina Electrónica (Backend)

**Status: Done** (send + query). Confirmed legal requirement — this business has formal employees and Colombia requires electronic payroll reporting for any employer with formal employees.

## Scope decision: pass-through only, not a payroll system

Confirmed directly with the human: **this app is NOT the source of truth for employees or payroll.** Salaries, accruals, and deductions are already calculated elsewhere (e.g. an accountant's own tools); this app's only job is to forward an already-computed payroll period to Dataico and keep a local record of what was sent and DIAN's response. Per the human: *"Solo enviar cifras que ya tengo en otro lado."*

This is why there is **no employee table, no normalized accrual/deduction catalog, and no payroll business-rule validation** — `employee`/`accruals`/`deductions` are stored as JSONB exactly as submitted. Building a real HR/payroll data model was explicitly out of scope.

## Confirmed reference

Three requests were shared: single create, single query, and a batch-create variant. All examples used real employee data from the human's own reference — **no real names, identification numbers, salaries, or addresses appear anywhere in this codebase or its docs; only field names/shapes and placeholder values below.**

Confirmed request shape (`POST {DATAICO_PAYROLL_BASE_URL}/payroll-entries`):

```
{
  "send_dian": true,
  "env": "PRODUCCION",
  "prefix": "N",
  "number": 1,
  "salary": 1423500,
  "periodicity": "MENSUAL",
  "initial-settlement-date": "01/10/2025",
  "final-settlement-date": "31/10/2025",
  "issue-date": "07/09/2026",
  "payment-date": "31/10/2025",
  "notes": [ { "text": "..." } ],
  "accruals": [ { "code": "BASICO", "amount": 1423500, "days": 30 } ],
  "deductions": [ { "code": "SALUD", "amount": 56940, "percentage": 4 } ],
  "employee": {
    "code": "<same as identification>",
    "identification": "...",
    "identification-type": "CEDULA_DE_CIUDADANIA",
    "first-name": "...",
    "other-names": "...",
    "last-name": "...",
    "second-last-name": "...",
    "integral-salary": false,
    "high-risk": false,
    "start-date": "01/10/2025",
    "email": "...",
    "worker-type": "DEPENDIENTE",
    "sub-code": "NO_APLICA",
    "payment-means": "TRANSFERENCIA_CREDITO_BANCARIO",
    "contract-type": "TERMINO_FIJO",
    "address": { "line": "...", "city": "<DANE code>", "department": "<DANE code>" }
  }
}
```

Query confirmed as `GET {base}/payroll-entries/{prefix}/{number}` — **path segments, not a query string**, unlike every other Dataico resource confirmed so far (invoices/POS/terceros all use `?number=`).

## Notably different from every other confirmed Dataico module

- **Mixed field-naming convention within a single payload**: `send_dian` uses an underscore, but every other multi-word field (`initial-settlement-date`, `first-name`, `integral-salary`, ...) uses a hyphen. Per the human's standing instruction (*"Usa los que estan en la documentacion... de momento lo que venga en la doc"*), implemented exactly as given — `send_dian` is the one underscore exception, not normalized to match the rest.
- **`employee.code` always equals `employee.identification`** in every example shared — implemented as an automatic derivation (`code: dto.employee.identification`) rather than a field the caller has to redundantly supply.
- **Query is path-based**, not `?number=` like invoices/POS/terceros.
- **Dates use `DD/MM/YYYY`** (confirmed, same convention as POS) — the DTOs accept ISO `YYYY-MM-DD` from the API's own callers and `PayrollService` converts before calling Dataico.
- **A batch-create variant exists** in the shared reference (multiple `employee`/accrual/deduction sets in one call) — **not implemented**. Only single-entry create was built; see "Deliberately left out."

## NOT implemented — genuinely blocked or deliberately excluded

- **Response shape — not confirmed.** No success response was ever shared for Nómina, only requests. `PayrollService` maps the same field names as the confirmed standard-invoice response (`dian_status`, `cufe`, `uuid`, `xml_url`, `pdf_url`) as a reasonable, cheap-to-fix assumption — first thing to check against a real response once one is available.
- **Batch create — not implemented.** The shared batch example submits several employees' payroll in a single call. Only the single-entry endpoint was built for this phase; revisit if submitting one employee at a time in the UI turns out to be too slow for a full payroll run.
- **No resend action.** Only create + refresh-status are implemented, matching what was actually confirmed; resend wasn't part of what was shared for this module.
- **No employee/HR data model.** Deliberate, see "Scope decision" above — every `create` call re-submits the full employee object; nothing is looked up from a stored employee record.

## What shipped

- [x] `payroll_entries` table (see `docs/DATABASE.md`) — `employee_payload`/`accruals`/`deductions` stored as JSONB, only `employee_identification`/`employee_name` promoted to real columns for listing.
- [x] `PayrollService.create()`: builds the confirmed payload (including the `send_dian` exception and `employee.code` auto-derivation), submits it, persists the record only after Dataico accepts, strips the giant base64 `xml` field from the stored response.
- [x] `PayrollService.refreshStatus()`: `GET /payroll-entries/{prefix}/{number}`.
- [x] `POST`/`GET /api/invoicing/payroll-entries`, `GET /api/invoicing/payroll-entries/:id`, `POST /api/invoicing/payroll-entries/:id/refresh` — **admin-only**, unlike invoices/POS (admin + employee). Payroll is compensation data, not an everyday counter-sale action.
- [x] `DataicoConfig.payrollBaseUrl` getter, backed by `DATAICO_PAYROLL_BASE_URL` (same host as standard invoicing, different API path — `payroll-api` not `dataico_api`).
- [x] Unit tests covering the confirmed payload shape (including the `send_dian`/hyphen mix and `employee.code` derivation) and the path-based refresh URL.

## Deliberately left out (keep it simple)

- **Batch submission** — see above.
- **Any payroll business-rule validation** (correct accrual/deduction codes for the period, statutory minimums, etc.) — this app forwards figures already computed elsewhere; validating payroll law is explicitly not this app's job per the scope decision above.

## Related documents

- `docs/PROJECT_ROADMAP.md` (Phase 15), `docs/DATABASE.md` ("payroll_entries"), `docs/GLOSSARY.md`, `docs/ENVIRONMENT_VARIABLES.md`
