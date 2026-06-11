import { createContext } from 'react';
import type { AuthUser, ChangePasswordPayload, LoginPayload } from '../services/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  loginError: string | null;
  isLoggingIn: boolean;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  isChangingPassword: boolean;
  changePasswordError: string | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
