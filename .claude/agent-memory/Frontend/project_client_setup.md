---
name: project-client-setup
description: How apps/client (React+Vite) was scaffolded — Tailwind v4 plugin setup, strict TS, folder structure conventions
metadata:
  type: project
---

`apps/client` was a bare Vite+React 19 scaffold (no Tailwind, no router, no HTTP
client) as of 2026-06-09. First implementation pass added the full frontend
foundation (Tailwind, routing, auth, products module).

**Tailwind version:** v4.x — configured via `@tailwindcss/vite` plugin in
`vite.config.ts` (not the old `tailwind.config.js` + postcss approach). CSS
entry is `src/index.css` with just `@import 'tailwindcss';`, imported from
`main.tsx`.

**TypeScript strict mode:** `tsconfig.app.json` did NOT have `"strict": true`
by default in the Vite scaffold — added it explicitly per CLAUDE.md's "no any"
requirement. Build (`tsc -b && vite build`) and `npm run lint` both pass clean.

**Folder structure** (under `src/`): `pages/`, `components/`, `layouts/`,
`hooks/`, `services/`, `lib/` (incl. `lib/schemas/` for Zod), and a
`context/` dir added for the AuthContext (split into `auth-context.ts` for
the context object/types and `AuthContext.tsx` for the provider component —
required by `react-refresh/only-export-components` ESLint rule, which fails
the build if a file mixes component exports with non-component exports like
hooks or context objects).

**Why:** Keeping fast-refresh-clean exports (one component per file, hooks/
contexts in separate files) avoids ESLint errors under this project's
`eslint-plugin-react-refresh` config. Apply this pattern to any future
context/provider work.

See [[project-auth-contract]] for the auth flow and products API shapes used.
