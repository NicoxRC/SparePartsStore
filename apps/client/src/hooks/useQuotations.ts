import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  cancelQuotation,
  completeQuotation,
  createQuotation,
  getOpenQuotationsSummary,
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

/** Under the 'quotations' key, so every quotation mutation refreshes it. */
export function useOpenQuotationsSummary() {
  return useQuery({
    queryKey: ['quotations', 'open-summary'],
    queryFn: getOpenQuotationsSummary,
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

/** Paid without an invoice — stock stays out, it just stops counting as
 * owed, so the caja/dashboard "adeudado" totals change too. */
export function useCompleteQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeQuotation(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['quotations'] });
      void queryClient.invalidateQueries({ queryKey: ['quotations', id] });
      void queryClient.invalidateQueries({ queryKey: ['cash-register'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
