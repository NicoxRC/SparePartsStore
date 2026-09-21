# Phase 8 — DIAN resolutions (Frontend)

**Status: Done.**

## Goal

Give an admin visibility into which DIAN resolution(s) this business can currently invoice under, without needing to open Dataico's own portal.

## What shipped

- `ResolutionsListPage` (`/invoicing/resolutions`) — a simple table (type, prefix, resolution number, range, validity), newest first, paginated with the existing `Pagination` component. A table, not a card grid, since this data is dense and this is a low-frequency admin screen — consistent with `CLAUDE.md`'s "keep it simple" note.
- `ResolutionFormPage` (`/invoicing/resolutions/new`) — create-only form (documentType select, prefix, resolution code, resolution number, numeric range, dates). No edit form — matches the backend's append-only model.
- `services/resolutions.ts` + `hooks/useResolutions.ts` follow the existing service/hook pattern.
- `lib/schemas/resolution.ts` — Zod schema, including a range validation (`rangeEnd >= rangeStart`).
- Added to the admin sidebar/bottom-nav as "Resoluciones" (🧾), alongside Usuarios/Catálogos.

## Deliberately left out (keep it simple)

- No edit/delete UI — a resolution is superseded by creating a new one, matching the backend.
- No dedicated "Facturación" nav section yet — a single direct nav item is enough for one sub-feature; revisit once Phase 10 adds more invoicing screens.

## Related documents

- `docs/phases/PHASE_8_RESOLUTIONS.md`

## Follow-up

The form no longer has a **Subtipo** field (always `ELECTRONICO`, set by the API) nor a **Mensaje del código** field (the API still sends Dataico's `code-msg` as a fixed text), and the list dropped its Subtipo column.
The **Clave técnica** field was removed as well.
