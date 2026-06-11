---
name: project-lookups-and-currency
description: COP currency formatting, CurrencyField component, product-create stay-and-clear flow, and generic Departments/Groups/Brands CRUD added 2026-06-10
metadata:
  type: project
---

On 2026-06-10 (follow-up pass after [[project-users-feature]]), four changes
were made to `apps/client`:

**1. Currency fixed to Colombian pesos (COP, no decimals).** Previously
`Intl.NumberFormat('es-CR', { currency: 'CRC' })` was used (wrong country —
the store is in Colombia). Now `es-CO` / `COP` / `maximumFractionDigits: 0`
everywhere a price is displayed (`ProductCard`, the "Costo (calculado)" box
in `ProductFormPage`). New shared component
`src/components/CurrencyField.tsx` renders a controlled text input
(`inputMode="numeric"`) that live-formats with `Intl.NumberFormat('es-CO')`
thousand separators (dots) while typing, strips non-digits on change, and
emits a plain integer via `onChange`. Used in `ProductFormPage` for "Precio
de venta" via `Controller` from react-hook-form (added `control` to the
`useForm` destructure). `productFormSchema.salePrice` now also has
`.int(...)` since COP has no cents.

**2. Lookup `<option>` labels show only `name`** (not `{code} - {name}`) in
the product form's Departamento/Grupo/Marca selects and the
ProductsListPage filter selects. The new Catalogs CRUD pages (item 4) still
show `code` — it's a real managed field there, displayed as the existing
"bin label" mono badge (see [[project-design-system]]).

**3. Product creation "stay and clear" flow.** `ProductFormPage` create mode
no longer navigates to `/products` after success — it calls `reset()` and
shows `<Alert variant="success">Producto creado correctamente.</Alert>` via
`createMutation.isSuccess`, staying on `/products/new` so staff can rapidly
enter many products. Edit mode is unchanged (still navigates to `/products`
after `updateMutation`).

**4. Generic Departments/Groups/Brands CRUD** (admin-only, structurally
identical `{id, code, name}` resources per `docs/ApiContract.md` §6):
- `src/services/lookups.ts` — added `LookupResource = 'departments' |
  'groups' | 'brands'` and generic `getLookups/getLookup/createLookup/
  updateLookup/deleteLookup(resource, ...)`. Kept `getDepartments/
  getGroups/getBrands` as thin wrappers (still used by
  `useDepartments/useGroups/useBrands`).
- `src/hooks/useLookups.ts` — added generic `useLookupList(resource,
  query)`, `useLookupItem`, `useCreateLookup`, `useUpdateLookup`,
  `useDeleteLookup`, all keyed by `[resource, ...]` so cache
  invalidation (`invalidateQueries({ queryKey: [resource] })`) covers both
  the generic list query and the legacy `useDepartments()`-style
  `[resource]`-only key used by ProductFormPage/ProductsListPage.
- `src/lib/schemas/lookup.ts` — `lookupFormSchema` (`code` max 50, `name`
  max 150).
- New generic pages `src/pages/LookupListPage.tsx` and
  `src/pages/LookupFormPage.tsx`, parametrized by `resource`/`title`/
  `basePath`/etc, mounted 3x each in `App.tsx` for `/departments`,
  `/groups`, `/brands` (+ `/new` and `/:id/edit`), all under
  `<AdminRoute />`. List page mirrors `UsersListPage` (search, grid of
  cards with code badge + name, edit link, delete with confirm modal) but
  simpler — no extra filters, no toggle-active.
- New `src/pages/CatalogsPage.tsx` at `/catalogs` — index of 3 link cards
  to the above. `AuthenticatedLayout` nav gained a single "Catálogos" 🏷️
  admin-only item (alongside "Usuarios") rather than 3 separate nav items,
  to keep the mobile bottom tab bar uncluttered (now 3 items total for
  admins: Productos/Usuarios/Catálogos).

**Verification**: full Playwright flow at 390px against live dev servers
(API on :3000, seeded DB) — login, currency shows "$ 1.234.567" style on
product cards/cost box, CurrencyField shows "1.000.000" while typing and
submits `salePrice` as a plain integer in the network payload, lookup
selects show only names, product create shows success alert + clears form +
stays on `/products/new`, edit still navigates to `/products`, and full
Departments CRUD (create/edit/delete) works via `/catalogs` →
`/departments`. `npm run lint` and `npm run build` pass clean.

See [[project-design-system]] for color tokens/component conventions reused
here, and [[project-users-feature]] for the list/form page pattern this
mirrors.
