import { api } from '../lib/api';

export interface SupplierResponse {
  id: string;
  nit: string;
  dv: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSupplierInput {
  name: string;
}

/** Admin-only rename. The NIT is the supplier's identity and is not editable. */
export async function updateSupplier(
  id: string,
  input: UpdateSupplierInput,
): Promise<SupplierResponse> {
  const { data } = await api.patch<SupplierResponse>(`/suppliers/${id}`, input);
  return data;
}
