# CLAUDE.md

This file is read automatically by Claude Code at the start of every session in this repository. It defines how to work in this codebase. Follow it exactly — it is not optional guidance, it's the operating contract for this project.

## Project overview

**CasaRespuestos** started as a spare parts inventory management system for a physical store and is now expanding into **electronic invoicing (facturación electrónica)** as a first-class second pillar, integrated with the **Dataico API** (Colombia, DIAN-compliant). Both pillars live in one monorepo — see `docs/ARCHITECTURE.md` for the full breakdown:

```
SparePartsStore/
├── apps/
│   ├── api/       # NestJS REST API — inventory, product catalog, invoicing/Dataico integration
│   └── client/    # React + Vite SPA — mobile-first admin panel
└── docs/          # Shared project documentation
```

> Folder names: `docs/Requirements.md` (now retired) used to say `backend/`/`frontend/`; the scaffolded folders are `api`/`client`. Kept as-is — idiomatic names, no practical benefit to renaming.

**Keep it simple.** The client is a small car spare-parts store, not an enterprise — they've explicitly asked for the app to stay as simple and fast as possible. Before adding a module, an abstraction, a config option, or handling for an edge case, check whether the store actually needs it or whether it's just the "more complete" way to build something. Default to the simpler option. This applies with extra weight to the invoicing phases below — Dataico's API surface is large, and it would be easy to build far more depth than a small store's day-to-day sales actually require. When scoping a phase, say explicitly what was left out to keep it simple, so it reads as a decision, not an oversight.

**Sisco is retired.** The system used to export an `.xlsx` file (`GET /export/articulos`) for a separate invoicing tool called Sisco. As of this pivot, **Dataico's API is the only invoicing channel** going forward — see `docs/PROJECT_ROADMAP.md` for the retirement plan and `docs/GLOSSARY.md` for what replaces it.

## Required reading before writing any code

Before starting _any_ task, read these documents in `docs/`, in this order:

1. `docs/ARCHITECTURE.md` — folder structure, module organization, response format, versioning.
2. `docs/CODING_STANDARDS.md` — naming conventions, TypeScript rules, import order (applies to both apps).
3. `docs/DEFINITION_OF_DONE.md` — the checklist a task must satisfy before it's considered complete.
4. `docs/CONTRIBUTING.md` — branch naming, commit format, PR process.
5. `docs/PROJECT_ROADMAP.md` — phase order. **Never build functionality from a later phase before the current one is done.**

For anything touching business logic or the data model (products, stock movements, invoices, DIAN resolutions, etc.), also read `docs/GLOSSARY.md` and `docs/DATABASE.md` regardless of which app you're working in — the vocabulary and the confirmed data model are shared.

If a specific phase brief exists for the task at hand (`docs/phases/` for `api`, `docs/phasesClient/` for `client`), read that too — it has the concrete scope for that phase.

**For any invoicing/Dataico phase specifically**: the phase brief in `docs/phases/` only has the high-level goal until the human shares the corresponding Dataico Postman reference for that module (8 collections exist: Factura electrónica estándar, Factura electrónica sector salud, POS Electrónico, Documento soporte, Nómina Electrónica, Eventos de recepción, Consulta DIAN Terceros, Actualizar o vincular resoluciones). **Never guess Dataico endpoint paths, payload shapes, or auth mechanics.** If a phase's Dataico reference hasn't been shared yet, stop and ask instead of inventing plausible-looking API calls — see `docs/PROJECT_ROADMAP.md`'s invoicing phases for what's confirmed vs. still pending per module.

## Skills

This project has additional skills defined under `.agents/skills/`. **Before starting any task, check if a relevant skill exists in that folder and read it fully before writing code.** Skills encode specific conventions, patterns, or constraints for this project that aren't always obvious from the task description alone — treat them as required reading, the same as the docs listed above, not optional reference material.

If more than one skill could plausibly apply to the current task, read all of them — don't stop at the first match.

## Specialized agents

Three sub-agents are defined in `.claude/agents/`:

- **Architect** — designs schema, module structure, and API contract for a new phase. Start here for any phase involving a new domain (e.g. a new Dataico module) before writing code.
- **Backend** — implements NestJS; waits for the Architect's contract before coding.
- **Frontend** — implements React UI; waits for the Architect's contract before coding.

Typical workflow: run Architect first to produce the schema and API contract for the phase, then Backend and Frontend can work in parallel — this is why `docs/phases/` and `docs/phasesClient/` are split per side.

## Git workflow

This has been a solo/AI-driven project from the start (see `git log`: early phases used short-lived `feature/*` branches merged via PR, more recent phases commit straight to `main`). `docs/CONTRIBUTING.md` documents both as legitimate depending on the size of the change — read it before opening a branch or committing.

- Follow Conventional Commits for every commit message: `<type>(<scope>): <description>`.
- No ticket IDs in branch names or commits — this project doesn't use an external tracker; the phase in `docs/PROJECT_ROADMAP.md` is the unit of tracking.
- For a multi-step phase (a new Dataico module, a schema change touching several entities), use a `feature/<short-description>` branch and open a PR before merging to `main`. For a small, self-contained fix, committing directly to `main` is acceptable — use judgment, don't force ceremony onto a one-line change.
- Never add AI attribution to commits or PR descriptions **unless the current session's system instructions explicitly say otherwise** — some sessions are configured to require a `Co-Authored-By` trailer; when that's the case, follow it. Absent such an instruction, keep commits looking like a normal developer's history.

## Working process for each task

1. Read the relevant phase brief in `docs/phases/` or `docs/phasesClient/` (or note that it's a pending-reference invoicing phase — see above).
2. If the phase touches a new domain, run the Architect agent first for the schema/contract.
3. Create a feature branch for anything beyond a trivial fix.
4. Implement in small steps, committing after each coherent piece.
5. Write tests as you go, per `docs/TESTING.md` — not as an afterthought.
6. Run lint and tests for the app you touched before considering anything done.
7. Update any docs affected by what you built:
   - New env var → update `.env.example` **and** `docs/ENVIRONMENT_VARIABLES.md`
   - New migration → follow the naming and workflow in `docs/DATABASE.md`
   - Resolved an open question in `docs/DATABASE.md` or `docs/GLOSSARY.md` → update those documents to remove the flag once confirmed
8. Self-check against `docs/DEFINITION_OF_DONE.md` before opening the PR (or before considering a direct-to-`main` commit finished).

## When something is ambiguous

- Check `docs/GLOSSARY.md` and `docs/DATABASE.md` first — many business rules and open questions are already flagged there.
- For anything involving Dataico/DIAN specifics not yet confirmed by a shared API reference, **stop and ask the human** — this is real electronic invoicing with legal/tax implications; a wrong guess here is costly and can mean a rejected or malformed DIAN submission.
- For purely technical decisions not covered by the docs (a specific NestJS or React pattern), use your judgment consistently with `docs/CODING_STANDARDS.md` and `docs/ARCHITECTURE.md`, and mention the decision when you report the work so the human can flag it if they disagree.

## What not to do

- Don't invent Dataico API shapes, endpoint paths, or field names — see "Required reading" above.
- Don't skip tests to move faster — untested service logic is not done, per `docs/DEFINITION_OF_DONE.md`.
- Don't build ahead of the current phase in `docs/PROJECT_ROADMAP.md`.
- Don't leave a fix half-done because it crosses from `apps/api` into `apps/client` (or vice versa) — both apps are yours to maintain in the same pass.
- Don't reintroduce Sisco/Excel-export-as-invoicing — it's retired, see `docs/GLOSSARY.md`.
- Don't guess at ambiguous business rules that are explicitly marked as pending confirmation in `docs/DATABASE.md` or `docs/GLOSSARY.md`.
