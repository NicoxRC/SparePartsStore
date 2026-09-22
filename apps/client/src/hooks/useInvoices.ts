import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createInvoice,
  getInvoice,
  getInvoices,
  getInvoiceTicket,
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

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => getInvoice(id as string),
    enabled: Boolean(id),
  });
}

/** Loads the data of an invoice's counter receipt on demand (it is fetched per print, not cached). */
export function useInvoiceTicket() {
  return useMutation({ mutationFn: (invoiceId: string) => getInvoiceTicket(invoiceId) });
}

/** Same data as `useInvoiceTicket()`, as a query instead of a mutation — for
 * the on-screen "Ver detalle" dialog, which opens/closes rather than firing
 * once per print click. */
export function useInvoiceTicketQuery(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoices', invoiceId, 'ticket'],
    queryFn: () => getInvoiceTicket(invoiceId as string),
    enabled: Boolean(invoiceId),
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
