import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  closeCashRegister,
  closePastCashRegister,
  createCashMovement,
  getCashRegisterHistory,
  getDayInvoicesReport,
  getTodayCashRegister,
  openCashRegister,
  reopenCashRegister,
  updateCountedCash,
  type CashRegisterQuery,
} from '../services/cashRegister';
import { useCashRegisterBox } from './useCashRegisterBox';

const TODAY_KEY = ['cash-register', 'today'];
const HISTORY_KEY = ['cash-register', 'history'];

/** Today's status of the till this device is working at (the request
 * carries it, see lib/api.ts) — keyed by till so switching refetches. */
export function useTodayCashRegister() {
  const { number } = useCashRegisterBox();
  return useQuery({
    queryKey: [...TODAY_KEY, number],
    queryFn: getTodayCashRegister,
    enabled: number !== null,
  });
}

/** The day's invoices, fetched fresh each time a slip is printed (never served from an old cache). */
export function useDayInvoicesReport(registerId: string) {
  return useQuery({
    queryKey: ['cash-register', 'day-invoices', registerId],
    queryFn: () => getDayInvoicesReport(registerId),
    gcTime: 0,
    retry: false,
  });
}

export function useOpenCashRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: openCashRegister,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TODAY_KEY });
    },
  });
}

export function useCloseCashRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closeCashRegister,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TODAY_KEY });
      void queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

export function useClosePastCashRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, countedCash }: { id: string; countedCash?: number }) =>
      closePastCashRegister(id, countedCash),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

export function useReopenCashRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reopenCashRegister,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TODAY_KEY });
      void queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

export function useCreateCashMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCashMovement,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TODAY_KEY });
    },
  });
}

export function useCashRegisterHistory(query: CashRegisterQuery) {
  return useQuery({
    queryKey: [...HISTORY_KEY, query],
    queryFn: () => getCashRegisterHistory(query),
  });
}

export function useUpdateCountedCash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, countedCash }: { id: string; countedCash: number }) =>
      updateCountedCash(id, countedCash),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}
