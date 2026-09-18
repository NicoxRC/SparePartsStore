import { createPortal } from 'react-dom';
import { Alert } from './Alert';
import { Button } from './Button';
import { useCancelQuotation } from '../hooks/useQuotations';
import { getApiErrorMessage } from '../lib/errors';

interface CancelQuotationDialogProps {
  quotationId: string;
  onClose: () => void;
  onCancelled: () => void;
}

export function CancelQuotationDialog({
  quotationId,
  onClose,
  onCancelled,
}: CancelQuotationDialogProps) {
  const cancelMutation = useCancelQuotation();

  const handleConfirm = async () => {
    await cancelMutation.mutateAsync(quotationId);
    onCancelled();
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded bg-paper p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">¿Cancelar esta cotización?</h2>
        <p className="mt-2 text-sm text-steel">
          Los productos vuelven al inventario. Esta acción no se puede deshacer.
        </p>

        {cancelMutation.isError && (
          <Alert variant="error">{getApiErrorMessage(cancelMutation.error)}</Alert>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={cancelMutation.isPending}
            onClick={() => void handleConfirm()}
          >
            Cancelar cotización
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
