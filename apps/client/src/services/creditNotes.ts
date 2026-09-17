import { api } from '../lib/api';
import type { PaginatedResponse } from './products';

export interface CreditNoteResponse {
  id: string;
  number: number;
  prefix: string;
  dataicoNumber: string | null;
  invoiceId: string;
  /** The corrected invoice's own business number, e.g. "FE123". */
  invoiceLabel: string;
  reason: string;
  issueDate: string;
  dianStatus: string | null;
  cufe: string | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  dianMessages: string[] | null;
  totalAmount: number;
  createdAt: string;
}

export interface CreditNotesQuery {
  page?: number;
  limit?: number;
  invoiceId?: string;
}

export interface CreateCreditNoteItemInput {
  productId: string;
  quantity: number;
  taxRate: number;
}

export interface CreateCreditNoteInput {
  invoiceId: string;
  items: CreateCreditNoteItemInput[];
}

export async function getCreditNotes(
  query: CreditNotesQuery = {},
): Promise<PaginatedResponse<CreditNoteResponse>> {
  const { data } = await api.get<PaginatedResponse<CreditNoteResponse>>(
    '/invoicing/credit-notes',
    { params: query },
  );
  return data;
}

export async function getCreditNote(id: string): Promise<CreditNoteResponse> {
  const { data } = await api.get<CreditNoteResponse>(`/invoicing/credit-notes/${id}`);
  return data;
}

export async function createCreditNote(
  input: CreateCreditNoteInput,
): Promise<CreditNoteResponse> {
  const { data } = await api.post<CreditNoteResponse>('/invoicing/credit-notes', input);
  return data;
}
