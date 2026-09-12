# CasaRespuestos

Inventory management **and electronic invoicing** system for a spare parts store. Staff load and manage inventory from mobile devices; invoices, credit notes, and debit notes are issued electronically through the **Dataico API** (DIAN-compliant, Colombia).

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeORM + PostgreSQL |
| Frontend | React + Vite + Tailwind CSS |
| Auth | Passport.js + JWT (access + refresh tokens) |
| Invoicing | Dataico API (electronic invoicing, DIAN) |
| Excel export | exceljs (legacy Sisco format — being retired, see `docs/PROJECT_ROADMAP.md`) |
| Deploy | Railway (backend + DB), Vercel (frontend) |
| Local database | PostgreSQL via Docker |

## Repository structure

This is a **monorepo**:

```
SparePartsStore/
├── apps/
│   ├── api/           # REST API — NestJS
│   └── client/        # Web panel — React + Vite
├── docs/              # Project documentation (this file and the rest)
├── docker-compose.yml
└── README.md
```

## Prerequisites

- **Node.js 22 LTS**
- **npm**
- **Docker** and **Docker Compose** — to run PostgreSQL locally
- **Git**

```bash
node -v
npm -v
docker -v
```

## Running the project locally

### 1. Clone and start the database

```bash
git clone https://github.com/NicoxRC/SparePartsStore.git
cd SparePartsStore
docker compose up -d
docker ps   # confirm the postgres container is healthy
```

### 2. Set up and run the API

```bash
cd apps/api
npm install
cp .env.example .env    # fill in the values — see docs/ENVIRONMENT_VARIABLES.md
npm run migration:run
npm run seed:product-lookups   # legacy department/group/brand catalog
npm run seed:admin              # creates the first admin user from SEED_ADMIN_* env vars
npm run start:dev
```

The API runs at `http://localhost:3000` (routes prefixed with `/api`).

### 3. Set up and run the Client

In a separate terminal:

```bash
cd apps/client
npm install
cp .env.example .env
npm run dev
```

The client runs at Vite's default port (`http://localhost:5173`).

### 4. Run the tests

```bash
# API
cd apps/api
npm run test
npm run test:cov

# Client
cd apps/client
npm run lint
```

## Project documentation

All detailed documentation lives in [`/docs`](./docs):

| Document | Content |
|---|---|
| [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Folder structure, module organization, response format, versioning |
| [`CODING_STANDARDS.md`](./docs/CODING_STANDARDS.md) | Code conventions for backend and frontend |
| [`CONTRIBUTING.md`](./docs/CONTRIBUTING.md) | Branching rules, commit conventions, PR process |
| [`DATABASE.md`](./docs/DATABASE.md) | Data model, schema, migration policy |
| [`DEFINITION_OF_DONE.md`](./docs/DEFINITION_OF_DONE.md) | Checklist before merging any task |
| [`ENVIRONMENT_VARIABLES.md`](./docs/ENVIRONMENT_VARIABLES.md) | Every environment variable explained |
| [`GLOSSARY.md`](./docs/GLOSSARY.md) | Business vocabulary (inventory + invoicing/Dataico/DIAN terms) |
| [`PROJECT_ROADMAP.md`](./docs/PROJECT_ROADMAP.md) | Development phases — inventory (done) and invoicing (in progress) |
| [`TESTING.md`](./docs/TESTING.md) | Unit testing strategy and standards |
| `phases/` / `phasesClient/` | Per-phase scope briefs, backend and frontend |

## License

Private — internal tool for CasaRespuestos.
