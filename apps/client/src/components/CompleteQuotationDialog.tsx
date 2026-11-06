import { createPortal } from 'react-dom';
import { Alert } from './Alert';
import { Button } from './Button';
import { useCompleteQuotation } from '../hooks/useQuotations';
import { getApiErrorMessage } from '../lib/errors';

interface CompleteQuotationDialogProps {
  quotationId: string;
  onClose: () => void;
  onCompleted: () => void;
}

export function CompleteQuotationDialog({
  quotationId,
  onClose,
  onCompleted,
}: CompleteQuotationDialogProps) {
  const completeMutation = useCompleteQuotation();

  const handleConfirm = async () => {
    await completeMutation.mutateAsync(quotationId);
    onCompleted();
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded bg-paper p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">¿Completar sin factura?</h2>
        <p className="mt-2 text-sm text-steel">
          La cotización se cierra como pagada, sin generar factura. Los productos no vuelven al
          inventario y no se suma al recaudado de la caja. Esta acción no se puede deshacer.
        </p>

        {completeMutation.isError && (
          <Alert variant="error">{getApiErrorMessage(completeMutation.error)}</Alert>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button
            type="button"
            isLoading={completeMutation.isPending}
            onClick={() => void handleConfirm()}
          >
            Completar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
