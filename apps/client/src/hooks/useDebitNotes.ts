import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDebitNote,
  getDebitNote,
  getDebitNotes,
  type CreateDebitNoteInput,
  type DebitNotesQuery,
} from '../services/debitNotes';

export function useDebitNotes(query: DebitNotesQuery = {}) {
  return useQuery({
    queryKey: ['debitNotes', query],
    queryFn: () => getDebitNotes(query),
    placeholderData: keepPreviousData,
  });
}

export function useDebitNote(id: string | undefined) {
  return useQuery({
    queryKey: ['debitNotes', id],
    queryFn: () => getDebitNote(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateDebitNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDebitNoteInput) => createDebitNote(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['debitNotes'] });
      // Creating a debit note decrements stock — keep the product list fresh.
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
