import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  applyClassification,
  confirmPurchaseImport,
  deletePurchaseImportItem,
  discardPurchaseImport,
  downloadPurchaseImportTemplate,
  getPurchaseImport,
  getPurchaseImports,
  updatePurchaseImportItem,
  uploadPurchaseImport,
  uploadPurchaseImportExcel,
  type ApplyClassificationInput,
  type PurchaseImportDetail,
  type PurchaseImportsQuery,
  type UpdatePurchaseImportItemInput,
} from '../services/purchaseImports';
import { saveBlob } from '../lib/saveBlob';
import { updateSupplier, type UpdateSupplierInput } from '../services/suppliers';

const PURCHASE_IMPORTS_KEY = 'purchase-imports';

/**
 * Every draft mutation answers with the full detail, so it is written
 * straight into the detail cache (no refetch of a possibly 500-line
 * import per edit) and only the list is invalidated.
 */
function cacheDetail(queryClient: QueryClient, detail: PurchaseImportDetail): void {
  queryClient.setQueryData([PURCHASE_IMPORTS_KEY, 'detail', detail.id], detail);
  void queryClient.invalidateQueries({ queryKey: [PURCHASE_IMPORTS_KEY, 'list'] });
}

export function usePurchaseImports(query: PurchaseImportsQuery) {
  return useQuery({
    queryKey: [PURCHASE_IMPORTS_KEY, 'list', query],
    queryFn: () => getPurchaseImports(query),
    placeholderData: keepPreviousData,
  });
}

export function usePurchaseImport(id: string | undefined) {
  return useQuery({
    queryKey: [PURCHASE_IMPORTS_KEY, 'detail', id],
    queryFn: () => getPurchaseImport(id as string),
    enabled: Boolean(id),
  });
}

export function useUploadPurchaseImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadPurchaseImport(file),
    onSuccess: (detail) => cacheDetail(queryClient, detail),
  });
}

export function useUploadPurchaseImportExcel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadPurchaseImportExcel(file),
    onSuccess: (detail) => cacheDetail(queryClient, detail),
  });
}

export function useDownloadPurchaseImportTemplate() {
  return useMutation({
    mutationFn: async () => {
      saveBlob(await downloadPurchaseImportTemplate(), 'plantilla-compra.xlsx');
    },
  });
}

export function useUpdatePurchaseImportItem(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: UpdatePurchaseImportItemInput }) =>
      updatePurchaseImportItem(importId, itemId, input),
    onSuccess: (detail) => cacheDetail(queryClient, detail),
  });
}

export function useDeletePurchaseImportItem(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deletePurchaseImportItem(importId, itemId),
    onSuccess: (detail) => cacheDetail(queryClient, detail),
  });
}

export function useApplyClassification(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyClassificationInput) => applyClassification(importId, input),
    onSuccess: (detail) => cacheDetail(queryClient, detail),
  });
}

export function useDiscardPurchaseImport(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => discardPurchaseImport(importId),
    onSuccess: (detail) => cacheDetail(queryClient, detail),
  });
}

export function useConfirmPurchaseImport(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => confirmPurchaseImport(importId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PURCHASE_IMPORTS_KEY] });
      // Confirming creates products, moves stock and can tag suppliers.
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useRenameSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSupplierInput }) =>
      updateSupplier(id, input),
    onSuccess: () => {
      // The supplier name is shown on import rows/headers and on product cards.
      void queryClient.invalidateQueries({ queryKey: [PURCHASE_IMPORTS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
