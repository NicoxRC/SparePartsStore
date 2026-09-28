import type { SaleType } from '../services/products';

/** Must match the API's ProductsService: sale price / factor = cost. */
const COST_FACTORS: Record<SaleType, number> = {
  normal: 1.65,
  neto: 1.3,
};

export function calculateCost(salePrice: number, saleType: SaleType): number {
  return Math.round(salePrice / COST_FACTORS[saleType]);
}
