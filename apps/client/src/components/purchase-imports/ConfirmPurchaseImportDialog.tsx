import { createPortal } from 'react-dom';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { ConfirmResult } from './ConfirmResult';
import { useConfirmPurchaseImport } from '../../hooks/usePurchaseImports';
import { getApiErrorMessage } from '../../lib/errors';
import { getInvalidImportProblems, summarizeConfirm } from '../../lib/purchaseImports';
import type {
  ConfirmPurchaseImportResponse,
  ConfirmProblem,
  PurchaseImportItem,
} from '../../services/purchaseImports';

interface ConfirmPurchaseImportDialogProps {
  importId: string;
  items: PurchaseImportItem[];
  /** The server refused: some lines are still pending (400 PURCHASE_IMPORT_INVALID). */
  onInvalid: (problems: ConfirmProblem[]) => void;
  /** The user dismissed the result screen after a successful confirm. */
  onDone: (result: ConfirmPurchaseImportResponse) => void;
  onClose: () => void;
}

export function ConfirmPurchaseImportDialog({
  importId,
  items,
  onInvalid,
  onDone,
  onClose,
}: ConfirmPurchaseImportDialogProps) {
  const confirmMutation = useConfirmPurchaseImport(importId);
  const summary = summarizeConfirm(items);

  const handleConfirm = () => {
    confirmMutation.mutate(undefined, {
      onError: (error) => {
        const problems = getInvalidImportProblems(error);
        if (problems) onInvalid(problems);
      },
    });
  };

  const result = confirmMutation.data;

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded bg-paper p-5 shadow-lg">
        {result ? (
          <>
            <h2 className="text-lg font-semibold text-ink">Compra confirmada</h2>
            <div className="mt-3 text-steel">
              <ConfirmResult result={result} />
            </div>
            <Button type="button" className="mt-5" onClick={() => onDone(result)}>
              Listo
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-ink">¿Confirmar esta compra?</h2>
            <p className="mt-2 text-sm text-steel">
              Se crearán {summary.createdProducts}{' '}
              {summary.createdProducts === 1 ? 'producto' : 'productos'} y se sumará stock a{' '}
              {summary.restockedProducts}{' '}
              {summary.restockedProducts === 1 ? 'producto' : 'productos'} ({summary.units}{' '}
              {summary.units === 1 ? 'unidad' : 'unidades'}). Después no se puede editar ni
              deshacer.
            </p>

            {confirmMutation.isError && !getInvalidImportProblems(confirmMutation.error) && (
              <div className="mt-3">
                <Alert variant="error">{getApiErrorMessage(confirmMutation.error)}</Alert>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={confirmMutation.isPending}
                onClick={onClose}
              >
                Volver
              </Button>
              <Button type="button" isLoading={confirmMutation.isPending} onClick={handleConfirm}>
                Confirmar compra
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
