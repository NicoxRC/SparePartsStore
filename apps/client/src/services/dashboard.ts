import { api } from '../lib/api';

export interface DailySales {
  date: string;
  total: number;
}

export interface LowStockProduct {
  id: string;
  reference: string;
  description: string;
  stock: number;
}

export interface DashboardSummary {
  cashRegisterOpen: boolean;
  todayRecaudado: number | null;
  todayAdeudado: number | null;
  salesLast7Days: DailySales[];
  openQuotationsTotal: number;
  openQuotationsCount: number;
  totalProducts: number;
  outOfStockCount: number;
  outOfStockProducts: LowStockProduct[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>('/dashboard/summary');
  return data;
}
