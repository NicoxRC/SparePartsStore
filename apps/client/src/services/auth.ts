import { api } from '../lib/api';

export type UserRole = 'admin' | 'employee';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UserProfile extends AuthUser {
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getMe(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>('/auth/me');
  return data;
}
