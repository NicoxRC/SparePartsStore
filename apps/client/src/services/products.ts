import { api } from '../lib/api';

export interface ProductResponse {
  id: string;
  reference: string;
  description: string;
  cost: number;
  salePrice: number;
  department: string;
  group: string;
  line: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  group?: string;
  line?: string;
}

export interface ProductInput {
  reference: string;
  description: string;
  salePrice: number;
  department: string;
  group: string;
  line: string;
}

export async function getProducts(
  query: ProductsQuery = {},
): Promise<PaginatedResponse<ProductResponse>> {
  const { data } = await api.get<PaginatedResponse<ProductResponse>>(
    '/products',
    { params: query },
  );
  return data;
}

export async function getProduct(id: string): Promise<ProductResponse> {
  const { data } = await api.get<ProductResponse>(`/products/${id}`);
  return data;
}

export async function createProduct(
  input: ProductInput,
): Promise<ProductResponse> {
  const { data } = await api.post<ProductResponse>('/products', input);
  return data;
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<ProductResponse> {
  const { data } = await api.patch<ProductResponse>(`/products/${id}`, input);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}
