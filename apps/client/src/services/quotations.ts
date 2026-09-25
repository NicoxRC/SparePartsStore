import { api } from '../lib/api';
import type { InvoiceResponse } from './invoices';
import type { PaginatedResponse } from './products';

export type QuotationStatus = 'open' | 'invoiced' | 'cancelled';

/** Who the merchandise is lent to: an almacén (with invoice data) or an empleado (name only). */
export type QuotationBorrowerType = 'almacen' | 'empleado';

export interface QuotationItemResponse {
  id: string;
  /** null for a one-off line (not a catalog product). */
  productId: string | null;
  productReference: string | null;
  productDescription: string;
  productBrand: string | null;
  quantity: number;
  taxRate: number;
  discount: number | null;
  /** Locked at creation/last edit — see the backend entity's docstring. */
  unitPrice: number;
}

export interface QuotationResponse {
  id: string;
  number: number;
  status: QuotationStatus;
  borrowerType: QuotationBorrowerType;
  customerIdentificationType: string | null;
  customerIdentification: string | null;
  customerIdentificationDv: string | null;
  customerPartyType: string | null;
  customerTaxLevelCode: string | null;
  customerRegimen: string | null;
  customerCompanyName: string | null;
  customerFirstName: string | null;
  customerFamilyName: string | null;
  customerCountryCode: string | null;
  customerDepartment: string | null;
  customerCity: string | null;
  customerAddressLine: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  totalAmount: number;
  invoiceId: string | null;
  createdAt: string;
  /** Who made the quotation — the "vendedor" on the printout. */
  createdByName: string | null;
  items?: QuotationItemResponse[];
}

export interface QuotationsQuery {
  page?: number;
  limit?: number;
  status?: QuotationStatus;
  borrowerType?: QuotationBorrowerType;
  search?: string;
}

/** A catalog product (`productId`) or a one-off line (`description` + `customUnitPrice`) — never both. */
export interface CreateQuotationItemInput {
  productId?: string;
  description?: string;
  customUnitPrice?: number;
  quantity: number;
  discount?: number;
  /** Charges a catalog line at a different price than the product's own, for this quotation only — never written back to the product. Only honored when the line is first added — see CreateQuotationItemDto. */
  unitPriceOverride?: number;
}

/** An almacén needs every invoice-data field; an empleado only `customerFirstName`. */
export interface CreateQuotationInput {
  borrowerType: QuotationBorrowerType;
  customerIdentificationType?: string;
  customerIdentification?: string;
  customerIdentificationDv?: string;
  customerPartyType?: string;
  customerTaxLevelCode?: string;
  customerRegimen?: string;
  customerCompanyName?: string;
  customerFirstName?: string;
  customerFamilyName?: string;
  customerCountryCode?: string;
  customerDepartment?: string;
  customerCity?: string;
  customerAddressLine?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: CreateQuotationItemInput[];
  notes?: string;
}

export interface UpdateQuotationItemsInput {
  items: CreateQuotationItemInput[];
}

export interface InvoiceQuotationCustomerInput {
  customerIdentificationType: string;
  customerIdentification: string;
  customerPartyType: string;
  customerTaxLevelCode: string;
  customerRegimen?: string;
  customerCompanyName?: string;
  customerFirstName?: string;
  customerFamilyName?: string;
  customerCountryCode: string;
  customerDepartment: string;
  customerCity: string;
  customerAddressLine: string;
  customerEmail: string;
}

export interface InvoiceQuotationInput {
  paymentDate?: string;
  paymentMeans: string;
  paymentMeansType: string;
  useSameCustomer: boolean;
  customer?: InvoiceQuotationCustomerInput;
  notes?: string[];
}

export async function getQuotations(
  query: QuotationsQuery = {},
): Promise<PaginatedResponse<QuotationResponse>> {
  const { data } = await api.get<PaginatedResponse<QuotationResponse>>(
    '/quotations',
    { params: query },
  );
  return data;
}

export async function getQuotation(id: string): Promise<QuotationResponse> {
  const { data } = await api.get<QuotationResponse>(`/quotations/${id}`);
  return data;
}

export async function createQuotation(
  input: CreateQuotationInput,
): Promise<QuotationResponse> {
  const { data } = await api.post<QuotationResponse>('/quotations', input);
  return data;
}

export async function updateQuotationItems(
  id: string,
  input: UpdateQuotationItemsInput,
): Promise<QuotationResponse> {
  const { data } = await api.patch<QuotationResponse>(
    `/quotations/${id}/items`,
    input,
  );
  return data;
}

export async function invoiceQuotation(
  id: string,
  input: InvoiceQuotationInput,
): Promise<InvoiceResponse[]> {
  const { data } = await api.post<InvoiceResponse[]>(
    `/quotations/${id}/invoice`,
    input,
  );
  return data;
}

export async function cancelQuotation(id: string): Promise<QuotationResponse> {
  const { data } = await api.post<QuotationResponse>(`/quotations/${id}/cancel`);
  return data;
}
