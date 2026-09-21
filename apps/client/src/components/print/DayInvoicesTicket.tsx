import { ticketDate, ticketInt, ticketMoney, ticketTime, storeToday } from '../../lib/ticketFormat';
import type { DayInvoicesReport } from '../../services/cashRegister';

const MEANS_LABEL: Record<string, string> = {
  CASH: 'Ef',
  CARD: 'Tj',
  BANK_TRANSFER: 'Tr',
};

function Dotted() {
  return <hr className="my-2 border-0 border-t-2 border-dotted border-black" />;
}

function SummaryRow({ count, label, value }: { count?: number; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[14%_1fr_38%] gap-1 py-px text-[11px]">
      <span className="text-right">{count ?? ''}</span>
      <span>{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

/**
 * Second page of the cash-register printout: every invoice of the day with
 * its value and how it was paid, then how it all adds up. Same layout as the
 * store's existing daily listing. There is no "Descuento" line: an invoice
 * stores the discounted price, so the discount itself isn't recoverable.
 * See PrintTicket for how this gets shown.
 */
export function DayInvoicesTicket({ report }: { report: DayInvoicesReport }) {
  const dayLabel =
    report.registerDate === storeToday()
      ? `De hoy ${ticketDate(report.registerDate)}`
      : `Del ${ticketDate(report.registerDate)}`;
  const now = new Date();

  return (
    <div className="mx-auto w-[290px] p-2 text-[11px] leading-snug">
      <div className="flex justify-between text-[11px]">
        <span>{ticketDate(storeToday())}</span>
        <span>{ticketTime(now)}</span>
      </div>
      <p className="mt-1 text-center text-[13px] font-bold">LA CASA DE LOS REPUESTOS</p>
      <p className="text-center text-[12px]">{dayLabel} (General)</p>

      <Dotted />

      <div className="grid grid-cols-[1fr_auto_38%] gap-2 text-[11px] font-semibold">
        <span>Número</span>
        <span className="text-right">Valor</span>
        <span className="text-right">Pago</span>
      </div>
      {report.invoices.length === 0 && <p className="py-2 text-center">Sin facturas.</p>}
      {report.invoices.map((invoice, index) => (
        <div key={index} className="grid grid-cols-[1fr_auto_38%] gap-2 py-px text-[11px]">
          <span>{invoice.number}</span>
          <span className="text-right">{ticketInt(invoice.total)}</span>
          <span className="text-right">
            {invoice.paymentMeans ? `${MEANS_LABEL[invoice.paymentMeans]} ${ticketMoney(invoice.total)}` : '—'}
          </span>
        </div>
      ))}

      <Dotted />

      <div className="grid grid-cols-[14%_1fr_38%] gap-1 text-[11px] font-semibold">
        <span className="text-right">No.</span>
        <span>Forma de pago</span>
        <span />
      </div>
      <SummaryRow count={report.cash.count} label="Efectivo:" value={ticketInt(report.cash.amount)} />
      <SummaryRow count={report.card.count} label="Tarjeta:" value={ticketInt(report.card.amount)} />
      <SummaryRow
        count={report.transfer.count}
        label="Transferencia:"
        value={ticketInt(report.transfer.amount)}
      />

      <Dotted />

      <SummaryRow label="Gravados:" value={ticketInt(report.taxable)} />
      <SummaryRow label="Tl iva:" value={ticketInt(report.tax)} />
      <SummaryRow label="Exentos:" value={ticketInt(report.exempt)} />
      <hr className="my-1 border-0 border-t border-black" />
      <div className="grid grid-cols-[14%_1fr_38%] gap-1 text-[12px] font-bold">
        <span className="text-right">{report.invoiceCount}</span>
        <span>Tl:</span>
        <span className="text-right">{ticketInt(report.total)}</span>
      </div>
    </div>
  );
}
