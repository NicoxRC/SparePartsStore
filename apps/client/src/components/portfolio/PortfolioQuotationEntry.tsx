import { Link } from 'react-router-dom';
import { QuotationDayCounters } from '../QuotationDayCounters';
import { QuotationNotesList } from '../QuotationNotes';
import { money, quotationNumberLabel, storeDateLabel } from '../../lib/portfolio';
import { PaymentHistory } from './PaymentHistory';
import type { PortfolioQuotation, QuotationPayment } from '../../services/portfolio';

interface PortfolioQuotationEntryProps {
  quotation: PortfolioQuotation;
  canRegisterPayment: boolean;
  canVoidPayment: boolean;
  canOpenQuotation: boolean;
  onRegisterPayment: (quotation: PortfolioQuotation) => void;
  onVoidPayment: (payment: QuotationPayment) => void;
}

/** One open quotation on a customer's statement: its figures, its age, its abonos and notes. */
export function PortfolioQuotationEntry({
  quotation,
  canRegisterPayment,
  canVoidPayment,
  canOpenQuotation,
  onRegisterPayment,
  onVoidPayment,
}: PortfolioQuotationEntryProps) {
  return (
    <li className="flex flex-col gap-3 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="text-sm text-ink">
            <span className="font-mono font-semibold">{quotationNumberLabel(quotation.number)}</span>
            <span className="text-steel"> · {storeDateLabel(quotation.createdAt)}</span>
          </p>
          <div className="mt-1">
            <QuotationDayCounters
              createdAt={quotation.createdAt}
              lastChangedAt={quotation.lastChangedAt}
            />
          </div>
        </div>
        <dl className="flex gap-5 text-right">
          <div>
            <dt className="text-xs text-fog">Total</dt>
            <dd className="font-mono text-sm text-ink">{money(quotation.totalAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-fog">Abonado</dt>
            <dd className="font-mono text-sm text-ok">{money(quotation.paidAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber">Saldo</dt>
            <dd className="font-mono text-base font-bold text-ink">{money(quotation.balance)}</dd>
          </div>
        </dl>
      </div>

      {quotation.payments.length > 0 && (
        <PaymentHistory
          payments={quotation.payments}
          onVoid={canVoidPayment ? onVoidPayment : undefined}
        />
      )}

      {quotation.quotationNotes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-fog">
            Notas de la cotización
          </p>
          <QuotationNotesList notes={quotation.quotationNotes} />
        </div>
      )}

      {(canRegisterPayment || canOpenQuotation) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {canRegisterPayment && (
            <button
              type="button"
              onClick={() => onRegisterPayment(quotation)}
              className="min-h-11 border border-ink bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink-2"
            >
              Registrar abono
            </button>
          )}
          {canOpenQuotation && (
            <Link
              to={`/cotizaciones/${quotation.id}`}
              className="text-sm font-medium text-steel underline underline-offset-4 hover:text-ink"
            >
              Ver cotización
            </Link>
          )}
        </div>
      )}
    </li>
  );
}
