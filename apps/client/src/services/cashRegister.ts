import { api } from '../lib/api';
import type { PaginatedResponse } from './products';

export interface CashRegisterResponse {
  id: string;
  registerDate: string;
  openedAt: string;
  openedById: string | null;
  openedByName: string | null;
  closedAt: string | null;
  closedById: string | null;
  closedByName: string | null;
  /** Recaudado — sum of invoices sent that day. */
  totalAmount: number | null;
  /** Adeudado — sum of that day's quotations still open (not invoiced/cancelled) at close time. */
  totalOwed: number | null;
  isOpen: boolean;
}

export interface CashRegisterStatus {
  isOpen: boolean;
  register: CashRegisterResponse | null;
  totalSoFar: number | null;
  totalOwedSoFar: number | null;
}

export interface CashRegisterQuery {
  page?: number;
  limit?: number;
}

export async function getTodayCashRegister(): Promise<CashRegisterStatus> {
  const { data } = await api.get<CashRegisterStatus>('/cash-register/today');
  return data;
}

export async function openCashRegister(): Promise<CashRegisterResponse> {
  const { data } = await api.post<CashRegisterResponse>('/cash-register/open');
  return data;
}

export async function closeCashRegister(): Promise<CashRegisterResponse> {
  const { data } = await api.post<CashRegisterResponse>('/cash-register/close');
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
