import { api } from '../lib/api';
import type { PaginatedResponse } from './products';

export interface CashMovement {
  id: string;
  /** Positivo = entrada, negativo = salida. */
  amount: number;
  reason: string;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface CashRegisterNote {
  id: string;
  type: 'debit' | 'credit';
  number: number;
  prefix: string;
  totalAmount: number;
  invoiceNumber: number;
  invoicePrefix: string;
  createdAt: string;
}

export interface CashRegisterResponse {
  id: string;
  registerDate: string;
  openedAt: string;
  openedById: string | null;
  openedByName: string | null;
  /** Efectivo contado en caja al abrir ("base"). */
  openingAmount: number;
  closedAt: string | null;
  closedById: string | null;
  closedByName: string | null;
  /** Recaudado — sum of invoices sent that day. */
  totalAmount: number | null;
  /** Adeudado — sum of that day's quotations still open (not invoiced/cancelled) at close time. */
  totalOwed: number | null;
  totalCash: number | null;
  totalCard: number | null;
  totalTransfer: number | null;
  expectedCash: number | null;
  countedCash: number | null;
  cashDiscrepancy: number | null;
  movements: CashMovement[];
  /** Debit/credit notes issued that store day — informational only, not
   * part of totalCash/expectedCash. */
  notes: CashRegisterNote[];
  isOpen: boolean;
}

export interface CashRegisterStatus {
  isOpen: boolean;
  register: CashRegisterResponse | null;
  totalSoFar: number | null;
  totalOwedSoFar: number | null;
  expectedCashSoFar: number | null;
  previousClosingCash: number | null;
}

export interface CashRegisterQuery {
  page?: number;
  limit?: number;
}

export async function getTodayCashRegister(): Promise<CashRegisterStatus> {
  const { data } = await api.get<CashRegisterStatus>('/cash-register/today');
  return data;
}

export async function openCashRegister(
  openingAmount: number,
): Promise<CashRegisterResponse> {
  const { data } = await api.post<CashRegisterResponse>('/cash-register/open', {
    openingAmount,
  });
  return data;
}

export async function closeCashRegister(
  countedCash: number,
): Promise<CashRegisterResponse> {
  const { data } = await api.post<CashRegisterResponse>('/cash-register/close', {
    countedCash,
  });
  return data;
}

/** Closes a register from an earlier day that was never closed. `countedCash`
 * may be left out: the server then takes the expected cash as counted. */
export async function closePastCashRegister(
  id: string,
  countedCash?: number,
): Promise<CashRegisterResponse> {
  const { data } = await api.post<CashRegisterResponse>(`/cash-register/${id}/close`, {
    countedCash,
  });
  return data;
}

export async function reopenCashRegister(): Promise<CashRegisterResponse> {
  const { data } = await api.post<CashRegisterResponse>('/cash-register/reopen');
  return data;
}

export async function updateCountedCash(
  id: string,
  countedCash: number,
): Promise<CashRegisterResponse> {
  const { data } = await api.patch<CashRegisterResponse>(
    `/cash-register/${id}/counted-cash`,
    { countedCash },
  );
  return data;
}

export async function createCashMovement(input: {
  amount: number;
  reason: string;
}): Promise<CashRegisterResponse> {
  const { data } = await api.post<CashRegisterResponse>(
    '/cash-register/movements',
    input,
  );
  return data;
}

export async function getCashRegisterHistory(
  query: CashRegisterQuery = {},
): Promise<PaginatedResponse<CashRegisterResponse>> {
  const { data } = await api.get<PaginatedResponse<CashRegisterResponse>>(
    '/cash-register',
    { params: query },
  );
  return data;
}

export interface DayInvoiceRow {
  number: string;
  total: number;
  /** null when the invoice was paid with something other than cash/card/transfer. */
  paymentMeans: 'CASH' | 'CARD' | 'BANK_TRANSFER' | null;
}

export interface DayPaymentTotal {
  count: number;
  amount: number;
}

/** Every invoice of a register's day and how it adds up — the second page of the printed slip. */
export interface DayInvoicesReport {
  registerDate: string;
  invoices: DayInvoiceRow[];
  invoiceCount: number;
  cash: DayPaymentTotal;
  card: DayPaymentTotal;
  transfer: DayPaymentTotal;
  taxable: number;
  tax: number;
  exempt: number;
  total: number;
}

export async function getDayInvoicesReport(id: string): Promise<DayInvoicesReport> {
  const { data } = await api.get<DayInvoicesReport>(`/cash-register/${id}/invoices`);
  return data;
}
