# Phase 8 — DIAN resolutions (Backend)

**Status: Done.**

## Goal

A business can't legally send an electronic invoice without an active DIAN numbering resolution on file (see `docs/GLOSSARY.md`). Get this on file before any invoice-sending phase, not after.

## Confirmed — two separate endpoints, one per document type

```
POST https://api.dataico.com/direct/dataico_api/v2/numberings/sync_dian/support_docs   # Documento soporte
POST https://api.dataico.com/direct/dataico_api/v2/numberings/sync_dian/invoice        # Factura electrónica
Content-Type: application/json
Auth-token: <DATAICO_AUTH_TOKEN>
```

**Field-naming note, recorded as given, not "fixed":** the two document types use genuinely different field-naming conventions in the shared reference — `support_docs` uses snake_case (`code_msg`, `start_date`, `end_date`), `invoice` uses kebab-case (`code-msg`, `start-date`, `end-date`) plus an invoice-only `technical-key` field. This looked like it could be a Postman placeholder artifact (see the git history of this doc for the original analysis), but per explicit instruction from the human, both are implemented exactly as documented rather than normalized to one convention. **If Dataico rejects the `invoice` numbering sync in practice, this is the first thing to revisit** — see `ResolutionsService.buildDataicoBody()`.

## What shipped

- [x] `invoicing/resolutions/` module: `DianResolution` entity + migration (`dian_resolutions` table, append-only — see `docs/DATABASE.md`), `ResolutionsService`, `ResolutionsController`, all depending on `DataicoClientService` (Phase 7) via a new dedicated `DataicoModule` (split out from `InvoicingModule` to avoid a circular import — see `docs/ARCHITECTURE.md`).
- [x] `POST /api/invoicing/resolutions` (ADMIN) — builds the correct Dataico body per `documentType`, calls Dataico, and **only persists locally once Dataico accepts it** (a rejected sync never gets recorded as "on file").
- [x] `GET /api/invoicing/resolutions` (ADMIN) — paginated history, most recent first, optional `documentType` filter.
- [x] Swagger-documented, unit tests covering both document types' payload shape, and that a Dataico rejection prevents local persistence.
- [x] Frontend: `ResolutionsListPage` (table) + `ResolutionFormPage` (create-only — resolutions are never edited, only superseded by a new sync) under `/invoicing/resolutions`, admin-only, linked from the sidebar as "Resoluciones". See `docs/phasesClient/PHASE_8_RESOLUTIONS.md`.

## Deliberately left out (keep it simple — see `CLAUDE.md`)

- No edit/delete UI or endpoint for a resolution — matches the append-only backend model; a correction is a new sync, not an edit.
- `subtype` is **fixed to `ELECTRONICO`** (decided later by the human: "siempre electrónico") — no longer a user-entered field; the column stays for the active-resolution lookup. The **code message** input was removed from the form, but Dataico's `code-msg` (`code_msg` for support docs) is still sent — as a fixed constant, `RESOLUTION_CODE_MESSAGE` in `resolutions/resolution.constants.ts` ("Resolución agregada correctamente", the text of the shared reference's example) — so nothing is asked or stored and the `resolution_code_message` column was dropped (migration 30). Change the constant if Dataico wants a different text.
- No "active resolution" endpoint/flag — the frontend just shows the list newest-first; Phase 10 can decide how it picks "the" active resolution when that phase starts.

## Exit criteria (met)

An admin can see which DIAN resolution(s) this business is currently authorized to invoice under, and a resolution can be associated/updated through the app rather than only through Dataico's own portal.

## Related documents

- `docs/phasesClient/PHASE_8_RESOLUTIONS.md`, `docs/GLOSSARY.md` ("Resolución DIAN"), `docs/DATABASE.md` (`dian_resolutions`), `docs/phases/PHASE_10_INVOICING_STANDARD.md` (the confirmed invoice payload's `numbering` block, which this phase's data feeds)
