import { api } from '../lib/api';
import type { PaginatedResponse } from './products';

export type ResolutionDocumentType = 'invoice' | 'support_docs';

export interface ResolutionResponse {
  id: string;
  documentType: ResolutionDocumentType;
  prefix: string;
  subtype: string;
  resolutionCode: string;
  resolutionCodeMessage: string | null;
  resolutionNumber: string;
  rangeStart: number;
  rangeEnd: number;
  technicalKey: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface ResolutionsQuery {
  page?: number;
  limit?: number;
  documentType?: ResolutionDocumentType;
}

export interface CreateResolutionInput {
  documentType: ResolutionDocumentType;
  prefix: string;
  subtype: string;
  resolutionCode: string;
  resolutionCodeMessage?: string;
  resolutionNumber: string;
  rangeStart: number;
  rangeEnd: number;
  technicalKey?: string;
  startDate: string;
  endDate: string;
}

export async function getResolutions(
  query: ResolutionsQuery = {},
): Promise<PaginatedResponse<ResolutionResponse>> {
  const { data } = await api.get<PaginatedResponse<ResolutionResponse>>(
    '/invoicing/resolutions',
    { params: query },
  );
  return data;
}

export async function createResolution(
  input: CreateResolutionInput,
): Promise<ResolutionResponse> {
  const { data } = await api.post<ResolutionResponse>(
    '/invoicing/resolutions',
    input,
  );
  return data;
}
