---
name: project-users-feature
description: User Management UI (admin-only /users routes) added to apps/client, mirrors products feature patterns
metadata:
  type: project
---

On 2026-06-10 the User Management UI was added to `apps/client` as the
final piece before production (inventory/categories/brands/export/dashboard
deferred). Backend `/api/users` was already implemented and untouched.

**New files** (all mirror the equivalent products-feature file):
- `src/services/users.ts` — `UserResponse`, `UsersQuery`, `CreateUserInput`,
  `UpdateUserInput`; reuses `PaginatedResponse`/`PaginationMeta` imported
  from `./products` (didn't relocate to a shared location — low churn).
- `src/hooks/useUsers.ts` — `useUsers`, `useUser`, `useCreateUser`,
  `useUpdateUser(id)`, `useDeleteUser`, plus an extra
  `useToggleUserActive()` mutation taking `{ id, isActive }` at call time
  (needed because the list page renders many cards and can't bind a single
  user id to one hook instance the way the form page's `useUpdateUser(id)`
  does).
- `src/lib/schemas/user.ts` — `userFormSchema` (create, password required
  min 8) and `userEditFormSchema` (password optional — empty string or
  omitted means "don't change").
- `src/components/AdminRoute.tsx` — new route guard, checks
  `user?.role === 'admin'`, redirects non-admins to `/products`. Mirrors
  `ProtectedRoute` (shows `Spinner` while `isLoading`).
- `src/components/SelectField.tsx` — new shared component, mirrors
  `TextField` styling, used for role/isActive filters and the role dropdown
  in the user form. No prior select component existed in the codebase.
- `src/components/UserCard.tsx` — shows name/email/role badge/active
  status/last login. Self-row (`user.id === useAuth().user.id`) shows a
  note "Esta es tu cuenta..." and disables Desactivar/Eliminar buttons —
  pure UX nicety, backend already rejects these with 400.
- `src/pages/UsersListPage.tsx`, `src/pages/UserFormPage.tsx` — mirror
  `ProductsListPage`/`ProductFormPage` patterns exactly (search, filter
  toggle, grid, pagination, delete confirm modal, shared create/edit form
  via `useParams`).

**Routing/nav changes** (additive only):
- `App.tsx`: `/users`, `/users/new`, `/users/:id/edit` nested inside
  `<AdminRoute />` inside the existing `<AuthenticatedLayout />` /
  `<ProtectedRoute />` tree.
- `AuthenticatedLayout.tsx`: `navItems` was a static module-level array;
  changed to be computed inside the component so "Usuarios" (👥) can be
  conditionally appended when `user?.role === 'admin'`. Both desktop
  sidebar and mobile bottom tab bar share this array as before.

**Gotcha hit during verification**: when adding `SelectField` to filter UI
without an explicit `id`/`name`, `htmlFor`/`id` fall back to `rest.name`
(`undefined`) — must always pass `id`/`name` explicitly for filter selects
(form-registered selects via `register('role')` get `name` automatically
from RHF so they're fine).

**Verification**: full Playwright flow at 390px (mobile) + 1440px
(desktop) against live dev servers — admin login, Usuarios nav
visible/sidebar present, create/search/edit/deactivate/reactivate/delete
all work, role+isActive filters work, self-card disables
Desactivar/Eliminar with explanatory note, employee user does NOT see
Usuarios nav and is redirected `/users` -> `/products`. Server-side guard
"You cannot change your own admin role." surfaces correctly via `Alert` +
`getApiErrorMessage` (message is in English, untranslated — passthrough by
design per task spec, same as products error passthrough).
`npm run lint` and `npm run build` both pass clean.

See [[project-design-system]] for the shared color tokens/components reused
here, and [[project-auth-contract]] for the `user.role`/`user.id` shape from
`useAuth()`.
