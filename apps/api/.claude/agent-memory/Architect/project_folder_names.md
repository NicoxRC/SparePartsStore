---
name: project-folder-names
description: Actual monorepo folder names differ from what Requirements.md says — api/ not backend/, client/ not frontend/
metadata:
  type: project
---

The scaffolded folder names are `apps/api/` (NestJS) and `apps/client/` (React + Vite).

The Requirements doc (`docs/Requirements.md`) and earlier CLAUDE.md drafts say `backend/` and `frontend/` — those names are wrong and have been corrected in CLAUDE.md.

**Why:** Folders were scaffolded with `api` and `client` before the docs were finalized. Renaming was evaluated and rejected because it would require touching package.json `name` fields, tsconfig paths, any CI references, and all agent documentation — with no functional benefit.

**How to apply:** Always use `apps/api/` for backend paths and `apps/client/` for frontend paths. Never reference `apps/backend/` or `apps/frontend/`.
