---
name: project-design-system
description: Visual design tokens (palette, type, layout) and responsive breakpoint conventions adopted for apps/client in the 2026-06-10 responsive/redesign pass
metadata:
  type: project
---

On 2026-06-10 the UI was reworked from generic default-Tailwind (gray/blue)
to a deliberate "parts-catalog ledger" identity, and made responsive
(mobile-first base styles + `sm:`/`lg:` breakpoints for tablet/desktop).
Previously the app was mobile-only and looked broken/empty on desktop
(single column, huge bottom tab bar with one item, edge-to-edge content).

**Color tokens (arbitrary Tailwind values, no config file changes since
Tailwind v4 here has no `tailwind.config.js`):**
- Primary / brand navy: `#1E2A4A` (buttons, headings, active nav, focus ring)
- Accent (CTAs/prices): `#E8853A` ("tool orange" — used for sale price,
  eyebrow labels)
- Danger: `#C2483A` (desaturated red, replaces `red-600`)
- Borders/dividers: `#E4E8EF` / `#D8DCE6`
- Backgrounds: page `#F7F6F4`, cards `#FFFFFF`, subtle fill `#F0F2F6`
- Body text: `#3F4654`, muted/labels: `#8B92A3`

**Signature element:** product `reference` codes are rendered as small
monospace "bin label" tags (`font-mono`, bordered, `bg-[#F7F6F4]`) — used in
`ProductCard` and the reference input on `ProductFormPage`. Apply this same
treatment to any future place a SKU/reference code is displayed.

**Layout/responsive conventions:**
- `AuthenticatedLayout`: persistent left sidebar nav on `lg:` (with user
  info + logout at bottom), top bar + bottom tab bar remain for `<lg`. Main
  content wrapped in `mx-auto max-w-6xl`.
- `ProductsListPage`: product list is a CSS grid
  (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`), not a table —
  filters/search row goes horizontal (`sm:flex-row`) on tablet+.
- `ProductFormPage` / `AuthLayout`: forms constrained with
  `max-w-2xl` / `max-w-md` respectively; form fields grouped into responsive
  grids (`sm:grid-cols-2` / `sm:grid-cols-3`) on larger screens, stacked on
  mobile.
- Shared components (`Button`, `TextField`) keep mobile-first
  `min-h-12`/`w-full` as base, but add `sm:min-h-11 sm:py-2.5 sm:text-sm` to
  avoid oversized controls on desktop. `Button` stays `w-full` always
  (callers control width via flex/grid context, e.g. `flex-1` or
  `sm:w-auto sm:px-6` overrides in forms) — do NOT add `sm:w-auto` directly
  to the base Button class, it breaks full-width buttons in centered forms.

**Verification:** installed Playwright (`npx playwright install chromium`,
~ubuntu24.04 fallback build) into `/tmp` (not a project dependency) to take
screenshots at 375px and 1440px viewports for login/products/form pages.
Login via seeded admin `admin@casarespuestos.com` / `ChangeMe123!` (see
`apps/api/src/database/seeds/seed-admin.ts` defaults). `npm run lint`,
`tsc -b`, and `npm run build` all pass clean after the redesign.

See [[project-client-setup]] and [[project-auth-contract]] for prior
scaffold/contract context.
