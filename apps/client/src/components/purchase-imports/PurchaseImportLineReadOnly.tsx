import { IssueBadges } from './IssueBadges';
import { LineStatusChip } from './LineStatusChip';
import {
  formatPrice,
  formatQuantity,
  lineElementId,
  pendingPriceChange,
} from '../../lib/purchaseImports';
import type { PurchaseImportItem } from '../../services/purchaseImports';

interface PurchaseImportLineReadOnlyProps {
  item: PurchaseImportItem;
  /** Confirmed imports show what confirming did (Creado / Existente) instead of the match. */
  isConfirmed: boolean;
  isHighlighted?: boolean;
}

export function PurchaseImportLineReadOnly({
  item,
  isConfirmed,
  isHighlighted = false,
}: PurchaseImportLineReadOnlyProps) {
  const outcome = isConfirmed ? (item.createdProduct ? 'created' : 'restocked') : undefined;

  return (
    <article
      id={lineElementId(item.id)}
      className={`flex flex-col gap-2 rounded border border-line bg-paper p-4 ${
        isHighlighted ? 'ring-2 ring-rust' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-fog">Línea {item.lineNumber}</span>
        <LineStatusChip status={item.status} outcome={outcome} />
        <IssueBadges issues={item.issues} />
      </div>

      {item.product ? (
        // The app's description wins over whatever the file said.
        <p className="text-sm text-ink">
          <span className="font-mono font-medium">{item.product.reference}</span> —{' '}
          {item.product.description}
        </p>
      ) : (
        <p className="text-sm text-ink">
          <span className="font-mono font-medium">{item.reference ?? 'Sin referencia'}</span>
          {item.description && ` — ${item.description}`}
        </p>
      )}

      {item.product && pendingPriceChange(item) !== null && (
        <p className="font-mono text-xs text-steel">
          Precio de venta {formatPrice(item.product.salePrice)} →{' '}
          {formatPrice(pendingPriceChange(item) ?? 0)}
        </p>
      )}

      <p className="font-mono text-xs text-steel">
        Cantidad: {item.quantity === null ? '—' : formatQuantity(item.quantity)}
        {item.quantity !== item.xmlQuantity && ` (factura: ${formatQuantity(item.xmlQuantity)})`}
      </p>

    </article>
  );
}
