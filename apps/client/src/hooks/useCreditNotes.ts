import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCreditNote,
  getCreditNote,
  getCreditNotes,
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
