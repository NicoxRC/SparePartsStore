import { api } from '../lib/api';
import type { PaginatedResponse } from './products';

export type UserRole = 'admin' | 'employee';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  password?: string;
  isActive?: boolean;
}

export async function getUsers(
  query: UsersQuery = {},
): Promise<PaginatedResponse<UserResponse>> {
  const { data } = await api.get<PaginatedResponse<UserResponse>>('/users', {
    params: query,
  });
  return data;
}

export async function getUser(id: string): Promise<UserResponse> {
  const { data } = await api.get<UserResponse>(`/users/${id}`);
  return data;
}

export async function createUser(input: CreateUserInput): Promise<UserResponse> {
  const { data } = await api.post<UserResponse>('/users', input);
  return data;
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<UserResponse> {
  const { data } = await api.patch<UserResponse>(`/users/${id}`, input);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}
