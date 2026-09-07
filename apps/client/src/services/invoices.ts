import { api } from '../lib/api';
import type { PaginatedResponse } from './products';

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
}

export interface InvoicesQuery {
  page?: number;
  limit?: number;
}

export interface CreateInvoiceItemInput {
  productId: string;
  quantity: number;
  taxRate: number;
}

export interface CreateInvoiceInput {
  number: number;
  issueDate: string;
  paymentDate: string;
  paymentMeans: string;
  paymentMeansType: string;
  orderReference?: string;
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

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<InvoiceResponse> {
  const { data } = await api.post<InvoiceResponse>(
    '/invoicing/invoices',
    input,
  );
  return data;
}
