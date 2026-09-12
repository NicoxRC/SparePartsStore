import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createCustomer,
  getCustomer,
  getCustomers,
  updateCustomer,
  type CustomerInput,
  type CustomersQuery,
} from '../services/customers';

const CUSTOMERS_KEY = 'customers';

export function useCustomers(query: CustomersQuery) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, query],
    queryFn: () => getCustomers(query),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, id],
    queryFn: () => getCustomer(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerInput) => createCustomer(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
    },
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CustomerInput>) => updateCustomer(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
    },
  });
}
