import { api } from '../lib/api';
import type { PaginatedResponse } from './products';

export interface DebitNoteResponse {
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

export interface DebitNotesQuery {
  page?: number;
  limit?: number;
  invoiceId?: string;
}

export interface CreateDebitNoteItemInput {
  productId: string;
  quantity: number;
}

export interface CreateDebitNoteInput {
  invoiceId: string;
  items: CreateDebitNoteItemInput[];
}

export async function getDebitNotes(
  query: DebitNotesQuery = {},
): Promise<PaginatedResponse<DebitNoteResponse>> {
  const { data } = await api.get<PaginatedResponse<DebitNoteResponse>>(
    '/invoicing/debit-notes',
    { params: query },
  );
  return data;
}

export async function getDebitNote(id: string): Promise<DebitNoteResponse> {
  const { data } = await api.get<DebitNoteResponse>(`/invoicing/debit-notes/${id}`);
  return data;
}

export async function createDebitNote(
  input: CreateDebitNoteInput,
): Promise<DebitNoteResponse> {
  const { data } = await api.post<DebitNoteResponse>('/invoicing/debit-notes', input);
  return data;
}
