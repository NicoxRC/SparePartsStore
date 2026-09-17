import { createPortal } from 'react-dom';
import { Alert } from './Alert';
import { Button } from './Button';
import { useCloseCashRegister } from '../hooks/useCashRegister';
import { getApiErrorMessage } from '../lib/errors';

interface CloseCashRegisterDialogProps {
  totalSoFar: number;
  totalOwedSoFar: number;
  onClose: () => void;
  onClosed: () => void;
}

export function CloseCashRegisterDialog({
  totalSoFar,
  totalOwedSoFar,
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

        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between rounded-sm bg-ok-tint px-3 py-2">
            <dt className="text-ok">Recaudado hoy</dt>
            <dd className="font-mono font-semibold text-ok">
              ${totalSoFar.toLocaleString('es-CO')}
            </dd>
          </div>
          <div className="flex items-center justify-between rounded-sm bg-amber-tint px-3 py-2">
            <dt className="text-amber">Cotizaciones de hoy sin cobrar</dt>
            <dd className="font-mono font-semibold text-amber">
              ${totalOwedSoFar.toLocaleString('es-CO')}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-steel">
          Lo adeudado no cuenta como recaudado — solo las cotizaciones abiertas hoy, no las de días
          anteriores. Esta acción no se puede deshacer.
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
