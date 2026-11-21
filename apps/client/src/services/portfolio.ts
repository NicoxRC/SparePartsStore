import { api } from '../lib/api';
import type { QuotationCustomerType } from './quotations';

export type PaymentMeans = 'CASH' | 'CARD' | 'BANK_TRANSFER';

/** Which quotations count, by the store day they were made ('YYYY-MM-DD', both optional). */
export interface PortfolioRange {
  from?: string;
  to?: string;
}

export interface PortfolioQuery extends PortfolioRange {
  search?: string;
  customerType?: QuotationCustomerType;
}

export interface PortfolioTotals {
  totalAmount: number;
  /** Paid through abonos that weren't voided. */
  paidAmount: number;
  /** Still to collect. */
  balance: number;
  quotationCount: number;
}

export interface PortfolioCustomer {
  identificationType: string;
  identification: string;
  name: string;
  phone: string | null;
}

export interface PortfolioCustomerSummary extends PortfolioCustomer {
  totals: PortfolioTotals;
  /** The oldest open quotation — the payment term counts from here. */
  oldestCreatedAt: string;
  lastChangedAt: string;
}

export interface PortfolioSummary {
  totals: PortfolioTotals;
  /** Biggest balance first. */
  customers: PortfolioCustomerSummary[];
}

export interface QuotationPayment {
  id: string;
  amount: number;
  paymentMeans: PaymentMeans;
  notes: string | null;
  createdAt: string;
  createdByName: string | null;
  voidedAt: string | null;
  voidedByName: string | null;
}

export interface PortfolioQuotation {
  id: string;
  number: number;
  createdAt: string;
  lastChangedAt: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  /** Oldest first, voided ones included. */
  payments: QuotationPayment[];
}

export interface CustomerPortfolio {
  customer: PortfolioCustomer;
  totals: PortfolioTotals;
  /** Oldest first. */
  quotations: PortfolioQuotation[];
}

export interface CreatePaymentInput {
  amount: number;
  paymentMeans: PaymentMeans;
  notes?: string;
}

export interface CreatePaymentResult {
  paymentId: string;
  quotationId: string;
  balance: number;
  /** This abono paid it off and closed it. */
  quotationCompleted: boolean;
}

export interface VoidPaymentResult {
  quotationId: string;
  quotationReopened: boolean;
}

export async function getPortfolio(query: PortfolioQuery): Promise<PortfolioSummary> {
  const { data } = await api.get<PortfolioSummary>('/portfolio', { params: query });
  return data;
}

export async function getCustomerPortfolio(
  identification: string,
  range: PortfolioRange,
): Promise<CustomerPortfolio> {
  const { data } = await api.get<CustomerPortfolio>(
    `/portfolio/customers/${encodeURIComponent(identification)}`,
    { params: range },
  );
  return data;
}

export async function createQuotationPayment(
  quotationId: string,
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const { data } = await api.post<CreatePaymentResult>(
    `/portfolio/quotations/${quotationId}/payments`,
    input,
  );
  return data;
}

export async function voidQuotationPayment(paymentId: string): Promise<VoidPaymentResult> {
  const { data } = await api.post<VoidPaymentResult>(`/portfolio/payments/${paymentId}/void`);
  return data;
}
