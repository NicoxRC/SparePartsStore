---
name: project-infra
description: Infrastructure decisions for local dev — Docker for DB only, env var layout, docker-compose location
metadata:
  type: project
---

Local dev infrastructure (as of 2026-06-04):

- `docker-compose.yml` lives at the project root and starts only PostgreSQL 16 (`casarespuestos_postgres` container).
- The NestJS API and React client are NOT Docker services — they run locally via `npm run start:dev` and `npm run dev`.
- DB credentials for local dev: user=`casarespuestos`, password=`casarespuestos_pass`, db=`casarespuestos_dev`, port=5432.
- `apps/api/.env` points to this local Docker postgres.
- `apps/client/.env` sets `VITE_API_URL=http://localhost:3000`.
- `.env.example` files are committed; `.env` files are gitignored at all three levels (root, api, client).

**Why:** Only the database needs Docker for dev consistency. Running NestJS and Vite in Docker during development adds unnecessary complexity and slows hot-reload.

**How to apply:** When adding new infrastructure (e.g., Redis, pgAdmin), add it to `docker-compose.yml` at the project root, not inside any app folder. When adding new env vars, update both the `.env` and `.env.example` in the relevant app folder.
