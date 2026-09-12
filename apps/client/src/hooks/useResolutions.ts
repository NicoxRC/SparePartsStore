import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createResolution,
  getResolutions,
  type CreateResolutionInput,
  type ResolutionsQuery,
} from '../services/resolutions';

export function useResolutions(query: ResolutionsQuery = {}) {
  return useQuery({
    queryKey: ['resolutions', query],
    queryFn: () => getResolutions(query),
    placeholderData: keepPreviousData,
  });
}

export function useCreateResolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateResolutionInput) => createResolution(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resolutions'] });
    },
  });
}
