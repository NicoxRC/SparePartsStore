# Phase 2 — Auth, users, and roles

**Status: Done** (forced password change added slightly later, in the same phase's spirit — documented here rather than as a separate phase since it's part of the same `auth`/`users` domain).

## Goal

JWT-based auth with role-based access control, and full user management for admins.

## What shipped

- `User` entity, `UserRole` enum (`admin`/`employee`/`auditor` — auditor added via a later migration)
- `POST /auth/login` (local strategy), `POST /auth/refresh` (refresh strategy, separate secret/expiry from the access token), `POST /auth/logout` (client-side no-op), `GET /auth/me`
- Global `JwtAuthGuard` + `RolesGuard` (`APP_GUARD`) — every endpoint protected by default; `@Public()` and `@Roles(...)` opt out/restrict
- `users` module (ADMIN-only): create/list/get/update/soft-delete, with self-protection rules — can't deactivate, demote-from-admin, or delete your own account
- **Forced password change**: `mustChangePassword` set on account creation and on any admin-triggered password reset, cleared only via `POST /auth/change-password`; enforced globally via the JWT payload and `@SkipPasswordCheck()`. See `docs/GLOSSARY.md`.

## Exit criteria (met)

Both roles can log in, see a role-appropriate UI, and a forced password change can't be bypassed by navigating directly to another route.

## Related documents

- `docs/DATABASE.md` (`users` table), `docs/GLOSSARY.md` ("Forced password change", roles)
