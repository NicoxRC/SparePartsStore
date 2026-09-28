import { DraftAmountField } from './DraftAmountField';
import {
  formatPrice,
  pendingCostChange,
  pendingPriceChange,
} from '../../lib/purchaseImports';
import type {
  PurchaseImportItem,
  UpdatePurchaseImportItemInput,
} from '../../services/purchaseImports';

interface LinkedPriceFieldProps {
  item: PurchaseImportItem;
  onPatch: (input: UpdatePurchaseImportItemInput) => void;
}

/**
 * Optional new cost and sale price for a product that already exists — they
 * may have changed since the last purchase. Blank keeps the current one.
 * Shown as "from -> to", the same way the stock change is.
 */
export function LinkedPriceField({ item, onPatch }: LinkedPriceFieldProps) {
  const priceChange = pendingPriceChange(item);
  const costChange = pendingCostChange(item);

  return (
    <div className="flex flex-col gap-1">
      <p className="font-mono text-xs text-steel">
        Costo {formatPrice(item.product?.cost ?? 0)}
        {costChange !== null && ` → ${formatPrice(costChange)}`}
        {' · '}
        Precio de venta {formatPrice(item.product?.salePrice ?? 0)}
        {priceChange !== null && ` → ${formatPrice(priceChange)}`}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <DraftAmountField
          field="cost"
          saved={item.newProduct.cost}
          label="Nuevo costo (opcional)"
          id={`line-cost-${item.id}`}
          placeholder="Sin cambio"
          onPatch={onPatch}
        />
        <DraftAmountField
          field="salePrice"
          saved={item.newProduct.salePrice}
          label="Nuevo precio (opcional)"
          id={`line-price-${item.id}`}
          placeholder="Sin cambio"
          onPatch={onPatch}
        />
      </div>
    </div>
  );
}
