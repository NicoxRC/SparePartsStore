import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createPayrollEntry,
  getPayrollEntries,
  refreshPayrollEntryStatus,
  type CreatePayrollEntryInput,
  type PayrollEntriesQuery,
} from '../services/payroll';

export function usePayrollEntries(query: PayrollEntriesQuery = {}) {
  return useQuery({
    queryKey: ['payroll-entries', query],
    queryFn: () => getPayrollEntries(query),
    placeholderData: keepPreviousData,
  });
}

export function useCreatePayrollEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePayrollEntryInput) => createPayrollEntry(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payroll-entries'] });
    },
  });
}

export function useRefreshPayrollEntryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => refreshPayrollEntryStatus(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payroll-entries'] });
    },
  });
}
