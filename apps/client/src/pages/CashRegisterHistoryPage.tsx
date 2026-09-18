import { Fragment, useState } from 'react';
import { Alert } from '../components/Alert';
import { Pagination } from '../components/Pagination';
import { CashRegisterTicket } from '../components/print/CashRegisterTicket';
import { PrintTicket } from '../components/print/PrintTicket';
import { Spinner } from '../components/Spinner';
import { useCashRegisterHistory, useUpdateCountedCash } from '../hooks/useCashRegister';
import { usePermissions } from '../hooks/usePermissions';
import { getApiErrorMessage } from '../lib/errors';
import type { CashRegisterResponse } from '../services/cashRegister';

const PAGE_SIZE = 20;

function money(value: number | null) {
  return value === null ? '—' : `$${value.toLocaleString('es-CO')}`;
}

function CorrectCountedCashCell({ register }: { register: CashRegisterResponse }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(register.countedCash ?? ''));
  const updateCountedCash = useUpdateCountedCash();

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-xs font-medium text-steel hover:text-ink hover:underline"
      >
        Corregir
      </button>
    );
  }

  const parsedValue = parseFloat(value);
  const isValid = !isNaN(parsedValue) && parsedValue >= 0;

  const handleSave = async () => {
    if (!isValid) return;
    try {
      await updateCountedCash.mutateAsync({ id: register.id, countedCash: parsedValue });
      setIsEditing(false);
    } catch {
      // Error shown via mutation.isError
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24 rounded-sm border border-line bg-paper px-2 py-1 text-right text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/30"
        />
        <button
          type="button"
          disabled={!isValid || updateCountedCash.isPending}
          onClick={() => void handleSave()}
          className="text-xs font-medium text-ok hover:underline disabled:cursor-not-allowed disabled:text-fog"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-xs font-medium text-fog hover:text-steel hover:underline"
        >
          Cancelar
        </button>
      </div>
      {updateCountedCash.isError && (
        <p className="text-xs text-rust">{getApiErrorMessage(updateCountedCash.error)}</p>
      )}
    </div>
  );
}

export function CashRegisterHistoryPage() {
  const { has } = usePermissions();
  const canCorrect = has('cash_register.counted_cash.correct');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const historyQuery = useCashRegisterHistory({ page, limit: PAGE_SIZE });
  const printingRegister = historyQuery.data?.data.find((r) => r.id === printingId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Historial de caja</h1>

      {historyQuery.isPending && <Spinner label="Cargando…" />}

      {historyQuery.isError && (
        <Alert variant="error">{getApiErrorMessage(historyQuery.error)}</Alert>
      )}

      {historyQuery.data && (
        <>
          {historyQuery.data.data.length === 0 ? (
            <Alert variant="info">Todavía no se ha abierto ninguna caja.</Alert>
          ) : (
            <div className="overflow-x-auto rounded border border-line bg-paper">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="bg-canvas text-left text-xs font-medium uppercase tracking-wide text-fog">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3 text-right">Base</th>
                    <th className="px-4 py-3 text-right">Efectivo</th>
                    <th className="px-4 py-3 text-right">Tarjeta</th>
                    <th className="px-4 py-3 text-right">Transferencia</th>
                    <th className="px-4 py-3 text-right">Esperado</th>
                    <th className="px-4 py-3 text-right">Contado</th>
                    <th className="px-4 py-3 text-right">Desfase</th>
                    <th className="px-4 py-3">Detalles</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {historyQuery.data.data.map((register) => {
                    const discrepancy = register.cashDiscrepancy;
                    const isExpanded = expandedId === register.id;
                    return (
                      <Fragment key={register.id}>
                      <tr>
                        <td className="px-4 py-3 font-medium text-ink">
                          {register.registerDate}
                          {register.isOpen && (
                            <span className="ml-2 text-xs font-normal text-ok">(abierta)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {money(register.openingAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {money(register.totalCash)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {money(register.totalCard)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {money(register.totalTransfer)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {money(register.expectedCash)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {money(register.countedCash)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-mono font-semibold ${
                            discrepancy === null
                              ? ''
                              : discrepancy === 0
                                ? 'text-ok'
                                : 'text-rust'
                          }`}
                        >
                          {discrepancy === null
                            ? '—'
                            : `${discrepancy > 0 ? '+' : ''}${money(discrepancy)}`}
                        </td>
                        <td className="px-4 py-3">
                          {register.movements.length + register.notes.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : register.id)}
                              className="text-xs font-medium text-steel hover:text-ink hover:underline"
                            >
                              {register.movements.length + register.notes.length} detalle
                              {register.movements.length + register.notes.length === 1 ? '' : 's'}
                              {isExpanded ? ' ▲' : ' ▼'}
                            </button>
                          ) : (
                            <span className="text-xs text-fog">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!register.isOpen && (
                              <button
                                type="button"
                                onClick={() => setPrintingId(register.id)}
                                className="text-xs font-medium text-steel hover:text-ink hover:underline"
                              >
                                Imprimir
                              </button>
                            )}
                            {!register.isOpen && canCorrect && (
                              <CorrectCountedCashCell register={register} />
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && register.movements.length + register.notes.length > 0 && (
                        <tr>
                          <td colSpan={10} className="bg-canvas px-4 py-3">
                            <div className="flex flex-col gap-3 text-sm">
                              {register.movements.length > 0 && (
                                <div className="flex flex-col gap-1">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-fog">
                                    Entradas y salidas
                                  </p>
                                  <ul className="flex flex-col gap-1">
                                    {register.movements.map((movement) => (
                                      <li key={movement.id} className="flex items-center justify-between gap-2">
                                        <span className="text-steel">
                                          {movement.reason}
                                          {movement.createdByName && (
                                            <span className="text-xs text-fog"> — {movement.createdByName}</span>
                                          )}
                                        </span>
                                        <span
                                          className={`font-mono ${
                                            movement.amount > 0 ? 'text-ok' : 'text-rust'
                                          }`}
                                        >
                                          {movement.amount > 0 ? '+' : ''}
                                          {money(movement.amount)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {register.notes.length > 0 && (
                                <div className="flex flex-col gap-1">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-fog">
                                    Notas débito/crédito
                                  </p>
                                  <ul className="flex flex-col gap-1">
                                    {register.notes.map((note) => (
                                      <li key={note.id} className="flex items-center justify-between gap-2">
                                        <span className="text-steel">
                                          {note.type === 'debit' ? 'Nota débito' : 'Nota crédito'} #{note.number}{' '}
                                          — factura {note.invoicePrefix}
                                          {note.invoiceNumber}
                                        </span>
                                        <span
                                          className={`font-mono ${
                                            note.type === 'debit' ? 'text-ok' : 'text-rust'
                                          }`}
                                        >
                                          {note.type === 'debit' ? '+' : '-'}
                                          {money(note.totalAmount)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination meta={historyQuery.data.meta} onPageChange={setPage} />
        </>
      )}

      {printingRegister && (
        <PrintTicket onClose={() => setPrintingId(null)}>
          <CashRegisterTicket register={printingRegister} />
        </PrintTicket>
      )}
    </div>
  );
}
