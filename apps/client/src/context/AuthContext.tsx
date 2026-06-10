import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
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

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
    enabled: hasTokens && user === null,
    retry: false,
  });

  // Rehydrate user from /auth/me response without useEffect.
  if (meQuery.data && user === null) {
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
