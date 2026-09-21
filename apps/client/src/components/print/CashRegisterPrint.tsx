import { CashRegisterTicket } from './CashRegisterTicket';
import { DayInvoicesTicket } from './DayInvoicesTicket';
import { PrintTicket } from './PrintTicket';
import { useDayInvoicesReport } from '../../hooks/useCashRegister';
import type { CashRegisterResponse } from '../../services/cashRegister';

/**
 * Prints the cash-register slip: the closing summary and, on a second page,
 * every invoice of that day. The day's invoices are loaded first so both
 * pages go out in ONE print job. If they can't be loaded, the summary still
 * prints (as it always did) and says the listing is missing, instead of
 * silently leaving it out.
 */
export function CashRegisterPrint({
  register,
  onClose,
}: {
  register: CashRegisterResponse;
  onClose: () => void;
}) {
  const reportQuery = useDayInvoicesReport(register.id);

  if (reportQuery.isPending) return null;

  return (
    <PrintTicket onClose={onClose}>
      <div style={{ breakAfter: reportQuery.data ? 'page' : 'auto' }}>
        <CashRegisterTicket register={register} listingUnavailable={reportQuery.isError} />
      </div>
      {reportQuery.data && <DayInvoicesTicket report={reportQuery.data} />}
    </PrintTicket>
  );
}
