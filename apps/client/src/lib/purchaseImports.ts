import { getApiErrorBody } from './errors';
import type {
  ConfirmProblem,
  LineIssue,
  PurchaseImportItem,
  PurchaseImportStatus,
  PurchaseImportSummary,
  PurchaseImportSupplier,
} from '../services/purchaseImports';

export const IMPORT_STATUS_LABEL: Record<PurchaseImportStatus, string> = {
  draft: 'Borrador',
  confirmed: 'Confirmada',
  discarded: 'Descartada',
};

export const IMPORT_STATUS_STYLE: Record<PurchaseImportStatus, string> = {
  draft: 'bg-amber-tint text-amber',
  confirmed: 'bg-ok-tint text-ok',
  discarded: 'bg-rust-tint text-rust-2',
};

export const ISSUE_LABEL: Record<LineIssue | 'NO_LINES', string> = {
  MISSING_QUANTITY: 'Falta cantidad',
  MISSING_REFERENCE: 'Falta referencia',
  MISSING_DESCRIPTION: 'Falta descripción',
  MISSING_CLASSIFICATION: 'Falta clasificación',
  INVALID_SALE_PRICE: 'Precio inválido',
  DUPLICATE_NEW_REFERENCE: 'Referencia repetida',
  LINKED_PRODUCT_DELETED: 'Producto eliminado',
  NO_LINES: 'Sin líneas',
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const XML_MIME_TYPES = ['text/xml', 'application/xml'];

/** Fast client-side reject; the server decides whether the file is really usable. */
export function validateXmlFile(file: File): string | null {
  const looksLikeXml =
    file.name.toLowerCase().endsWith('.xml') || XML_MIME_TYPES.includes(file.type);
  if (!looksLikeXml) return 'El archivo debe ser un .xml de la factura electrónica.';
  if (file.size > MAX_UPLOAD_BYTES) return 'El archivo supera el máximo de 5 MB.';
  return null;
}

export function validateExcelFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return 'El archivo debe ser un .xlsx (la plantilla que descargaste).';
  }
  if (file.size > MAX_UPLOAD_BYTES) return 'El archivo supera el máximo de 5 MB.';
  return null;
}

const priceFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return priceFormatter.format(amount);
}

export function formatQuantity(quantity: number): string {
  return quantity.toLocaleString('es-CO', { maximumFractionDigits: 4 });
}

/** `issueDate` is a bare YYYY-MM-DD; building the Date from parts avoids the UTC-midnight day shift. */
export function formatIssueDate(issueDate: string): string {
  const [year, month, day] = issueDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function lineElementId(itemId: string): string {
  return `purchase-line-${itemId}`;
}

export function scrollToLine(itemId: string): void {
  document
    .getElementById(lineElementId(itemId))
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export interface ImportCounters {
  newLines: number;
  existingLines: number;
  pendingLines: number;
}

export function countLines(items: PurchaseImportItem[]): ImportCounters {
  return {
    newLines: items.filter((item) => item.status === 'new').length,
    existingLines: items.filter((item) => item.status !== 'new').length,
    pendingLines: items.filter((item) => item.issues.length > 0).length,
  };
}

export interface ConfirmSummary {
  createdProducts: number;
  restockedProducts: number;
  units: number;
  /** Existing products that get a different sale price. */
  priceChanges: number;
}

/** The new price a matched line would set, or null when it keeps the product's current one. */
export function pendingPriceChange(item: PurchaseImportItem): number | null {
  const typed = item.newProduct.salePrice;
  if (!item.product || typed === null || typed === item.product.salePrice) return null;
  return typed;
}

/** What confirming will do, computed the way the server counts it. */
export function summarizeConfirm(items: PurchaseImportItem[]): ConfirmSummary {
  const restocked = new Set<string>();
  let createdProducts = 0;
  let units = 0;
  let priceChanges = 0;
  for (const item of items) {
    if (pendingPriceChange(item) !== null) priceChanges += 1;
    if (item.product) restocked.add(item.product.id);
    else createdProducts += 1;
    units += item.quantity ?? 0;
  }
  return { createdProducts, restockedProducts: restocked.size, units, priceChanges };
}

export interface DuplicateImportInfo {
  existingImportId: string;
  existingStatus: PurchaseImportStatus;
}

/** Reads the extra fields of a 409 PURCHASE_IMPORT_DUPLICATE body; null for any other error. */
export function getDuplicateImportInfo(error: unknown): DuplicateImportInfo | null {
  const body = getApiErrorBody(error);
  if (body?.code !== 'PURCHASE_IMPORT_DUPLICATE') return null;
  const { existingImportId, existingStatus } = body;
  if (typeof existingImportId !== 'string') return null;
  return {
    existingImportId,
    existingStatus: existingStatus === 'confirmed' ? 'confirmed' : 'draft',
  };
}

/** Reads `problems[]` from a 400 PURCHASE_IMPORT_INVALID body; null for any other error. */
export function getInvalidImportProblems(error: unknown): ConfirmProblem[] | null {
  const body = getApiErrorBody(error);
  if (body?.code !== 'PURCHASE_IMPORT_INVALID' || !Array.isArray(body.problems)) return null;
  return body.problems as ConfirmProblem[];
}

export interface SupplierGroup {
  supplier: PurchaseImportSupplier;
  imports: PurchaseImportSummary[];
}

/** Groups consecutive rows of the same supplier — the API already orders drafts by supplier name. */
export function groupBySupplier(imports: PurchaseImportSummary[]): SupplierGroup[] {
  const groups: SupplierGroup[] = [];
  for (const item of imports) {
    const last = groups[groups.length - 1];
    if (last && last.supplier.id === item.supplier.id) last.imports.push(item);
    else groups.push({ supplier: item.supplier, imports: [item] });
  }
  return groups;
}

export type LineFilter = 'all' | 'pending' | 'new' | 'existing';

export function matchesLineFilter(item: PurchaseImportItem, filter: LineFilter): boolean {
  switch (filter) {
    case 'pending':
      return item.issues.length > 0;
    case 'new':
      return item.status === 'new';
    case 'existing':
      return item.status !== 'new';
    case 'all':
      return true;
  }
}
