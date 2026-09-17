import { api } from '../lib/api';
import type { InvoiceResponse } from './invoices';
import type { PaginatedResponse } from './products';

export type QuotationStatus = 'open' | 'invoiced' | 'cancelled';

export interface QuotationItemResponse {
  id: string;
  productId: string;
  productReference: string;
  productDescription: string;
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
  customerIdentificationType: string;
  customerIdentification: string;
  customerIdentificationDv: string | null;
  customerPartyType: string;
  customerTaxLevelCode: string;
  customerRegimen: string | null;
  customerCompanyName: string | null;
  customerFirstName: string | null;
  customerFamilyName: string | null;
  customerCountryCode: string;
  customerDepartment: string;
  customerCity: string;
  customerAddressLine: string;
  customerEmail: string;
  customerPhone: string | null;
  notes: string | null;
  totalAmount: number;
  invoiceId: string | null;
  createdAt: string;
  items?: QuotationItemResponse[];
}

export interface QuotationsQuery {
  page?: number;
  limit?: number;
  status?: QuotationStatus;
  search?: string;
}

export interface CreateQuotationItemInput {
  productId: string;
  quantity: number;
  taxRate: number;
  discount?: number;
}

export interface CreateQuotationInput {
  customerIdentificationType: string;
  customerIdentification: string;
  customerIdentificationDv?: string;
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
): Promise<InvoiceResponse> {
  const { data } = await api.post<InvoiceResponse>(
    `/quotations/${id}/invoice`,
    input,
  );
  return data;
}

export async function cancelQuotation(id: string): Promise<QuotationResponse> {
  const { data } = await api.post<QuotationResponse>(`/quotations/${id}/cancel`);
  return data;
}
