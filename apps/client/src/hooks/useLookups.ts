import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createLookup,
  deleteLookup,
  getBrands,
  getDepartments,
  getGroups,
  getLookup,
  getLookups,
  updateLookup,
  type LookupInput,
  type LookupQuery,
  type LookupResource,
} from '../services/lookups';

export function useLookupList(resource: LookupResource, query: LookupQuery = {}) {
  return useQuery({
    queryKey: [resource, query],
    queryFn: () => getLookups(resource, query),
    placeholderData: keepPreviousData,
  });
}

export function useLookupItem(resource: LookupResource, id: string | undefined) {
  return useQuery({
    queryKey: [resource, id],
    queryFn: () => getLookup(resource, id as string),
    enabled: Boolean(id),
  });
}

export function useCreateLookup(resource: LookupResource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LookupInput) => createLookup(resource, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [resource] });
    },
  });
}

export function useUpdateLookup(resource: LookupResource, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<LookupInput>) => updateLookup(resource, id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [resource] });
    },
  });
}

export function useDeleteLookup(resource: LookupResource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLookup(resource, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [resource] });
    },
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => getDepartments(),
  });
}

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => getGroups(),
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: () => getBrands(),
  });
}
