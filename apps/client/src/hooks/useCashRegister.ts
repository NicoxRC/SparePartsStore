import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  closeCashRegister,
  createCashMovement,
  getCashRegisterHistory,
  getTodayCashRegister,
  openCashRegister,
  updateCountedCash,
  type CashRegisterQuery,
} from '../services/cashRegister';

const TODAY_KEY = ['cash-register', 'today'];
const HISTORY_KEY = ['cash-register', 'history'];

export function useTodayCashRegister() {
  return useQuery({
    queryKey: TODAY_KEY,
    queryFn: getTodayCashRegister,
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
