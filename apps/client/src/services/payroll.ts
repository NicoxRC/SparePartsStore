import { api } from '../lib/api';
import type { PaginatedResponse } from './products';

export interface PayrollEntryResponse {
  id: string;
  number: number;
  prefix: string;
  employeeIdentification: string;
  employeeName: string;
  salary: number;
  initialSettlementDate: string;
  finalSettlementDate: string;
  dianStatus: string | null;
  cufe: string | null;
  pdfUrl: string | null;
  createdAt: string;
}

export interface PayrollEntriesQuery {
  page?: number;
  limit?: number;
}

export interface PayrollLineItemInput {
  code: string;
  amount: number;
  days?: number;
  percentage?: number;
  description?: string;
}

export interface CreatePayrollEntryInput {
  prefix: string;
  number: number;
  salary: number;
  periodicity: string;
  initialSettlementDate: string;
  finalSettlementDate: string;
  issueDate: string;
  paymentDate: string;
  notes?: string[];
  accruals: PayrollLineItemInput[];
  deductions?: PayrollLineItemInput[];
  employee: {
    identificationType: string;
    identification: string;
    firstName: string;
    otherNames?: string;
    lastName: string;
    secondLastName?: string;
    email: string;
    integralSalary: boolean;
    highRisk: boolean;
    startDate: string;
    workerType: string;
    subCode: string;
    paymentMeans: string;
    contractType: string;
    address: {
      line: string;
      city: string;
      department: string;
    };
  };
}

export async function getPayrollEntries(
  query: PayrollEntriesQuery = {},
): Promise<PaginatedResponse<PayrollEntryResponse>> {
  const { data } = await api.get<PaginatedResponse<PayrollEntryResponse>>(
    '/invoicing/payroll-entries',
    { params: query },
  );
  return data;
}

export async function createPayrollEntry(
  input: CreatePayrollEntryInput,
): Promise<PayrollEntryResponse> {
  const { data } = await api.post<PayrollEntryResponse>(
    '/invoicing/payroll-entries',
    input,
  );
  return data;
}

export async function refreshPayrollEntryStatus(
  id: string,
): Promise<PayrollEntryResponse> {
  const { data } = await api.post<PayrollEntryResponse>(
    `/invoicing/payroll-entries/${id}/refresh`,
  );
  return data;
}
