import { api } from '../lib/api';
import type { PaginatedResponse } from './products';

/** A line exactly as it was invoiced — it never changes when the product's price does. */
export interface InvoicedItem {
  sku: string;
  description: string;
  quantity: number;
  /** Pre-tax, post-discount unit price. */
  unitPrice: number;
  taxRate: number;
}

export interface InvoiceResponse {
  id: string;
  number: number;
  prefix: string;
  dataicoNumber: string | null;
  customerIdentification: string;
  customerCompanyName: string | null;
  issueDate: string;
  dianStatus: string | null;
  cufe: string | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  dianMessages: string[] | null;
  totalAmount: number;
  createdAt: string;
  items: InvoicedItem[];
}

export interface InvoicesQuery {
  page?: number;
  limit?: number;
}

export interface CreateInvoiceItemInput {
  productId: string;
  quantity: number;
  /** Fixed COP amount, not a percentage — see CreateInvoiceItemDto. */
  discount?: number;
}

export interface CreateInvoiceInput {
  paymentDate?: string;
  paymentMeans: string;
  paymentMeansType: string;
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
  items: CreateInvoiceItemInput[];
  notes?: string[];
}

export async function getInvoices(
  query: InvoicesQuery = {},
): Promise<PaginatedResponse<InvoiceResponse>> {
  const { data } = await api.get<PaginatedResponse<InvoiceResponse>>(
    '/invoicing/invoices',
    { params: query },
  );
  return data;
}

export async function getInvoice(id: string): Promise<InvoiceResponse> {
  const { data } = await api.get<InvoiceResponse>(`/invoicing/invoices/${id}`);
  return data;
}

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<InvoiceResponse> {
  const { data } = await api.post<InvoiceResponse>(
    '/invoicing/invoices',
    input,
  );
  return data;
}

export interface ResendInvoiceInput {
  sendDian?: boolean;
  sendEmail?: boolean;
}

export async function resendInvoice(
  id: string,
  input: ResendInvoiceInput = {},
): Promise<InvoiceResponse> {
  const { data } = await api.post<InvoiceResponse>(
    `/invoicing/invoices/${id}/resend`,
    input,
  );
  return data;
}

export async function refreshInvoiceStatus(
  id: string,
): Promise<InvoiceResponse> {
  const { data } = await api.post<InvoiceResponse>(
    `/invoicing/invoices/${id}/refresh`,
  );
  return data;
}
