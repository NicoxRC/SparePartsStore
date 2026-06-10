---
name: workflow-preferences
description: When the user authorizes skipping the Architect step and how to proceed in that case
metadata:
  type: feedback
---

The project's normal workflow (per CLAUDE.md) is Architect-first: Architect
produces `docs/Schema.md` / `docs/ApiContract.md`, then Backend implements.

The user can explicitly waive this for a specific module ("Solo implementa,
yo me encargo de revisar que funcione" — just implement it, I'll review/test
it myself). When this happens:

- Skip asking the Architect / skip asking the user for schema confirmation.
- Still strictly follow the conventions already established in
  `docs/Schema.md` and `docs/ApiContract.md` (audit columns, soft delete,
  partial unique indexes, `{data, meta}` pagination envelope, RBAC via
  `@Roles()`, response DTOs with `fromEntity`, etc.) and mirror the existing
  `users`/`auth` modules for structure.
- Do NOT run migrations against the DB, do NOT start the dev server, do NOT
  run e2e tests — only lint + build (`npx tsc -p tsconfig.build.json` or
  `npm run build`) to confirm it compiles. The user runs/tests everything
  themselves.
- If `tsconfig.build.tsbuildinfo` / `tsconfig.tsbuildinfo` / `dist/` are stale
  (empty dist after build), delete them and rebuild.

See [[products-module]] for the first module implemented this way.
