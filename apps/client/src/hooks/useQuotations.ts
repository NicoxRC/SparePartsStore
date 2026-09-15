import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  cancelQuotation,
  createQuotation,
  getQuotation,
  getQuotations,
  invoiceQuotation,
  updateQuotationItems,
  type CreateQuotationInput,
  type InvoiceQuotationInput,
  type QuotationsQuery,
  type UpdateQuotationItemsInput,
} from '../services/quotations';

export function useQuotations(query: QuotationsQuery = {}) {
  return useQuery({
    queryKey: ['quotations', query],
    queryFn: () => getQuotations(query),
    placeholderData: keepPreviousData,
  });
}

export function useQuotation(id: string | undefined) {
  return useQuery({
    queryKey: ['quotations', id],
    queryFn: () => getQuotation(id!),
    enabled: !!id,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuotationInput) => createQuotation(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quotations'] });
      // Creating a quotation decrements stock — keep the product list fresh.
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateQuotationItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateQuotationItemsInput }) =>
      updateQuotationItems(id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['quotations'] });
      void queryClient.invalidateQueries({ queryKey: ['quotations', id] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useInvoiceQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InvoiceQuotationInput }) =>
      invoiceQuotation(id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['quotations'] });
      void queryClient.invalidateQueries({ queryKey: ['quotations', id] });
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useCancelQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelQuotation(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['quotations'] });
      void queryClient.invalidateQueries({ queryKey: ['quotations', id] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
