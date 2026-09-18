import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert } from './Alert';
import { Button } from './Button';
import { CashRegisterTicket } from './print/CashRegisterTicket';
import { PrintTicket } from './print/PrintTicket';
import { useCloseCashRegister } from '../hooks/useCashRegister';
import { getApiErrorMessage } from '../lib/errors';
import type { CashRegisterResponse } from '../services/cashRegister';

interface CloseCashRegisterDialogProps {
  totalSoFar: number;
  totalOwedSoFar: number;
  expectedCashSoFar: number;
  onClose: () => void;
  onClosed: () => void;
}

function money(value: number) {
  return `$${value.toLocaleString('es-CO')}`;
}

export function CloseCashRegisterDialog({
  totalSoFar,
  totalOwedSoFar,
  expectedCashSoFar,
  onClose,
  onClosed,
}: CloseCashRegisterDialogProps) {
  const closeMutation = useCloseCashRegister();
  const [countedCash, setCountedCash] = useState('');
  const [report, setReport] = useState<CashRegisterResponse | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const parsedCounted = parseFloat(countedCash);
  const isValidCounted = !isNaN(parsedCounted) && parsedCounted >= 0;

  const handleConfirm = async () => {
    if (!isValidCounted) return;
    const result = await closeMutation.mutateAsync(parsedCounted);
    setReport(result);
  };

  if (report) {
    const discrepancy = report.cashDiscrepancy ?? 0;
    const isSquared = discrepancy === 0;
    return createPortal(
      <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
        <div className="w-full max-w-sm rounded bg-paper p-5 shadow-lg">
          <h2 className="text-lg font-semibold text-ink">Reporte de cierre</h2>

          <dl className="mt-3 flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between px-1 py-1">
              <dt className="text-steel">Base</dt>
              <dd className="font-mono">{money(report.openingAmount)}</dd>
            </div>
            <div className="flex items-center justify-between px-1 py-1">
              <dt className="text-steel">Efectivo</dt>
              <dd className="font-mono">{money(report.totalCash ?? 0)}</dd>
            </div>
            <div className="flex items-center justify-between px-1 py-1">
              <dt className="text-steel">Tarjeta</dt>
              <dd className="font-mono">{money(report.totalCard ?? 0)}</dd>
            </div>
            <div className="flex items-center justify-between px-1 py-1">
              <dt className="text-steel">Transferencia</dt>
              <dd className="font-mono">{money(report.totalTransfer ?? 0)}</dd>
            </div>

            {report.movements.length > 0 && (
              <div className="mt-1 flex flex-col gap-1 border-t border-line pt-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-fog">
                  Entradas y salidas
                </dt>
                {report.movements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between gap-2">
                    <dd className="min-w-0 flex-1 truncate text-steel" title={movement.reason}>
                      {movement.reason}
                    </dd>
                    <dd
                      className={`shrink-0 font-mono ${
                        movement.amount > 0 ? 'text-ok' : 'text-rust'
                      }`}
                    >
                      {movement.amount > 0 ? '+' : ''}
                      {money(movement.amount)}
                    </dd>
                  </div>
                ))}
              </div>
            )}

            {report.notes.length > 0 && (
              <div className="mt-1 flex flex-col gap-1 border-t border-line pt-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-fog">
                  Notas débito/crédito de hoy
                </dt>
                {report.notes.map((note) => (
                  <div key={note.id} className="flex items-center justify-between gap-2">
                    <dd className="min-w-0 flex-1 truncate text-steel">
                      {note.type === 'debit' ? 'Nota débito' : 'Nota crédito'} #{note.number} —
                      factura {note.invoicePrefix}
                      {note.invoiceNumber}
                    </dd>
                    <dd
                      className={`shrink-0 font-mono ${
                        note.type === 'debit' ? 'text-ok' : 'text-rust'
                      }`}
                    >
                      {note.type === 'debit' ? '+' : '-'}
                      {money(note.totalAmount)}
                    </dd>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-1 flex items-center justify-between rounded-sm bg-mist px-3 py-2">
              <dt className="font-medium text-ink">Efectivo esperado</dt>
              <dd className="font-mono font-semibold text-ink">
                {money(report.expectedCash ?? 0)}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-sm bg-mist px-3 py-2">
              <dt className="font-medium text-ink">Efectivo contado</dt>
              <dd className="font-mono font-semibold text-ink">
                {money(report.countedCash ?? 0)}
              </dd>
            </div>
            <div
              className={`flex items-center justify-between px-3 py-2 ${
                isSquared ? '' : 'bg-rust-tint'
              }`}
            >
              <dt>
                {isSquared ? (
                  <span className="stamp text-ok">Caja cuadrada</span>
                ) : (
                  <span className="text-rust">Desfase</span>
                )}
              </dt>
              <dd
                className={`font-mono font-semibold ${isSquared ? 'text-ok' : 'text-rust'}`}
              >
                {discrepancy > 0 ? '+' : ''}
                {money(discrepancy)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setIsPrinting(true)}
            >
              Imprimir
            </Button>
            <Button type="button" className="flex-1" onClick={onClosed}>
              Listo
            </Button>
          </div>
          {isPrinting && (
            <PrintTicket onClose={() => setIsPrinting(false)}>
              <CashRegisterTicket register={report} />
            </PrintTicket>
          )}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded bg-paper p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">¿Cerrar la caja del día?</h2>

        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between rounded-sm bg-ok-tint px-3 py-2">
            <dt className="text-ok">Recaudado hoy</dt>
            <dd className="font-mono font-semibold text-ok">{money(totalSoFar)}</dd>
          </div>
          <div className="flex items-center justify-between rounded-sm bg-amber-tint px-3 py-2">
            <dt className="text-amber">Cotizaciones de hoy sin cobrar</dt>
            <dd className="font-mono font-semibold text-amber">{money(totalOwedSoFar)}</dd>
          </div>
          <div className="flex items-center justify-between rounded-sm bg-mist px-3 py-2">
            <dt className="text-steel">Efectivo esperado en caja</dt>
            <dd className="font-mono font-semibold text-ink">{money(expectedCashSoFar)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-steel">
          Lo adeudado no cuenta como recaudado — solo las cotizaciones abiertas hoy, no las de días
          anteriores. Esta acción no se puede deshacer.
        </p>

        <div className="mt-3 flex flex-col gap-1.5">
          <label htmlFor="counted-cash" className="text-sm font-medium text-steel">
            Efectivo contado en caja
          </label>
          <input
            id="counted-cash"
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Cuenta el efectivo físico"
            value={countedCash}
            onChange={(e) => setCountedCash(e.target.value)}
            className="min-h-12 w-full rounded-sm border border-line bg-paper px-4 py-3 text-base text-ink placeholder:text-fog focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/30 sm:min-h-11 sm:py-2.5 sm:text-sm"
          />
        </div>

        {closeMutation.isError && (
          <div className="mt-3">
            <Alert variant="error">{getApiErrorMessage(closeMutation.error)}</Alert>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            isLoading={closeMutation.isPending}
            disabled={!isValidCounted}
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
