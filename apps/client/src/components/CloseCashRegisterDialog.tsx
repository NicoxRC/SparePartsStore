import { createPortal } from 'react-dom';
import { Alert } from './Alert';
import { Button } from './Button';
import { useCloseCashRegister } from '../hooks/useCashRegister';
import { getApiErrorMessage } from '../lib/errors';

interface CloseCashRegisterDialogProps {
  totalSoFar: number;
  onClose: () => void;
  onClosed: () => void;
}

export function CloseCashRegisterDialog({
  totalSoFar,
  onClose,
  onClosed,
}: CloseCashRegisterDialogProps) {
  const closeMutation = useCloseCashRegister();

  const handleConfirm = async () => {
    await closeMutation.mutateAsync();
    onClosed();
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded bg-white p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">¿Cerrar la caja del día?</h2>
        <p className="mt-2 text-sm text-steel">
          Total calculado:{' '}
          <span className="font-semibold text-ink">
            ${totalSoFar.toLocaleString('es-CO')}
          </span>
          . Esta acción no se puede deshacer.
        </p>

        {closeMutation.isError && (
          <Alert variant="error">{getApiErrorMessage(closeMutation.error)}</Alert>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            isLoading={closeMutation.isPending}
            onClick={() => void handleConfirm()}
          >
            Cerrar caja
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
