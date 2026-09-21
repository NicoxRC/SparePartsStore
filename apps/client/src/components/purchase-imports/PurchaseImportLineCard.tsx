import { useState } from 'react';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { IssueBadges } from './IssueBadges';
import { LineFieldsForm } from './LineFieldsForm';
import { LineStatusChip } from './LineStatusChip';
import { LinkedProductSummary } from './LinkedProductSummary';
import { NewProductFields } from './NewProductFields';
import { ProductPickerDialog } from './ProductPickerDialog';
import {
  useDeletePurchaseImportItem,
  useUpdatePurchaseImportItem,
} from '../../hooks/usePurchaseImports';
import { getApiErrorMessage } from '../../lib/errors';
import { lineElementId } from '../../lib/purchaseImports';
import type { ProductResponse } from '../../services/products';
import type {
  PurchaseImportItem,
  UpdatePurchaseImportItemInput,
} from '../../services/purchaseImports';

interface PurchaseImportLineCardProps {
  importId: string;
  item: PurchaseImportItem;
  isHighlighted: boolean;
}

/** One editable draft line. Each card owns its own mutations, so saving one never blocks the others. */
export function PurchaseImportLineCard({ importId, item, isHighlighted }: PurchaseImportLineCardProps) {
  const updateMutation = useUpdatePurchaseImportItem(importId);
  const deleteMutation = useDeletePurchaseImportItem(importId);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  // Open by default while the line still lacks what confirming needs.
  const [isNewOpen, setIsNewOpen] = useState(() =>
    item.issues.some((issue) => issue === 'MISSING_CLASSIFICATION' || issue === 'INVALID_SALE_PRICE'),
  );

  const isBusy = updateMutation.isPending || deleteMutation.isPending;
  const error = updateMutation.error ?? deleteMutation.error;

  const patch = (
    input: UpdatePurchaseImportItemInput,
    onSaved?: (fresh: PurchaseImportItem) => void,
  ) => {
    updateMutation.mutate(
      { itemId: item.id, input },
      {
        onSuccess: (detail) => {
          const fresh = detail.items.find((candidate) => candidate.id === item.id);
          if (fresh && onSaved) onSaved(fresh);
        },
      },
    );
  };

  const handlePick = (product: ProductResponse) => {
    setIsPickerOpen(false);
    patch({ productId: product.id });
  };

  return (
    <article
      id={lineElementId(item.id)}
      className={`flex flex-col gap-3 rounded border border-line bg-paper p-4 ${
        item.issues.length > 0 ? 'border-l-4 border-l-amber' : ''
      } ${isHighlighted ? 'ring-2 ring-rust' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-fog">Línea {item.lineNumber}</span>
        <LineStatusChip status={item.status} />
        <IssueBadges issues={item.issues} />
        {isBusy && (
          <span
            role="status"
            aria-label="Guardando"
            className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-line-2 border-t-ink"
          />
        )}
      </div>

      <LineFieldsForm item={item} showDescription={!item.product} onPatch={patch} />

      {item.product ? (
        <LinkedProductSummary
          item={item}
          onChangeProduct={() => setIsPickerOpen(true)}
          onUnlink={() => patch({ productId: null })}
        />
      ) : (
        <>
          <button
            type="button"
            aria-expanded={isNewOpen}
            onClick={() => setIsNewOpen((open) => !open)}
            className="flex min-h-11 items-center justify-between text-left text-sm font-medium text-ink"
          >
            Datos del producto nuevo
            <span aria-hidden="true" className="text-fog">
              {isNewOpen ? '▴' : '▾'}
            </span>
          </button>
          {isNewOpen && <NewProductFields item={item} onPatch={patch} />}
          <Button type="button" variant="secondary" onClick={() => setIsPickerOpen(true)}>
            Enlazar a producto existente
          </Button>
        </>
      )}

      {error && <Alert variant="error">{getApiErrorMessage(error)}</Alert>}

      {isConfirmingDelete ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <p className="text-sm text-steel">¿Quitar esta línea de la compra?</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsConfirmingDelete(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(item.id)}
            >
              Quitar línea
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsConfirmingDelete(true)}
          className="min-h-11 self-start text-sm font-medium text-rust hover:underline"
        >
          Quitar línea
        </button>
      )}

      {isPickerOpen && (
        <ProductPickerDialog
          title="Enlazar a producto existente"
          initialSearch={item.reference ?? ''}
          onPick={handlePick}
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </article>
  );
}
