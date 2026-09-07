import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createPosInvoice,
  getPosInvoices,
  refreshPosInvoiceStatus,
  type CreatePosInvoiceInput,
  type PosInvoicesQuery,
} from '../services/posInvoices';

export function usePosInvoices(query: PosInvoicesQuery = {}) {
  return useQuery({
    queryKey: ['pos-invoices', query],
    queryFn: () => getPosInvoices(query),
    placeholderData: keepPreviousData,
  });
}

export function useCreatePosInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePosInvoiceInput) => createPosInvoice(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pos-invoices'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useRefreshPosInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => refreshPosInvoiceStatus(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pos-invoices'] });
    },
  });
}
