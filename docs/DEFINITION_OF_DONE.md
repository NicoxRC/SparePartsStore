# Definition of Done

A task is **not done** just because the code works on your machine. This is the minimum bar for any change, regardless of size.

## Checklist before considering a task finished

- [ ] Code implements everything in the phase brief's scope (`docs/phases/` / `docs/phasesClient/`), nothing more
- [ ] Branch/commit follows `CONTRIBUTING.md`
- [ ] `npm run lint` passes with no errors (in every app touched)
- [ ] `npm run test` passes with no failures (`api`)
- [ ] **New or modified service logic has corresponding unit tests** (see `TESTING.md`) — no exceptions
- [ ] **New endpoints are documented with `@nestjs/swagger` decorators** (`@ApiTags`, `@ApiOperation`, `@ApiResponse` for success + the most relevant error case, DTOs annotated with `@ApiProperty`) — see `ARCHITECTURE.md`'s note on Swagger being added as part of the invoicing foundation work. This applies to every endpoint added **from that point forward**; existing pre-invoicing endpoints aren't required to be retrofitted as a side effect of an unrelated change.
- [ ] No `console.log`, commented-out code, or leftover debug code
- [ ] New environment variables are reflected in `.env.example` **and** `ENVIRONMENT_VARIABLES.md`
- [ ] A new migration follows `DATABASE.md`'s workflow and the generated SQL was reviewed before committing
- [ ] You've manually run and tested the change yourself locally

## Additional bar for anything invoicing/Dataico-related

- [ ] Every Dataico endpoint path, payload field, and auth mechanic used actually comes from that module's shared reference — not inferred from another module's shape or from general REST conventions. If something needed wasn't in the reference, that was flagged and confirmed before writing code, not guessed.
- [ ] Error responses from Dataico (rejected invoice, DIAN validation failure, etc.) are surfaced to the user in a way they can act on — not swallowed into a generic "something went wrong."
- [ ] Scope matches what this specific (small, car spare-parts) store actually needs, not maximal coverage of what Dataico's API can do — see `PROJECT_ROADMAP.md`'s "Design philosophy" note. A field/option/document type the reference supports but this store doesn't use is left out, not built "for completeness."

## Checklist for review (self-review when solo)

- [ ] The change matches what the phase brief asked for — nothing missing, nothing extra and unrelated
- [ ] Tests exist for new business logic and cover more than just the happy path
- [ ] No obvious bugs, edge cases, or security issues (missing input validation, exposed sensitive data, unescaped search input — see `CODING_STANDARDS.md`)
- [ ] Naming and structure follow `CODING_STANDARDS.md`

## After merge

- [ ] Branch is deleted (if one was used)
- [ ] If the change affects local setup (new env var, new dependency, new setup step), `README.md` is updated

## What "Done" does NOT mean

- Passing through a CI/CD pipeline (not set up yet)
- End-to-end or integration tests
- A fixed test coverage percentage

## Related documents

- `CODING_STANDARDS.md`, `TESTING.md`, `CONTRIBUTING.md` — what each checklist item actually checks
- `ENVIRONMENT_VARIABLES.md`, `DATABASE.md` — where new env vars / migrations get documented
