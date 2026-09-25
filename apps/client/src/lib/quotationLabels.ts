import type { QuotationBorrowerType, QuotationResponse } from '../services/quotations';

export const BORROWER_TYPE_LABEL: Record<QuotationBorrowerType, string> = {
  almacen: 'Almacén',
  empleado: 'Empleado',
};

/** Company, else the person's name, else the identification — never empty for a saved quotation. */
export function quotationCustomerLabel(quotation: QuotationResponse): string {
  const personName = [quotation.customerFirstName, quotation.customerFamilyName]
    .filter(Boolean)
    .join(' ');
  return quotation.customerCompanyName || personName || quotation.customerIdentification || '';
}
