import { api } from '../lib/api';

export type SaleType = 'normal' | 'neto';


export interface ProductLookupRef {
  id: string;
  name: string;
}

export interface ProductResponse {
  id: string;
  reference: string;
  description: string;
  salePrice: number;
  cost: number;
  saleType: SaleType;
  /** True while the supplier is INVENTARIO INICIAL: the cost follows the sale price. */
  costDerived: boolean;
  stock: number;
  taxExempt: boolean;
  /** Cloudinary URL of the product photo. */
  imageUrl: string | null;
  department: ProductLookupRef;
  group: ProductLookupRef;
  brand: ProductLookupRef;
  supplier: ProductLookupRef | null;
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
  supplierId?: string;
}

export interface ProductInput {
  reference: string;
  description: string;
  salePrice: number;
  saleType?: SaleType;
  /** Only applied by the API to a product with a real supplier. */
  cost?: number;
  stock: number;
  departmentId: string;
  groupId: string;
  brandId: string;
  taxExempt?: boolean;
  /** `null` on update clears the supplier tag; omitted leaves it untouched. */
  supplierId?: string | null;
  /** `null` on update removes the photo; omitted leaves it untouched. */
  imageUrl?: string | null;
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

interface ImageUploadSignature {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

/**
 * Uploads a photo straight to Cloudinary with a signature from the API and
 * returns its URL. Plain `fetch`, not `api`: our auth header must not go to
 * Cloudinary.
 */
export async function uploadProductImage(file: File): Promise<string> {
  const { data: signed } = await api.post<ImageUploadSignature>(
    '/products/image-upload-signature',
  );
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', signed.apiKey);
  body.append('timestamp', String(signed.timestamp));
  body.append('folder', signed.folder);
  body.append('signature', signed.signature);

  const response = await fetch(signed.uploadUrl, { method: 'POST', body });
  if (!response.ok) {
    throw new Error('No se pudo subir la foto. Intenta de nuevo.');
  }
  const { secure_url } = (await response.json()) as { secure_url: string };
  return secure_url;
}

/** A smaller, compressed version of a Cloudinary photo for display. */
export function productImageThumbnail(url: string, width: number): string {
  return url.replace('/image/upload/', `/image/upload/c_limit,w_${width},q_auto,f_auto/`);
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

export async function checkReference(
  reference: string,
): Promise<{ exists: boolean }> {
  const { data } = await api.get<{ exists: boolean }>(
    '/products/check-reference',
    { params: { reference } },
  );
  return data;
}
