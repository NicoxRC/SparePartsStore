import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert } from './Alert';
import { Button } from './Button';
import { useCreateCashMovement } from '../hooks/useCashRegister';
import { getApiErrorMessage } from '../lib/errors';

interface CashMovementDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CashMovementDialog({ onClose, onCreated }: CashMovementDialogProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const createMovement = useCreateCashMovement();

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount !== 0;
  const isValidReason = reason.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValidAmount || !isValidReason) return;
    try {
      await createMovement.mutateAsync({ amount: parsedAmount, reason: reason.trim() });
      onCreated();
    } catch {
      // Error shown via mutation.isError
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded bg-white p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">Entrada o salida de efectivo</h2>
        <p className="mt-1 text-sm text-steel">
          Para dinero que entra o sale de la caja sin ser una venta.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="movement-amount" className="text-sm font-medium text-steel">
              Monto <span className="font-normal text-fog">(+ entrada / − salida)</span>
            </label>
            <input
              id="movement-amount"
              type="number"
              inputMode="decimal"
              placeholder="Ej: 50000 ó -20000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="min-h-12 w-full rounded-sm border border-line bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/30 sm:min-h-11 sm:py-2.5 sm:text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="movement-reason" className="text-sm font-medium text-steel">
              Razón
            </label>
            <textarea
              id="movement-reason"
              rows={2}
              placeholder="Ej: Pago a proveedor, cambio para la caja"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={255}
              className="w-full resize-none rounded-sm border border-line bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/30"
            />
          </div>
        </div>

        {createMovement.isError && (
          <div className="mt-3">
            <Alert variant="error">{getApiErrorMessage(createMovement.error)}</Alert>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            isLoading={createMovement.isPending}
            disabled={!isValidAmount || !isValidReason}
            className="flex-1"
          >
            Registrar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
