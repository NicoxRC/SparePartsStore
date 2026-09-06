# Phase 8 — DIAN resolutions (Frontend)

**Status: Pending — waits for the backend contract from `docs/phases/PHASE_8_RESOLUTIONS.md`.**

## Goal

Give an admin visibility into which DIAN resolution(s) this business can currently invoice under, without needing to open Dataico's own portal.

## Scope (high-level — firms up once the backend contract exists)

- [ ] A read view (likely under `Catálogos` or a new top-level "Facturación" section — decide once more invoicing pages exist) showing the active resolution(s): number range, validity window, document type, remaining numbers if Dataico exposes that
- [ ] A form to associate/update a resolution, admin-only
- [ ] `services/resolutions.ts` + `hooks/useResolutions.ts` following the existing service/hook pattern (see `docs/ARCHITECTURE.md`)

## Related documents

- `docs/phases/PHASE_8_RESOLUTIONS.md`, `docs/CODING_STANDARDS.md`
