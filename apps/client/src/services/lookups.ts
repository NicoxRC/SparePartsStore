import { api } from '../lib/api';
import type { PaginatedResponse } from './products';

export type LookupResource = 'departments' | 'groups' | 'brands';

export interface LookupResponse {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface LookupQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface LookupInput {
  code: string;
  name: string;
}

export async function getLookups(
  resource: LookupResource,
  query: LookupQuery = {},
): Promise<PaginatedResponse<LookupResponse>> {
  const { data } = await api.get<PaginatedResponse<LookupResponse>>(
    `/${resource}`,
    { params: { limit: 100, ...query } },
  );
  return data;
}

export async function getLookup(
  resource: LookupResource,
  id: string,
): Promise<LookupResponse> {
  const { data } = await api.get<LookupResponse>(`/${resource}/${id}`);
  return data;
}

export async function createLookup(
  resource: LookupResource,
  input: LookupInput,
): Promise<LookupResponse> {
  const { data } = await api.post<LookupResponse>(`/${resource}`, input);
  return data;
}

export async function updateLookup(
  resource: LookupResource,
  id: string,
  input: Partial<LookupInput>,
): Promise<LookupResponse> {
  const { data } = await api.patch<LookupResponse>(`/${resource}/${id}`, input);
  return data;
}

export async function deleteLookup(resource: LookupResource, id: string): Promise<void> {
  await api.delete(`/${resource}/${id}`);
}

export async function getDepartments(
  query: LookupQuery = {},
): Promise<PaginatedResponse<LookupResponse>> {
  return getLookups('departments', query);
}

export async function getGroups(
  query: LookupQuery = {},
): Promise<PaginatedResponse<LookupResponse>> {
  return getLookups('groups', query);
}

export async function getBrands(
  query: LookupQuery = {},
): Promise<PaginatedResponse<LookupResponse>> {
  return getLookups('brands', query);
}
