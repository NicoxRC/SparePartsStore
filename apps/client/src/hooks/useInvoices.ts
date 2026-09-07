import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createInvoice,
  getInvoices,
  type CreateInvoiceInput,
  type InvoicesQuery,
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
