import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createInvoice,
  getInvoices,
  refreshInvoiceStatus,
  resendInvoice,
  type CreateInvoiceInput,
  type InvoicesQuery,
  type ResendInvoiceInput,
} from '../services/invoices';

export function useInvoices(query: InvoicesQuery = {}) {
  return useQuery({
    queryKey: ['invoices', query],
    queryFn: () => getInvoices(query),
    placeholderData: keepPreviousData,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => createInvoice(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // Creating an invoice decrements stock — keep the product list fresh.
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useResendInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: ResendInvoiceInput }) =>
      resendInvoice(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useRefreshInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => refreshInvoiceStatus(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
