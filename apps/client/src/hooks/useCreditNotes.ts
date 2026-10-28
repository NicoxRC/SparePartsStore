import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCreditNote,
  getCreditNote,
  getCreditNotes,
  getReturnableLines,
  type CreateCreditNoteInput,
  type CreditNotesQuery,
} from '../services/creditNotes';

export function useCreditNotes(query: CreditNotesQuery = {}) {
  return useQuery({
    queryKey: ['creditNotes', query],
    queryFn: () => getCreditNotes(query),
    placeholderData: keepPreviousData,
  });
}

export function useCreditNote(id: string | undefined) {
  return useQuery({
    queryKey: ['creditNotes', id],
    queryFn: () => getCreditNote(id as string),
    enabled: Boolean(id),
  });
}

// Under 'creditNotes' so a new note refreshes what is left to return.
export function useReturnableLines(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['creditNotes', 'returnable', invoiceId],
    queryFn: () => getReturnableLines(invoiceId as string),
    enabled: Boolean(invoiceId),
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCreditNoteInput) => createCreditNote(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      // Creating a credit note returns stock — keep the product list fresh.
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
