---
name: CasaRespuestos — Talonario reencarnado
description: The store's own carbon-copy invoice pad, brought to life as an electronic, DIAN-legal system.
colors:
  ink: "#1a1815"
  ink-2: "#2b2823"
  ink-3: "#0d0c0a"
  steel: "#5a5348"
  fog: "#8c8371"
  line: "#ddd2b3"
  line-2: "#b8a97e"
  mist: "#ece1c5"
  canvas: "#f3ecd8"
  paper: "#faf7ec"
  carbon: "#5c5568"
  carbon-tint: "#e7e2e6"
  signal: "#c8231f"
  signal-2: "#a01c19"
  rust: "#9a3226"
  ok: "#2f6b45"
  amber: "#a8711a"
  indigo: "#4b5568"
typography:
  data:
    fontFamily: "'Special Elite', ui-monospace, 'SFMono-Regular', monospace"
    note: "amounts, references, document/invoice numbers, stamps — data and measurement, never a generic 'technical' label"
  body:
    fontFamily: "'Archivo', ui-sans-serif, system-ui, sans-serif"
    note: "prose, labels, nav, buttons"
rounded:
  none: "0px"
  note: "buttons, inputs, and paper-surface panels are square-cornered — a form doesn't have rounded corners"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  stamp:
    textColor: "{colors.signal}"
    typography: "{typography.data}"
    note: "rotated -6deg, 2px currentColor border — reserved for accepted/paid/confirmed states only"
---

## Overview

CasaRespuestos runs a small car spare-parts store's counter sales, inventory, and DIAN electronic invoicing (Dataico). This pass replaced the previous minimalist graphite/steel admin-panel identity with **"Talonario reencarnado"** — the store's own carbon-copy paper invoice pad, brought to life. The thesis: every screen should feel like the exact ritual the app replaced, now electronic and DIAN-legal, not a generic SaaS dashboard wearing the store's logo. See `PRODUCT.md` for the product record and `.impeccable/surfaces/app.md` for the full direction contract this build executed against.

Code-led build (no image generation available in this environment) — the ambition lives in this document and the direction contract rather than an approved comp.

## Colors

Warm invoice-paper cream as the ground (`canvas` `#f3ecd8`, `paper` `#faf7ec` for panels/cards/inputs — slightly lighter than the page itself). Text runs in a near-black, faintly warm "typewriter ribbon" ink (`ink` `#1a1815`), not a cool graphite. Borders and hover surfaces (`line`, `line-2`, `mist`) are aged-paper tones, not cool grays.

The **carbon** pair (`carbon` `#5c5568`, `carbon-tint` `#e7e2e6`) is deliberately a *cool* violet-gray against the warm ground — that contrast, not a matched hue, is what reads as "the smudged duplicate copy underneath," applied as `.carbon-row`'s background wash on completed/historical/read-only rows.

**Signal red** (`#c8231f`, from the store's own logo) is reserved specifically for the rubber-stamp mark (`.stamp` — DIAN-accepted invoices/notes, a squared cash register) and the one active nav/tab indicator. It is never a background wash or a generic "primary" fill color — that discipline is the whole point of the direction.

Status colors (`rust` destructive/rejected, `ok` accepted/positive, `amber` pending/credit) are unchanged in hue from the prior system but re-tinted warmer to sit on the cream ground without clashing.

## Typography

Two faces, each earning its register from the subject itself, not chosen as a generic "distinctive" pairing:

- **Special Elite** (`--font-mono`) — an actual typewriter face, for the "carbon typewriter" register: monetary amounts, invoice/quotation/reference numbers, CUFE, and stamp text. Already the majority of the app's numeric/reference display before this pass used a `font-mono` utility class (58 call sites across 21 files) — repointing the underlying token converted the entire app's data typography at once.
- **Archivo** (`--font-sans`, `body`) — the plain workhorse voice for prose, labels, nav, and buttons. Operate-mode surfaces are well served by a quiet system-adjacent sans; the point of view lives in the data face and the material details, not in the UI chrome's typeface.

## Layout

Structural containers (bordered panels, list rows, form sections) keep their existing bordered-box composition — this pass did not re-template every page's layout, since the world propagates through color, type, and the specific paper/carbon/stamp details rather than a wholesale structural rebuild. The one deliberate structural device added is the **perforated divider** (`.perforated-divider`, `.perforated-divider-vertical`) — a punched-hole rule (via a repeating radial-gradient, not a decorative dashed border) used at real section seams: the mobile header/content boundary and the desktop sidebar/content seam ("the ledger's own binding").

Mobile-first, unchanged from the prior system: a bottom tab bar and top bar below `lg`, a fixed left sidebar above it.

## Shapes

Square corners throughout buttons, inputs, and panels (`rounded: none`) — a paper form doesn't have rounded corners. This is a deliberate reversal from the prior system's soft `rounded-sm` default.

## Components

- **Button** (`components/Button.tsx`): primary is ink-on-paper (inverted from before, was ink-on-white); secondary is paper-on-ink-border. Square corners.
- **TextField / SelectField**: `bg-paper` (not literal white), square corners, unchanged focus ring.
- **`.stamp`** (new utility, `index.css`): the rubber-stamp mark. `display: inline-flex`, `transform: rotate(-6deg)`, `border: 2px solid currentColor`, `font-family: var(--font-mono)`, uppercase. Used for: `DIAN_ACEPTADO` on invoices/debit-notes/credit-notes (replacing a plain pill badge), and "Caja cuadrada" on the cash-register closing report. Reserved for these sealed/confirmed moments only — not applied to pending/neutral states, which keep a plain label.
- **`.carbon-row`** (new utility): the duplicate-copy wash (`background-color: var(--color-carbon-tint)`) for completed/historical rows. Available for use, not yet applied everywhere a "read-only copy" row exists — a natural next pass.
- **`.total-rule`** (new utility): `border-bottom: 3px double var(--color-ink)` — the old ledger convention of a doubled rule under a grand total. Applied to the Venta line-item total, and the Nota Débito/Crédito/Cotización totals.
- **Toast**: unchanged behavior, square corners now.

## Do's and Don'ts

- **Do** reserve `.stamp` for genuinely sealed/confirmed states (DIAN accepted, caja cuadrada) — using it for every status badge would cheapen the one moment it's supposed to mark.
- **Do** keep `carbon-tint` cool relative to the warm canvas; warming it to match would erase the "different sheet of paper" read.
- **Do** use `font-mono` (Special Elite) for anything that is data/measurement — amounts, references, counts — never as a "this looks technical" costume on prose.
- **Don't** reintroduce literal `bg-white`, `text-gray-*`, or `border-gray-*` Tailwind grays — every surface and neutral text color should route through the warm token set (`bg-paper`, `text-ink`, `text-steel`, `text-fog`) so a future edit can't silently reintroduce the old cool palette.
- **Don't** recreate Dataico's own invoice PDF locally — its design (including the DIAN-verification QR/CUFE) is out of this app's hands by law, not by choice; the app only ever links to it.
- **Don't** add rounded corners back to buttons/inputs/panels without a deliberate reason — square corners are load-bearing to the "paper form" read.

## Known gaps (disclosed, not silently skipped)

This build ran code-led with no browser access in this environment (the shared Playwright instance was locked by another session throughout) — no live screenshots, no comp, and no automated finish review with visual evidence were possible. The mechanical detector (`impeccable detect --json`) ran clean against `apps/client/src` but a source-code scan is not a substitute for a rendered-page check. Verified instead by: `tsc --noEmit`, `eslint` (clean, one pre-existing unrelated warning), and a full production `vite build` (clean). **The user should view the app live and flag anything that reads wrong before this is considered finished** — contrast in particular (the new warm neutrals were chosen by calculation, not measured against a render) is the highest-priority thing to eyeball.

Not yet touched in this pass, left for a deliberate follow-up rather than rushed now: the Dashboard's KPI cards and chart, the print tickets (`components/print/*`), and applying `.carbon-row` to historical/read-only list rows (cash register history, past invoices) for the "duplicate copy" read the direction promises there.
