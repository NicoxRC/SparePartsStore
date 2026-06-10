import { createContext } from 'react';
import type { AuthUser, LoginPayload } from '../services/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  loginError: string | null;
  isLoggingIn: boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
