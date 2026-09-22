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

/** A catalog product (`productId`) or a one-off line (`description` + `customUnitPrice`) — never both. */
export interface CreateInvoiceItemInput {
  productId?: string;
  description?: string;
  customUnitPrice?: number;
  quantity: number;
  /** Fixed COP amount, not a percentage — see CreateInvoiceItemDto. */
  discount?: number;
  /** Charges a catalog line at a different price than the product's own, for this sale only — never written back to the product. */
  unitPriceOverride?: number;
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

export interface InvoiceTicket {
  number: string;
  operationType: string;
  /** ISO — when the invoice was generated. */
  issuedAt: string;
  /** YYYY-MM-DD */
  dueDate: string | null;
  validatedAt: string | null;
  paymentForm: string;
  paymentMeans: string;
  currency: string;
  customer: {
    name: string;
    identificationType: string;
    identification: string;
    email: string;
    address: string | null;
    city: string | null;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    /** Pre-tax value of the line. */
    value: number;
    taxRate: number;
  }>;
  subtotal: number;
  taxes: Array<{ rate: number; amount: number }>;
  total: number;
  authorization: {
    resolutionNumber: string;
    prefix: string;
    startDate: string | null;
    endDate: string | null;
    rangeStart: number | null;
    rangeEnd: number | null;
  } | null;
  qrCode: string | null;
  cufe: string | null;
  dianStatus: string | null;
  isDianValidated: boolean;
}

export async function getInvoiceTicket(id: string): Promise<InvoiceTicket> {
  const { data } = await api.get<InvoiceTicket>(`/invoicing/invoices/${id}/ticket`);
  return data;
}
