import { DEFAULT_DANE_CITY_CODE, DEFAULT_DANE_DEPARTMENT_CODE } from './dane';
import type { InvoiceFormInput } from './schemas/invoice';

export type InvoiceStep = 'products' | 'customer' | 'invoice';

/**
 * One in-progress invoice being built — several can exist at once (e.g.
 * more than one customer at the counter), each independently persisted so
 * switching between them, or navigating away to Productos/Inventario and
 * back, never loses data. See InvoiceDraftsContext for where these live.
 */
export interface InvoiceDraft {
  id: string;
  step: InvoiceStep;
  /** Mirrors the form-local state used to choose create vs. update when
   * auto-saving the customer — kept here so it survives switching tabs. */
  selectedCustomerId: string | null;
  values: InvoiceFormInput;
}

export function createEmptyInvoiceDraft(): InvoiceDraft {
  return {
    id: crypto.randomUUID(),
    step: 'products',
    selectedCustomerId: null,
    values: {
      // Pre-filled in case paymentMeansType switches to CREDITO — the
      // field itself is only shown/required then.
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMeans: 'CASH',
      paymentMeansType: 'DEBITO',
      customerIdentificationType: 'NIT',
      customerIdentification: '',
      customerIdentificationDv: '',
      customerPhone: '',
      customerPartyType: 'PERSONA_JURIDICA',
      customerTaxLevelCode: 'COMUN',
      customerRegimen: '',
      customerCompanyName: '',
      customerFirstName: '',
      customerFamilyName: '',
      customerCountryCode: 'CO',
      customerDepartment: DEFAULT_DANE_DEPARTMENT_CODE,
      customerCity: DEFAULT_DANE_CITY_CODE,
      customerAddressLine: '',
      customerEmail: '',
      items: [],
      notes: '',
    },
  };
}

/** Tab label: the customer's name once entered, otherwise "Factura N". */
export function invoiceDraftLabel(draft: InvoiceDraft, index: number): string {
  const { values } = draft;
  const personName = [values.customerFirstName, values.customerFamilyName]
    .filter(Boolean)
    .join(' ');
  return values.customerCompanyName || personName || `Factura ${index + 1}`;
}
