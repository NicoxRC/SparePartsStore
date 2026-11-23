import { api } from '../lib/api';
import type { InvoiceResponse } from './invoices';
import type { PaginatedResponse } from './products';
import type { QuotationPayment } from './portfolio';

export type QuotationStatus = 'open' | 'invoiced' | 'completed' | 'cancelled' | 'merged';

/** Derived server-side from the identification type: NIT → empresa, cédula → empleado. */
export type QuotationCustomerType = 'empresa' | 'empleado';

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
  /** Paid so far through abonos (cartera) that weren't voided. */
  paidAmount: number;
  invoiceId: string | null;
  /** The quotation this one was merged into (status `merged`). */
  mergedIntoId: string | null;
  mergedIntoNumber: number | null;
  createdAt: string;
  /** When its items last changed (while open) — informative; the payment term counts from `createdAt`. */
  lastChangedAt: string;
  /** Who made the quotation — the "vendedor" on the printout. */
  createdByName: string | null;
  items?: QuotationItemResponse[];
  /** Detail only: its abonos, oldest first, voided ones included (registered in Cartera). */
  payments?: QuotationPayment[];
  /** Detail only: the notes history, newest first. Not the same as `notes`. */
  quotationNotes?: QuotationNote[];
}

/** One entry of a quotation's notes history. */
export interface QuotationNote {
  id: string;
  text: string;
  createdAt: string;
  createdByName: string | null;
}

export interface QuotationsQuery {
  page?: number;
  limit?: number;
  status?: QuotationStatus;
  customerType?: QuotationCustomerType;
  search?: string;
  /** Exact match — a customer's own quotations. */
  customerIdentification?: string;
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

/** Every customer field of a quotation — sent whole, a field left out is cleared. */
export type UpdateQuotationCustomerInput = Omit<CreateQuotationInput, 'items' | 'notes'>;

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

export interface OpenQuotationsSummary {
  /** Sum of every open quotation, any day — still to collect. */
  total: number;
  count: number;
}

export async function getOpenQuotationsSummary(): Promise<OpenQuotationsSummary> {
  const { data } = await api.get<OpenQuotationsSummary>('/quotations/open-summary');
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

export async function updateQuotationCustomer(
  id: string,
  input: UpdateQuotationCustomerInput,
): Promise<QuotationResponse> {
  const { data } = await api.patch<QuotationResponse>(
    `/quotations/${id}/customer`,
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

/** Folds the given open quotations (same customer) into the oldest one — returns that one. */
export async function mergeQuotations(quotationIds: string[]): Promise<QuotationResponse> {
  const { data } = await api.post<QuotationResponse>('/quotations/merge', { quotationIds });
  return data;
}

export async function completeQuotation(id: string): Promise<QuotationResponse> {
  const { data } = await api.post<QuotationResponse>(`/quotations/${id}/complete`);
  return data;
}

export async function cancelQuotation(id: string): Promise<QuotationResponse> {
  const { data } = await api.post<QuotationResponse>(`/quotations/${id}/cancel`);
  return data;
}

export async function addQuotationNote(id: string, text: string): Promise<QuotationNote> {
  const { data } = await api.post<QuotationNote>(`/quotations/${id}/notes`, { text });
  return data;
}

export async function removeQuotationNote(noteId: string): Promise<void> {
  await api.delete(`/quotations/notes/${noteId}`);
}
