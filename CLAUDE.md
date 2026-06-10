# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CasaRespuestos** — a spare parts inventory management system for a physical store. Staff load and manage inventory from mobile devices. The system exports Excel files formatted for **Sisco** (external invoicing software). This replaces a previous CRA + unstructured backend.

Full requirements: `docs/Requirements.md`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS + TypeORM + PostgreSQL |
| Frontend | React + Vite + Tailwind CSS |
| Auth | Passport.js + JWT (access + refresh tokens) |
| Forms | React Hook Form + Zod (FE) / class-validator (BE) |
| Server state | TanStack Query |
| HTTP | Axios |
| Excel export | exceljs (backend only) |
| Deploy | Railway (backend + DB), Vercel (frontend) |

---

## Monorepo Structure

```
apps/
  api/       # NestJS backend (note: docs/Requirements.md says "backend/" — actual folder is "api/")
  client/    # React + Vite frontend (note: docs/Requirements.md says "frontend/" — actual folder is "client/")
docs/        # Requirements and schema docs
docker-compose.yml  # PostgreSQL 16 only; API and client run locally in dev
```

> The Requirements doc uses `backend/` and `frontend/` but the scaffolded folders are `api/` and `client/`.
> These names were kept: `api` is idiomatic for NestJS REST services and `client` is standard for React apps.
> Renaming would add churn for no practical benefit.

## Backend Commands (run inside `apps/api/`)

```bash
npm run start:dev       # dev server with watch
npm run build           # compile
npm run test            # unit tests
npm run test:e2e        # end-to-end tests
npm run test -- --testPathPattern=<file>  # single test file
```

## Frontend Commands (run inside `apps/client/`)

```bash
npm run dev             # Vite dev server
npm run build           # production build
npm run preview         # preview production build
npm run lint            # ESLint
```

## Local Dev Setup

1. Copy env files: `cp apps/api/.env.example apps/api/.env` and `cp apps/client/.env.example apps/client/.env`
2. Start the database: `docker compose up -d` (from project root)
3. Start the API: `cd apps/api && npm run start:dev`
4. Start the client: `cd apps/client && npm run dev`

---

## Architecture

### Backend Module Structure

NestJS follows strict modules/controllers/services pattern. Planned modules:

- `auth` — JWT strategy, Passport guards, login/refresh endpoints
- `users` — CRUD, role assignment (admin / employee), bcrypt password hashing
- `products` — core entity with soft delete, audit fields
- `categories` — lookup table, required on every product
- `brands` — lookup table, required on every product
- `inventory` — stock levels, manual adjustments with reason, movement history
- `export` — Excel generation via exceljs in Sisco format
- `common` — shared guards, decorators, interceptors, DTOs

All entities use soft deletes. All mutations persist `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.

### Frontend Component Structure

```
src/
  pages/       # route-level components
  components/  # reusable UI
  layouts/     # shell wrappers (authenticated layout, auth layout)
  hooks/       # custom hooks
  services/    # Axios API clients (one per backend module)
  lib/         # Zod schemas, utility functions
```

Data fetching lives entirely in TanStack Query — no `useEffect` for server state.

### Auth Flow

JWT stored in localStorage with refresh logic. Backend issues access + refresh tokens. All protected routes guarded by JWT guard. Role-based access control (admin / employee) enforced at the controller level via NestJS guards.

---

## Key Constraints

- **Mobile-first**: every screen must work on small Android screens. Large tap targets, thumb-friendly forms.
- **No hard deletes in production**: all entities use soft delete.
- **TypeScript strict mode, no `any`** on both frontend and backend.
- **Tailwind only** on frontend — no other CSS libraries.
- **Validation at both layers**: Zod on frontend forms, class-validator DTOs on backend.
- **Excel export is backend-only**: triggered from frontend, generated and streamed by backend using exceljs.

---

## Specialized Agents

Three sub-agents are defined in `.claude/agents/` for delegating work:

- **Architect** — designs DB schema, module structure, and API contract. Start here before writing code.
- **Backend** — implements NestJS; waits for Architect's API contract before coding.
- **Frontend** — implements React UI; waits for Architect's API contract before coding.

Typical workflow: run Architect first to produce the schema and API contract, then Backend and Frontend can work in parallel.

---

## Open Questions (from Requirements)

- Exact Sisco Excel column format (TBD with client)
- Whether employees can adjust stock or only admins
- Whether low-stock alerts are visual-only or include email/push notifications
