/**
 * The full permission catalog for `employee`-role users — see
 * docs/GLOSSARY.md ("Permisos"). `admin` bypasses this entirely (always
 * full access); `auditor` is untouched (its fixed, already-existing
 * read-only access doesn't go through this system). Every code here is
 * an action a coarse `employee` could already do before this system
 * existed — nothing admin-only (deleting a product/customer, catalog
 * CRUD, managing users, resolutions, payroll, export) is in this catalog,
 * so this system can never be used to hand out admin-level power.
 *
 * A flat `text[]` column on `users`, not a table: this catalog is a
 * fixed, compile-time whitelist owned by the codebase, not admin-editable
 * metadata — same reasoning as `dian_resolutions.subtype`/
 * `customers.identification_type` being a validated free string instead
 * of a DB enum (see docs/DATABASE.md). A Postgres enum was avoided
 * specifically because enum values can be added but never removed
 * (see the `AddAuditorRole` migration's irreversible `down()`), which is
 * a bad fit for a catalog expected to grow as new modules ship.
 */
export const PERMISSIONS = [
  'products.view',
  'products.create',
  'products.update',

  'catalogs.view',

  'inventory.view',
  'inventory.create',

  'customers.view',
  'customers.create',
  'customers.update',

  'quotations.view',
  'quotations.create',
  'quotations.update',
  'quotations.invoice',
  'quotations.cancel',

  'invoices.view',
  'invoices.create',
  'invoices.resend',
  'invoices.refresh',

  'debit_notes.view',
  'debit_notes.create',

  'credit_notes.view',
  'credit_notes.create',

  'third_parties.view',

  'cash_register.view',
  'cash_register.open',
  'cash_register.close',
  'cash_register.reopen',
  'cash_register.movements.create',
  'cash_register.counted_cash.correct',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

/**
 * Same-scope implication (any mutating action implies that scope's
 * `.view` — acting on something you can't see makes no sense) plus a
 * short, deliberately hardcoded list of cross-scope implications where a
 * form genuinely can't function without another scope's data (e.g. the
 * product form's department/group/brand dropdowns need `catalogs.view`).
 * Not a generic rule engine — a small fixed map is enough for this store.
 *
 * Deliberately NOT implied: `quotations.invoice` -> `invoices.create`.
 * Converting a quotation calls `InvoicesService.create()` as a direct
 * internal service call, not a re-entrant HTTP request — no guard runs
 * a second time, so there's no runtime inconsistency either way. A store
 * may legitimately want an employee who can finalize existing quotations
 * without also being able to create brand-new invoices from scratch.
 */
const IMPLIES: Partial<Record<Permission, Permission[]>> = {
  'products.create': ['products.view', 'catalogs.view'],
  'products.update': ['products.view', 'catalogs.view'],
  'inventory.create': ['inventory.view', 'products.view'],
  'customers.create': ['customers.view'],
  'customers.update': ['customers.view'],
  // Verified against the actual client code (CustomerPicker,
  // InvoiceFormPage) rather than assumed: the sale/quotation customer
  // step unconditionally renders the saved-customer search, the DIAN
  // tercero lookup, and silently creates/updates the local customer
  // record as part of a normal submit — not optional side actions.
  'quotations.create': [
    'quotations.view',
    'products.view',
    'customers.view',
    'customers.create',
    'customers.update',
    'third_parties.view',
  ],
  'quotations.update': ['quotations.view', 'products.view'],
  'quotations.invoice': ['quotations.view'],
  'quotations.cancel': ['quotations.view'],
  'invoices.create': [
    'invoices.view',
    'products.view',
    'customers.view',
    'customers.create',
    'customers.update',
    'third_parties.view',
  ],
  'invoices.resend': ['invoices.view'],
  'invoices.refresh': ['invoices.view'],
  'debit_notes.view': ['invoices.view'],
  'debit_notes.create': ['debit_notes.view', 'invoices.view'],
  'credit_notes.view': ['invoices.view'],
  'credit_notes.create': ['credit_notes.view', 'invoices.view'],
  'cash_register.open': ['cash_register.view'],
  'cash_register.close': ['cash_register.view'],
  'cash_register.reopen': ['cash_register.view'],
  'cash_register.movements.create': ['cash_register.view'],
  'cash_register.counted_cash.correct': ['cash_register.view'],
};

/** Expands a set of granted codes to include everything they imply —
 * called before persisting an employee's permissions, so what's stored
 * (and returned to the client) is always self-consistent. */
export function expandPermissions(codes: Permission[]): Permission[] {
  const result = new Set<Permission>(codes);
  let changed = true;
  while (changed) {
    changed = false;
    for (const code of [...result]) {
      for (const implied of IMPLIES[code] ?? []) {
        if (!result.has(implied)) {
          result.add(implied);
          changed = true;
        }
      }
    }
  }
  return [...result];
}
