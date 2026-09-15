import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  closeCashRegister,
  getTodayCashRegister,
  openCashRegister,
} from '../services/cashRegister';

const TODAY_KEY = ['cash-register', 'today'];

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
    },
  });
}
