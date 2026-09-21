import type { CashRegisterResponse } from '../../services/cashRegister';

function money(value: number | null) {
  return value === null ? '—' : `$${Math.round(value).toLocaleString('es-CO')}`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/** Printable cierre-de-caja ticket — see PrintTicket for how this gets
 * shown. Deliberately built from this app's own reconciliation fields
 * (base/efectivo/tarjeta/transferencia/esperado/contado/desfase), not a
 * copy of the old Sisco slip's field set (cheque/bonos/crédito aren't
 * things this app tracks). */
export function CashRegisterTicket({
  register,
  listingUnavailable = false,
}: {
  register: CashRegisterResponse;
  /** The day's invoice listing (page 2) couldn't be loaded — say so on the paper. */
  listingUnavailable?: boolean;
}) {
  const discrepancy = register.cashDiscrepancy;
  const isSquared = discrepancy === 0;

  return (
    <div className="mx-auto w-[300px] p-4 text-xs leading-relaxed">
      <p className="text-center text-sm font-bold">LA CASA DE LOS REPUESTOS</p>
      <p className="text-center">Comprobante de cierre de caja</p>
      <p className="text-center">{register.registerDate}</p>

      <hr className="my-2 border-dashed border-black" />

      <p>Abierta: {formatDateTime(register.openedAt)}</p>
      {register.openedByName && <p>Por: {register.openedByName}</p>}
      <p>Cerrada: {formatDateTime(register.closedAt)}</p>
      {register.closedByName && <p>Por: {register.closedByName}</p>}

      <hr className="my-2 border-dashed border-black" />

      <div className="flex justify-between">
        <span>BASE</span>
        <span>{money(register.openingAmount)}</span>
      </div>
      <div className="flex justify-between">
        <span>EFECTIVO</span>
        <span>{money(register.totalCash)}</span>
      </div>
      <div className="flex justify-between">
        <span>TARJETA</span>
        <span>{money(register.totalCard)}</span>
      </div>
      <div className="flex justify-between">
        <span>TRANSFERENCIA</span>
        <span>{money(register.totalTransfer)}</span>
      </div>

      <hr className="my-2 border-dashed border-black" />

      <div className="flex justify-between font-bold">
        <span>RECAUDADO</span>
        <span>{money(register.totalAmount)}</span>
      </div>
      <div className="flex justify-between">
        <span>ADEUDADO (cotiz.)</span>
        <span>{money(register.totalOwed)}</span>
      </div>

      {register.movements.length > 0 && (
        <>
          <hr className="my-2 border-dashed border-black" />
          <p className="font-bold">ENTRADAS Y SALIDAS</p>
          {register.movements.map((movement) => (
            <div key={movement.id} className="flex justify-between gap-2">
              <span className="truncate">{movement.reason}</span>
              <span className="shrink-0">
                {movement.amount > 0 ? '+' : ''}
                {money(movement.amount)}
              </span>
            </div>
          ))}
        </>
      )}

      {register.notes.length > 0 && (
        <>
          <hr className="my-2 border-dashed border-black" />
          <p className="font-bold">NOTAS DÉBITO/CRÉDITO</p>
          {register.notes.map((note) => (
            <div key={note.id} className="flex justify-between gap-2">
              <span className="truncate">
                {note.type === 'debit' ? 'ND' : 'NC'} #{note.number} — {note.invoicePrefix}
                {note.invoiceNumber}
              </span>
              <span className="shrink-0">
                {note.type === 'debit' ? '+' : '-'}
                {money(note.totalAmount)}
              </span>
            </div>
          ))}
        </>
      )}

      <hr className="my-2 border-dashed border-black" />

      <div className="flex justify-between">
        <span>EFECTIVO ESPERADO</span>
        <span>{money(register.expectedCash)}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span>EFECTIVO CONTADO</span>
        <span>{money(register.countedCash)}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span>{isSquared ? 'CAJA CUADRADA' : discrepancy && discrepancy > 0 ? 'SOBRANTE' : 'FALTANTE'}</span>
        <span>
          {discrepancy !== null && discrepancy > 0 ? '+' : ''}
          {money(discrepancy)}
        </span>
      </div>

      <hr className="my-2 border-dashed border-black" />
      <p className="text-center">Impreso: {formatDateTime(new Date().toISOString())}</p>
      {listingUnavailable && (
        <p className="mt-2 text-center font-bold">
          (No se pudo cargar el listado de facturas del día)
        </p>
      )}
    </div>
  );
}
