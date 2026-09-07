import { api } from '../lib/api';
import type { PaginatedResponse } from './products';

export interface PosInvoiceResponse {
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
  totalAmount: number;
  createdAt: string;
}

export interface PosInvoicesQuery {
  page?: number;
  limit?: number;
}

export interface CreatePosInvoiceItemInput {
  productId: string;
  quantity: number;
  taxRate: number;
}

export interface CreatePosInvoiceInput {
  number: number;
  issueDate: string;
  paymentMeansCode: string;
  paymentMeansType: string;
  customerType: string;
  customerIdentificationType: string;
  customerIdentification: string;
  customerCompanyName?: string;
  customerFirstName?: string;
  customerFamilyName?: string;
  customerPhone?: string;
  customerEmail: string;
  responsableIva: boolean;
  items: CreatePosInvoiceItemInput[];
}

export async function getPosInvoices(
  query: PosInvoicesQuery = {},
): Promise<PaginatedResponse<PosInvoiceResponse>> {
  const { data } = await api.get<PaginatedResponse<PosInvoiceResponse>>(
    '/invoicing/pos-invoices',
    { params: query },
  );
  return data;
}

export async function createPosInvoice(
  input: CreatePosInvoiceInput,
): Promise<PosInvoiceResponse> {
  const { data } = await api.post<PosInvoiceResponse>(
    '/invoicing/pos-invoices',
    input,
  );
  return data;
}

export async function refreshPosInvoiceStatus(
  id: string,
): Promise<PosInvoiceResponse> {
  const { data } = await api.post<PosInvoiceResponse>(
    `/invoicing/pos-invoices/${id}/refresh`,
  );
  return data;
}
