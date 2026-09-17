import { api } from '../lib/api';
import type { InvoiceResponse } from './invoices';
import type { PaginatedResponse } from './products';
import type { QuotationResponse } from './quotations';

export type CustomerPartyType = 'PERSONA_JURIDICA' | 'PERSONA_NATURAL';

export interface CustomerResponse {
  id: string;
  identificationType: string;
  identification: string;
  identificationDv?: string;
  partyType: CustomerPartyType;
  companyName?: string;
  firstName?: string;
  familyName?: string;
  taxLevelCode?: string;
  regimen?: string;
  countryCode?: string;
  department?: string;
  city?: string;
  addressLine?: string;
  email: string;
  phone?: string;
  responsableIva?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomersQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CustomerInput {
  identificationType: string;
  identification: string;
  identificationDv?: string;
  partyType: CustomerPartyType;
  companyName?: string;
  firstName?: string;
  familyName?: string;
  taxLevelCode?: string;
  regimen?: string;
  countryCode?: string;
  department?: string;
  city?: string;
  addressLine?: string;
  email: string;
  phone?: string;
  responsableIva?: boolean;
}

export async function getCustomers(
  query: CustomersQuery = {},
): Promise<PaginatedResponse<CustomerResponse>> {
  const { data } = await api.get<PaginatedResponse<CustomerResponse>>(
    '/customers',
    { params: query },
  );
  return data;
}

export async function getCustomer(id: string): Promise<CustomerResponse> {
  const { data } = await api.get<CustomerResponse>(`/customers/${id}`);
  return data;
}

export async function createCustomer(
  input: CustomerInput,
): Promise<CustomerResponse> {
  const { data } = await api.post<CustomerResponse>('/customers', input);
  return data;
}

export async function updateCustomer(
  id: string,
  input: Partial<CustomerInput>,
): Promise<CustomerResponse> {
  const { data } = await api.patch<CustomerResponse>(`/customers/${id}`, input);
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/customers/${id}`);
}

export interface CustomerHistoryQuery {
  /** Inclusive, YYYY-MM-DD. */
  from?: string;
  /** Inclusive, YYYY-MM-DD. */
  to?: string;
}

export interface CustomerHistoryResponse {
  invoices: InvoiceResponse[];
  quotations: QuotationResponse[];
}

export async function getCustomerHistory(
  id: string,
  query: CustomerHistoryQuery = {},
): Promise<CustomerHistoryResponse> {
  const { data } = await api.get<CustomerHistoryResponse>(
    `/customers/${id}/history`,
    { params: query },
  );
  return data;
}
