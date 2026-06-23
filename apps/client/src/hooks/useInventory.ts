import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createMovement,
  getMovements,
  type CreateMovementInput,
  type MovementsQuery,
} from '../services/inventory';

const MOVEMENTS_KEY = 'inventory-movements';

export function useMovements(query: MovementsQuery = {}) {
  return useQuery({
    queryKey: [MOVEMENTS_KEY, query],
    queryFn: () => getMovements(query),
    placeholderData: keepPreviousData,
  });
}

export function useCreateMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMovementInput) => createMovement(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MOVEMENTS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
