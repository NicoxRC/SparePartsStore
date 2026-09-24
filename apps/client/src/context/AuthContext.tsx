import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changePassword as changePasswordRequest,
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  type AuthUser,
} from '../services/auth';
import { clearTokens, getAccessToken, setTokens } from '../lib/storage';
import { getApiErrorMessage } from '../lib/errors';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const hasTokens = Boolean(getAccessToken());

  // Kept live (not just a one-time rehydrate) so a permission change made
  // by an admin reaches an employee's open session — otherwise the menu
  // keeps showing items from the login-time snapshot until they log out.
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
    enabled: hasTokens,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  // Sync user from each fresh /auth/me response without useEffect. Tracks
  // the last synced response so local updates (e.g. mustChangePassword
  // after changing it) aren't overwritten by an older cached one.
  const [syncedMe, setSyncedMe] = useState<AuthUser | null>(null);
  if (meQuery.data && meQuery.data !== syncedMe) {
    setSyncedMe(meQuery.data);
    setUser(meQuery.data);
  }

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      setLoginError(null);
    },
    onError: (error: unknown) => {
      const status = isAxios401(error) ? 401 : undefined;
      setLoginError(
        status === 401
          ? 'Correo o contraseña incorrectos.'
          : getApiErrorMessage(error, 'No se pudo iniciar sesión. Intenta de nuevo.'),
      );
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      clearTokens();
      setUser(null);
      queryClient.clear();
    },
  });

  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  const changePasswordMutation = useMutation({
    mutationFn: changePasswordRequest,
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setUser((current) =>
        current ? { ...current, mustChangePassword: false } : current,
      );
      setChangePasswordError(null);
    },
    onError: (error: unknown) => {
      setChangePasswordError(
        getApiErrorMessage(error, 'No se pudo cambiar la contraseña. Intenta de nuevo.'),
      );
    },
  });

  const isLoading = hasTokens && user === null && meQuery.isPending;

  // If token-based rehydration failed (invalid/expired tokens that
  // couldn't be refreshed), treat as logged out.
  if (hasTokens && meQuery.isError && user === null) {
    clearTokens();
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login: async (payload) => {
      await loginMutation.mutateAsync(payload);
    },
    logout: async () => {
      await logoutMutation.mutateAsync().catch(() => {
        // Logout endpoint failure shouldn't block clearing local session.
      });
    },
    loginError,
    isLoggingIn: loginMutation.isPending,
    changePassword: async (payload) => {
      await changePasswordMutation.mutateAsync(payload);
    },
    isChangingPassword: changePasswordMutation.isPending,
    changePasswordError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function isAxios401(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  );
}
