import { api } from '../lib/api';

export interface ProductLookupRef {
  id: string;
  code: string;
  name: string;
}

export interface ProductResponse {
  id: string;
  reference: string;
  description: string;
  cost: number;
  salePrice: number;
  stock: number;
  department: ProductLookupRef;
  group: ProductLookupRef;
  brand: ProductLookupRef;
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
  departmentId?: string;
  groupId?: string;
  brandId?: string;
}

export interface ProductInput {
  reference: string;
  description: string;
  salePrice: number;
  stock: number;
  departmentId: string;
  groupId: string;
  brandId: string;
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
