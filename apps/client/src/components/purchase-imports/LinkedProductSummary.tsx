import { Button } from '../Button';
import { LinkedPriceField } from './LinkedPriceField';
import type {
  PurchaseImportItem,
  UpdatePurchaseImportItemInput,
} from '../../services/purchaseImports';

interface LinkedProductSummaryProps {
  item: PurchaseImportItem;
  onChangeProduct: () => void;
  onUnlink: () => void;
  onPatch: (input: UpdatePurchaseImportItemInput) => void;
}

export function LinkedProductSummary({
  item,
  onChangeProduct,
  onUnlink,
  onPatch,
}: LinkedProductSummaryProps) {
  const { product } = item;
  if (!product) return null;

  const fileDescription = item.description?.trim();
  const differsFromApp =
    !!fileDescription &&
    fileDescription.toLowerCase() !== product.description.trim().toLowerCase();
  const added = item.quantity !== null && item.quantity > 0 ? item.quantity : 0;

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-line bg-canvas p-3">
      <div>
        <p className="text-sm text-ink">
          <span className="font-mono font-medium">{product.reference}</span> — {product.description}
        </p>
        {differsFromApp && (
          <p className="mt-1 text-xs text-fog">
            En el archivo: {fileDescription} — se usa la descripción de la app.
          </p>
        )}
        <p className="mt-1 font-mono text-xs text-steel">
          stock {product.stock}
          {added > 0 && ` → ${product.stock + added}`}
        </p>
      </div>
      <LinkedPriceField key={product.id} item={item} onPatch={onPatch} />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onChangeProduct}>
          Cambiar producto
        </Button>
        {item.status === 'manual' && (
          <Button type="button" variant="secondary" className="flex-1" onClick={onUnlink}>
            Quitar enlace
          </Button>
        )}
      </div>
    </div>
  );
}
