import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert } from './Alert';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { useMergeQuotations, useQuotations } from '../hooks/useQuotations';
import { getApiErrorMessage } from '../lib/errors';
import type { QuotationResponse } from '../services/quotations';

interface MergeQuotationsDialogProps {
  quotation: QuotationResponse;
  onClose: () => void;
  /** Receives the quotation that now holds every line (the oldest one). */
  onMerged: (merged: QuotationResponse) => void;
}

function quotationNumberLabel(number: number): string {
  return `COT-${String(number).padStart(4, '0')}`;
}

function money(value: number) {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Picks the customer's other open quotations to join with this one. They
 * all end up in the oldest of them (the 30-day term keeps counting from
 * its date); nothing is invoiced and no stock moves.
 */
export function MergeQuotationsDialog({
  quotation,
  onClose,
  onMerged,
}: MergeQuotationsDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const mergeMutation = useMergeQuotations();
  const othersQuery = useQuotations({
    status: 'open',
    customerIdentification: quotation.customerIdentification,
    limit: 100,
  });
  const others = (othersQuery.data?.data ?? []).filter((q) => q.id !== quotation.id);

  const selected = [quotation, ...others.filter((q) => selectedIds.includes(q.id))];
  const survivor = selected.reduce((oldest, q) => (q.number < oldest.number ? q : oldest));
  const selectedTotal = selected.reduce((sum, q) => sum + q.totalAmount, 0);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const handleConfirm = async () => {
    const merged = await mergeMutation.mutateAsync([quotation.id, ...selectedIds]);
    onMerged(merged);
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded bg-paper p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">Unir cotizaciones</h2>
        <p className="mt-2 text-sm text-steel">
          Elige las otras cotizaciones abiertas de este cliente. Todos los productos pasan a la más
          antigua, con sus mismos precios, y las demás quedan como unidas. No se factura nada ni se
          mueve el inventario: después puedes facturar o seguir editando la cotización unida.
        </p>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded border border-line">
          {othersQuery.isPending && <Spinner label="Cargando…" />}
          {othersQuery.isError && (
            <Alert variant="error">{getApiErrorMessage(othersQuery.error)}</Alert>
          )}
          {othersQuery.data && others.length === 0 && (
            <p className="p-3 text-sm text-fog">
              Este cliente no tiene otras cotizaciones abiertas.
            </p>
          )}
          {others.length > 0 && (
            <ul className="divide-y divide-line">
              {others.map((other) => (
                <li key={other.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-mist">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(other.id)}
                      onChange={() => toggle(other.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-mono font-medium text-ink">
                        {quotationNumberLabel(other.number)}
                      </span>
                      <span className="block text-xs text-fog">{formatDate(other.createdAt)}</span>
                    </span>
                    <span className="shrink-0 font-mono font-semibold text-ink">
                      {money(other.totalAmount)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedIds.length > 0 && (
          <p className="mt-3 text-sm text-steel">
            Quedan en <span className="font-mono font-medium text-ink">
              {quotationNumberLabel(survivor.number)}
            </span>{' '}
            por un total de{' '}
            <span className="font-mono font-semibold text-ink">{money(selectedTotal)}</span>.
            Los cambios sin guardar en esta cotización se pierden.
          </p>
        )}

        {mergeMutation.isError && (
          <Alert variant="error">{getApiErrorMessage(mergeMutation.error)}</Alert>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button
            type="button"
            disabled={selectedIds.length === 0}
            isLoading={mergeMutation.isPending}
            onClick={() => void handleConfirm()}
          >
            Unir {selectedIds.length > 0 ? selectedIds.length + 1 : ''}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
