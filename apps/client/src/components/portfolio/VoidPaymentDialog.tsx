import { createPortal } from 'react-dom';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { useVoidQuotationPayment } from '../../hooks/usePortfolio';
import { getApiErrorMessage } from '../../lib/errors';
import { money, PAYMENT_MEANS_LABEL, storeDateLabel } from '../../lib/portfolio';
import type { QuotationPayment, VoidPaymentResult } from '../../services/portfolio';

interface VoidPaymentDialogProps {
  payment: QuotationPayment;
  onClose: () => void;
  onVoided: (result: VoidPaymentResult) => void;
}

/** Admin only — the abono stays in the history, marked as voided. */
export function VoidPaymentDialog({ payment, onClose, onVoided }: VoidPaymentDialogProps) {
  const voidPayment = useVoidQuotationPayment();

  const handleConfirm = async () => {
    onVoided(await voidPayment.mutateAsync(payment.id));
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm bg-paper p-5 shadow-lg" role="dialog" aria-labelledby="void-payment-title">
        <h2 id="void-payment-title" className="text-lg font-semibold text-ink">
          ¿Anular este abono?
        </h2>
        <p className="mt-2 text-sm text-steel">
          <span className="font-mono text-ink">{money(payment.amount)}</span> en{' '}
          {PAYMENT_MEANS_LABEL[payment.paymentMeans].toLowerCase()} del{' '}
          {storeDateLabel(payment.createdAt)}. El valor vuelve a quedar pendiente y el abono se
          conserva en el historial como anulado.
        </p>

        {voidPayment.isError && (
          <div className="mt-3">
            <Alert variant="error">{getApiErrorMessage(voidPayment.error)}</Alert>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Volver
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={voidPayment.isPending}
            onClick={() => void handleConfirm()}
            className="flex-1"
          >
            Anular abono
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
