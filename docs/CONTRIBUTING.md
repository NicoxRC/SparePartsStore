# Contributing to CasaRespuestos

This document defines how we branch, commit, and merge code in this repository. This has been a solo/AI-driven project from the start — there's no external ticket tracker and, most of the time, no second human reviewer. The process below is scaled to that reality rather than copied from a multi-developer team process that doesn't apply here.

## Branching — lightweight GitHub Flow

A single long-lived branch (`main`) plus short-lived feature branches, used **when the change warrants it**:

```
main
 ├── feature/auth-module
 ├── fix/inventory-orderby-column
 └── chore/upgrade-typeorm
```

### When to use a branch + PR vs. commit straight to `main`

- **Use a `feature/<description>` branch + PR** for anything multi-step: a new module, a schema change touching more than one entity, a new invoicing phase. This is what happened for the original `auth`/`users`/`products` work (see `git log` — PRs #1–#4).
- **Commit directly to `main`** is acceptable for a small, self-contained change: a one-line bug fix, a copy tweak, a single new endpoint on an existing module. This is what most commits since have actually done. Don't force a branch-and-PR ceremony onto a change that doesn't need it, and don't use "it's just a small fix" to justify skipping tests or lint on something that isn't actually small.

Either way: `main` should stay in a working state — don't commit something you haven't run locally.

### Branch naming

```
<type>/<short-description>
```

| Type | Use for |
|---|---|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `chore/` | Maintenance (deps, config, cleanup) |
| `refactor/` | Code changes that don't alter behavior |
| `docs/` | Documentation-only changes |

No ticket ID — this project doesn't use Jira/Linear/etc. The phase in `docs/PROJECT_ROADMAP.md` is the unit of tracking; reference it in the branch description or PR body instead (e.g. `feature/dataico-resolutions`, not `feature/CASA-42-resolutions`).

## Commit convention — Conventional Commits

```
<type>(<scope>): <description>
```

| Type | Use for |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Neither a fix nor a feature |
| `test` | Adding/fixing tests |
| `chore` | Build process, dependencies, tooling |

Scope is the module affected — `products`, `inventory`, `auth`, `invoicing`, `resolutions`, etc.

```
feat(inventory): implement inventory movement management
fix(inventory): correct column name in orderBy clause for movement query
feat(invoicing): add Dataico client service and config
docs(roadmap): add invoicing phases
```

Commit small and often — one logical change per commit, not a giant "implement invoicing" commit touching a dozen files.

## Pull Request process (when a branch is used)

### Before opening a PR

- [ ] Branch is up to date with `main`
- [ ] Tests pass locally (`npm run test` in the touched app)
- [ ] No lint errors (`npm run lint`)
- [ ] You've manually tested the change

### PR requirements

1. Title follows the commit convention: `feat(invoicing): add resolutions module`
2. Description: what changed and why, which phase it corresponds to (`docs/phases/PHASE_N_....md`), manual testing steps
3. Since review is solo (or AI-assisted, no second developer), the human maintainer is the sole approver — don't merge without their explicit go-ahead.

### Merge strategy

Squash and merge into `main`, keeping one commit per feature/fix. Delete the branch after merging.

## Keeping a branch updated

During the invoicing pivot, rebase feature branches onto `develop`, not `main` (see below):

```bash
git checkout develop
git pull origin develop
git checkout feature/dataico-resolutions
git rebase develop
```

Outside the pivot (or once it's over), rebase onto `main` instead. Resolve conflicts, then `git push --force-with-lease` (only ever force-push your **own** branch, never `main`/`develop`).

## Temporary: `develop` integration branch during the invoicing pivot

`main` is what's currently deployed to production. While the Dataico invoicing pivot (`docs/PROJECT_ROADMAP.md` phases 7–14) is in progress, work accumulates on a long-lived **`develop`** branch instead of going straight to `main`, so production stays untouched until the whole pivot is ready — not just one phase.

- Feature branches for each invoicing phase (`feature/dataico-foundation`, `feature/dataico-resolutions`, etc.) branch off `develop` and merge back into `develop` via PR, following the same rules as everywhere else in this document.
- **No PR against `main` exists while the pivot is in progress** — every PR during this period targets `develop`. A single `develop` → `main` PR is opened only once the full pivot is production-ready, reviewed, and ready to merge — not before.
- This is a deliberate, temporary exception to the GitHub Flow described above. Once the pivot ships and `develop` merges into `main`, `develop` is deleted and branching goes back to feature branches off `main` directly.

## AI attribution in commits/PRs

Follow whatever the current Claude Code session's system instructions say about commit/PR attribution (some sessions require a `Co-Authored-By` trailer, others don't). If nothing is specified, don't add any — keep history reading like a normal developer's.

## Related documents

- `CODING_STANDARDS.md` — what "tests pass" and "no lint errors" actually check
- `DEFINITION_OF_DONE.md` — the full merge checklist
- `PROJECT_ROADMAP.md` — the phase a branch/PR should reference
