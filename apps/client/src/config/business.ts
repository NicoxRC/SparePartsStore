/**
 * The store's own data, printed at the top of the invoice receipt (tirilla).
 * A single store uses this app, so it lives here rather than in a table or
 * in env vars — it is public information already printed on every receipt.
 */
export const BUSINESS_PROFILE = {
  name: 'PEDRO VICENTE PEJENDINO DELGADO',
  document: 'CC 12978403',
  taxRegime: 'RESPONSABLE DE IVA',
  phone: '7360391',
  email: 'casadelosrepuestos@hotmail.com',
  address: 'CR 16 13 06 AV JULIAN BUCHELLI, PASTO (NARIÑO)',
  taxNotices: [
    'No somos gran contribuyente',
    'No somos agente retenedor del Impuesto sobre las Ventas - IVA',
    'No somos autorretenedor del Impuesto sobre la Renta y Complementarios',
  ],
  softwareProvider: 'Software DATAICO fabricado por Proveedor Tecnológico DATAICO SAS',
  softwareProviderNit: '901123618',
  /** The header of the printed quotation, as the store's existing quotation slip has it. */
  quotationHeader: {
    title: 'LA CASA DE LOS REPUESTOS',
    taxId: 'NIT 12.978.403-6',
    regime: 'Persona natural régimen común',
    address: 'Cra 16 No. 13-08 Av. Julián Bucheli',
  },
} as const;
