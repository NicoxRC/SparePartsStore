import { createPortal } from 'react-dom';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { useDiscardPurchaseImport } from '../../hooks/usePurchaseImports';
import { getApiErrorMessage } from '../../lib/errors';

interface DiscardPurchaseImportDialogProps {
  importId: string;
  onClose: () => void;
  onDiscarded: () => void;
}

export function DiscardPurchaseImportDialog({
  importId,
  onClose,
  onDiscarded,
}: DiscardPurchaseImportDialogProps) {
  const discardMutation = useDiscardPurchaseImport(importId);

  const handleDiscard = async () => {
    await discardMutation.mutateAsync();
    onDiscarded();
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded bg-paper p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">¿Descartar este borrador?</h2>
        <p className="mt-2 text-sm text-steel">
          No se crea ningún producto ni se suma stock. La factura se puede volver a cargar.
        </p>

        {discardMutation.isError && (
          <div className="mt-3">
            <Alert variant="error">{getApiErrorMessage(discardMutation.error)}</Alert>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={discardMutation.isPending}
            onClick={() => void handleDiscard()}
          >
            Descartar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
