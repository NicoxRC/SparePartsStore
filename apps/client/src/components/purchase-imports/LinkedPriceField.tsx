import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { CurrencyField } from '../CurrencyField';
import { formatPrice, pendingPriceChange } from '../../lib/purchaseImports';
import {
  newProductPriceSchema,
  type NewProductPriceValues,
} from '../../lib/schemas/purchaseImport';
import type {
  PurchaseImportItem,
  UpdatePurchaseImportItemInput,
} from '../../services/purchaseImports';

interface LinkedPriceFieldProps {
  item: PurchaseImportItem;
  onPatch: (input: UpdatePurchaseImportItemInput) => void;
}

/**
 * Optional new sale price for a product that already exists — it may have
 * changed since the last purchase. Blank keeps the current price. Shown as
 * "from -> to", the same way the stock change is.
 */
export function LinkedPriceField({ item, onPatch }: LinkedPriceFieldProps) {
  const currentPrice = item.product?.salePrice ?? 0;
  const typed = item.newProduct.salePrice;
  const change = pendingPriceChange(item);

  const {
    control,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<NewProductPriceValues>({
    resolver: zodResolver(newProductPriceSchema),
    defaultValues: { salePrice: typed ?? 0 },
  });

  const commitPrice = async () => {
    const salePrice = getValues('salePrice');
    if (salePrice === (typed ?? 0)) return;
    if (salePrice === 0) {
      onPatch({ salePrice: null });
      return;
    }
    if (!(await trigger('salePrice'))) return;
    onPatch({ salePrice });
  };

  return (
    <div className="flex flex-col gap-1">
      <p className="font-mono text-xs text-steel">
        Precio de venta {formatPrice(currentPrice)}
        {change !== null && ` → ${formatPrice(change)}`}
      </p>
      <Controller
        name="salePrice"
        control={control}
        render={({ field }) => (
          <CurrencyField
            label="Nuevo precio de venta (opcional)"
            id={`line-price-${item.id}`}
            placeholder="Dejar vacío para no cambiarlo"
            error={errors.salePrice?.message}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={() => {
              field.onBlur();
              void commitPrice();
            }}
          />
        )}
      />
    </div>
  );
}
