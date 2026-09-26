/**
 * Mirrors apps/api/src/common/constants/permission.constant.ts — kept in
 * sync by hand, same convention already used for the three `UserRole`
 * values (see services/auth.ts). Small, code-review-paced catalog, so no
 * `GET /permissions/catalog` endpoint was added just to avoid this.
 *
 * Only meaningful for `role: 'employee'` — admin is a fixed superuser,
 * auditor's existing read-only access is untouched by this system.
 */
export const PERMISSION_SCOPES = [
  {
    scope: 'products',
    label: 'Productos',
    actions: [
      { code: 'products.view', label: 'Ver' },
      { code: 'products.create', label: 'Crear' },
      { code: 'products.update', label: 'Editar' },
    ],
  },
  {
    scope: 'catalogs',
    label: 'Catálogos (departamentos, grupos, marcas)',
    actions: [
      { code: 'catalogs.view', label: 'Ver' },
      { code: 'catalogs.create', label: 'Crear' },
      { code: 'catalogs.update', label: 'Editar' },
    ],
  },
  {
    scope: 'inventory',
    label: 'Inventario',
    actions: [
      { code: 'inventory.view', label: 'Ver' },
      { code: 'inventory.create', label: 'Ajustar stock' },
    ],
  },
  {
    scope: 'customers',
    label: 'Clientes',
    actions: [
      { code: 'customers.view', label: 'Ver' },
      { code: 'customers.create', label: 'Crear' },
      { code: 'customers.update', label: 'Editar' },
    ],
  },
  {
    scope: 'quotations',
    label: 'Cotizaciones',
    actions: [
      { code: 'quotations.view', label: 'Ver' },
      { code: 'quotations.create', label: 'Crear' },
      { code: 'quotations.update', label: 'Editar ítems' },
      { code: 'quotations.invoice', label: 'Facturar' },
      { code: 'quotations.cancel', label: 'Cancelar' },
    ],
  },
  {
    scope: 'purchase_imports',
    label: 'Compras (factura de proveedor)',
    actions: [
      { code: 'purchase_imports.view', label: 'Ver' },
      { code: 'purchase_imports.create', label: 'Cargar y editar' },
      { code: 'purchase_imports.confirm', label: 'Confirmar' },
    ],
  },
  {
    scope: 'invoices',
    label: 'Facturas / Venta',
    actions: [
      { code: 'invoices.view', label: 'Ver' },
      { code: 'invoices.create', label: 'Facturar (Venta)' },
      { code: 'invoices.resend', label: 'Reenviar' },
      { code: 'invoices.refresh', label: 'Consultar estado' },
    ],
  },
  {
    scope: 'debit_notes',
    label: 'Notas débito',
    actions: [
      { code: 'debit_notes.view', label: 'Ver' },
      { code: 'debit_notes.create', label: 'Crear' },
    ],
  },
  {
    scope: 'credit_notes',
    label: 'Notas crédito',
    actions: [
      { code: 'credit_notes.view', label: 'Ver' },
      { code: 'credit_notes.create', label: 'Crear' },
    ],
  },
  {
    scope: 'third_parties',
    label: 'Consulta DIAN (terceros)',
    actions: [{ code: 'third_parties.view', label: 'Consultar' }],
  },
  {
    scope: 'cash_register',
    label: 'Caja',
    actions: [
      { code: 'cash_register.view', label: 'Ver' },
      { code: 'cash_register.open', label: 'Abrir' },
      { code: 'cash_register.close', label: 'Cerrar' },
      { code: 'cash_register.reopen', label: 'Reabrir' },
      { code: 'cash_register.movements.create', label: 'Registrar entrada/salida' },
      { code: 'cash_register.counted_cash.correct', label: 'Corregir efectivo contado' },
    ],
  },
] as const;

export type PermissionCode = (typeof PERMISSION_SCOPES)[number]['actions'][number]['code'];
