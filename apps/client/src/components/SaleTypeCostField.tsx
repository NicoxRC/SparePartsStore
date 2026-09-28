import type { UseFormRegisterReturn } from 'react-hook-form';
import { calculateCost } from '../lib/productCost';
import type { SaleType } from '../services/products';
import { SelectField } from './SelectField';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

interface SaleTypeCostFieldProps {
  registration: UseFormRegisterReturn;
  salePrice: number;
  saleType: SaleType;
  error?: string;
}

/**
 * For products entered one by one: the sale type picks the factor and the
 * cost is shown as it will be saved (the API derives the same number).
 */
export function SaleTypeCostField({
  registration,
  salePrice,
  saleType,
  error,
}: SaleTypeCostFieldProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <SelectField label="Tipo de venta" error={error} {...registration}>
        <option value="normal">Normal</option>
        <option value="neto">Neto</option>
      </SelectField>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-steel">Costo (calculado)</span>
        <div className="min-h-12 w-full rounded-sm border border-line bg-canvas px-4 py-3 font-mono text-base text-fog sm:min-h-11 sm:py-2.5 sm:text-sm">
          {currencyFormatter.format(calculateCost(salePrice || 0, saleType || 'normal'))}
        </div>
      </div>
    </div>
  );
}
