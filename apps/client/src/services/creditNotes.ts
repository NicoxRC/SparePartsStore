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

/** A line of an invoice and how much of it can still be credited. */
export interface ReturnableLine {
  sku: string;
  description: string;
  /** Pre-tax, post-discount unit price exactly as invoiced. */
  unitPrice: number;
  /** IVA rate charged on the line (0 if none). */
  taxRate: number;
  invoicedQuantity: number;
  /** Invoiced quantity minus what earlier credit notes already returned. */
  returnableQuantity: number;
}

export interface CreateCreditNoteItemInput {
  /** The sku the line was invoiced with. */
  sku: string;
  quantity: number;
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

export async function getReturnableLines(invoiceId: string): Promise<ReturnableLine[]> {
  const { data } = await api.get<ReturnableLine[]>(
    `/invoicing/credit-notes/returnable/${invoiceId}`,
  );
  return data;
}

export async function createCreditNote(
  input: CreateCreditNoteInput,
): Promise<CreditNoteResponse> {
  const { data } = await api.post<CreditNoteResponse>('/invoicing/credit-notes', input);
  return data;
}
