import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createUser,
  deleteUser,
  getUser,
  getUsers,
  updateUser,
  type CreateUserInput,
  type UpdateUserInput,
  type UsersQuery,
} from '../services/users';

const USERS_KEY = 'users';

export function useUsers(query: UsersQuery) {
  return useQuery({
    queryKey: [USERS_KEY, query],
    queryFn: () => getUsers(query),
    placeholderData: keepPreviousData,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: [USERS_KEY, id],
    queryFn: () => getUser(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => updateUser(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateUser(id, { isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
}
