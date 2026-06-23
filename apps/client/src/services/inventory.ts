import { api } from '../lib/api';
import type { PaginatedResponse } from './products';

export type MovementType = 'initial' | 'purchase' | 'adjustment';

export interface MovementCreatedBy {
  id: string;
  firstName: string;
  lastName: string;
}

export interface MovementResponse {
  id: string;
  productId: string;
  productReference: string;
  productDescription: string;
  movementType: MovementType;
  quantity: number;
  newStock: number;
  notes: string | null;
  createdBy: MovementCreatedBy | null;
  createdAt: string;
}

export interface CreateMovementInput {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface MovementsQuery {
  page?: number;
  limit?: number;
  productId?: string;
}

export async function createMovement(
  input: CreateMovementInput,
): Promise<MovementResponse> {
  const { data } = await api.post<MovementResponse>(
    '/inventory/movements',
    input,
  );
  return data;
}

export async function getMovements(
  query: MovementsQuery = {},
): Promise<PaginatedResponse<MovementResponse>> {
  const { data } = await api.get<PaginatedResponse<MovementResponse>>(
    '/inventory/movements',
    { params: query },
  );
  return data;
}
