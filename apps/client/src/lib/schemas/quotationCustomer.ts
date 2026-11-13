import type { z } from 'zod';
import { invoiceFormObjectSchema } from './invoice';

/** The customer block of a quotation — same rules as on Venta/Nueva cotización. */
export const quotationCustomerSchema = invoiceFormObjectSchema.pick({
  customerIdentificationType: true,
  customerIdentification: true,
  customerIdentificationDv: true,
  customerPhone: true,
  customerPartyType: true,
  customerTaxLevelCode: true,
  customerRegimen: true,
  customerCompanyName: true,
  customerFirstName: true,
  customerFamilyName: true,
  customerCountryCode: true,
  customerDepartment: true,
  customerCity: true,
  customerAddressLine: true,
  customerEmail: true,
});

export type QuotationCustomerFormValues = z.output<typeof quotationCustomerSchema>;
