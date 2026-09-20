import { api } from '../lib/api';
import type { PaginatedResponse, SaleType } from './products';

export type PurchaseImportStatus = 'draft' | 'confirmed' | 'discarded';

/** existing = auto-matched by reference, manual = linked by the reviewer, new = product to create. */
export type LineStatus = 'existing' | 'manual' | 'new';

export type LineIssue =
  | 'MISSING_QUANTITY'
  | 'MISSING_REFERENCE'
  | 'MISSING_DESCRIPTION'
  | 'MISSING_CLASSIFICATION'
  | 'INVALID_SALE_PRICE'
  | 'DUPLICATE_NEW_REFERENCE'
  | 'LINKED_PRODUCT_DELETED';

export interface PurchaseImportSupplier {
  id: string;
  name: string;
  nit: string;
}

export interface PurchaseImportSummary {
  id: string;
  supplier: PurchaseImportSupplier;
  invoiceNumber: string;
  /** YYYY-MM-DD */
  issueDate: string;
  status: PurchaseImportStatus;
  lineCount: number;
  sourceFilename: string;
  createdAt: string;
  createdByName: string | null;
  confirmedAt: string | null;
}

export interface PurchaseImportLinkedProduct {
  id: string;
  reference: string;
  description: string;
  stock: number;
}

export interface PurchaseImportNewProduct {
  departmentId: string | null;
  groupId: string | null;
  brandId: string | null;
  salePrice: number | null;
  saleType: SaleType;
  taxExempt: boolean;
}

export interface PurchaseImportItem {
  id: string;
  lineNumber: number;
  reference: string | null;
  description: string | null;
  /** Read-only original from the XML. */
  xmlQuantity: number;
  quantity: number | null;
  /** Supplier's unit cost — display only, never stored as the product cost. */
  unitCost: number | null;
  status: LineStatus;
  product: PurchaseImportLinkedProduct | null;
  newProduct: PurchaseImportNewProduct;
  createdProduct: boolean;
  issues: LineIssue[];
}

export interface PurchaseImportDetail extends PurchaseImportSummary {
  cufe: string | null;
  readyToConfirm: boolean;
  items: PurchaseImportItem[];
}

export interface PurchaseImportsQuery {
  page?: number;
  limit?: number;
  status?: PurchaseImportStatus;
  supplierId?: string;
  search?: string;
}

/** Every field optional; `productId: null` removes a manual link (and re-runs the reference match). */
export interface UpdatePurchaseImportItemInput {
  reference?: string;
  description?: string;
  quantity?: number;
  productId?: string | null;
  departmentId?: string | null;
  groupId?: string | null;
  brandId?: string | null;
  salePrice?: number | null;
  saleType?: SaleType;
  taxExempt?: boolean;
}

export interface ApplyClassificationInput {
  departmentId?: string;
  groupId?: string;
  brandId?: string;
}

export interface ConfirmPurchaseImportResponse {
  id: string;
  status: 'confirmed';
  confirmedAt: string;
  createdProducts: number;
  restockedProducts: number;
  unitsAdded: number;
  suppliersAssigned: number;
  /** "New" lines whose reference appeared in the catalog before confirming. */
  relinked: Array<{ lineNumber: number; reference: string }>;
}

/** One entry of the `problems[]` array in a 400 PURCHASE_IMPORT_INVALID body. */
export interface ConfirmProblem {
  itemId: string | null;
  lineNumber: number | null;
  issue: LineIssue | 'NO_LINES';
}

export async function getPurchaseImports(
  query: PurchaseImportsQuery = {},
): Promise<PaginatedResponse<PurchaseImportSummary>> {
  const { data } = await api.get<PaginatedResponse<PurchaseImportSummary>>(
    '/purchase-imports',
    { params: query },
  );
  return data;
}

export async function getPurchaseImport(id: string): Promise<PurchaseImportDetail> {
  const { data } = await api.get<PurchaseImportDetail>(`/purchase-imports/${id}`);
  return data;
}

export async function uploadPurchaseImport(file: File): Promise<PurchaseImportDetail> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<PurchaseImportDetail>('/purchase-imports', formData);
  return data;
}

export async function updatePurchaseImportItem(
  id: string,
  itemId: string,
  input: UpdatePurchaseImportItemInput,
): Promise<PurchaseImportDetail> {
  const { data } = await api.patch<PurchaseImportDetail>(
    `/purchase-imports/${id}/items/${itemId}`,
    input,
  );
  return data;
}

export async function deletePurchaseImportItem(
  id: string,
  itemId: string,
): Promise<PurchaseImportDetail> {
  const { data } = await api.delete<PurchaseImportDetail>(
    `/purchase-imports/${id}/items/${itemId}`,
  );
  return data;
}

export async function applyClassification(
  id: string,
  input: ApplyClassificationInput,
): Promise<PurchaseImportDetail> {
  const { data } = await api.post<PurchaseImportDetail>(
    `/purchase-imports/${id}/apply-classification`,
    input,
  );
  return data;
}

export async function confirmPurchaseImport(
  id: string,
): Promise<ConfirmPurchaseImportResponse> {
  const { data } = await api.post<ConfirmPurchaseImportResponse>(
    `/purchase-imports/${id}/confirm`,
  );
  return data;
}

export async function discardPurchaseImport(id: string): Promise<PurchaseImportDetail> {
  const { data } = await api.post<PurchaseImportDetail>(`/purchase-imports/${id}/discard`);
  return data;
}
