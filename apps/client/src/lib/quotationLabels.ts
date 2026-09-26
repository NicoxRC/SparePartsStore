import type { QuotationCustomerType, QuotationResponse } from '../services/quotations';

export const CUSTOMER_TYPE_LABEL: Record<QuotationCustomerType, string> = {
  empresa: 'Empresa',
  empleado: 'Empleado',
};

/** No field of its own: a NIT is an empresa, a cédula an empleado (confirmed by the store). */
export function quotationCustomerType(quotation: QuotationResponse): QuotationCustomerType {
  return quotation.customerIdentificationType === 'NIT' ? 'empresa' : 'empleado';
}

/** Company, else the person's name, else the identification. */
export function quotationCustomerLabel(quotation: QuotationResponse): string {
  const personName = [quotation.customerFirstName, quotation.customerFamilyName]
    .filter(Boolean)
    .join(' ');
  return quotation.customerCompanyName || personName || quotation.customerIdentification;
}
