import { Link } from 'react-router-dom';
import { QuotationDayCounters } from '../QuotationDayCounters';
import {
  money,
  PAYMENT_MEANS_LABEL,
  quotationNumberLabel,
  storeDateLabel,
} from '../../lib/portfolio';
import type { PortfolioQuotation, QuotationPayment } from '../../services/portfolio';

interface PortfolioQuotationEntryProps {
  quotation: PortfolioQuotation;
  canRegisterPayment: boolean;
  canVoidPayment: boolean;
  canOpenQuotation: boolean;
  onRegisterPayment: (quotation: PortfolioQuotation) => void;
  onVoidPayment: (payment: QuotationPayment) => void;
}

/** One open quotation on a customer's statement: its figures, its age, its abonos. */
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
        <ol className="divide-y divide-line border border-line">
          {quotation.payments.map((payment) => {
            const isVoided = !!payment.voidedAt;
            return (
              <li
                key={payment.id}
                className={`flex items-start justify-between gap-3 px-3 py-2 text-sm ${
                  isVoided ? 'carbon-row text-fog' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className={isVoided ? 'line-through' : 'text-ink'}>
                    Abono {storeDateLabel(payment.createdAt)} ·{' '}
                    {PAYMENT_MEANS_LABEL[payment.paymentMeans]}
                  </p>
                  <p className="text-xs text-fog">
                    {payment.createdByName ? `Recibió ${payment.createdByName}` : 'Recibido'}
                    {isVoided &&
                      ` · Anulado${payment.voidedByName ? ` por ${payment.voidedByName}` : ''} el ${storeDateLabel(payment.voidedAt!)}`}
                  </p>
                  {payment.notes && (
                    <p className="mt-0.5 text-xs text-steel">{payment.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`font-mono ${isVoided ? 'line-through' : 'text-ink'}`}>
                    {money(payment.amount)}
                  </span>
                  {canVoidPayment && !isVoided && (
                    <button
                      type="button"
                      onClick={() => onVoidPayment(payment)}
                      className="min-h-10 px-2 text-xs font-medium text-rust underline underline-offset-4 hover:text-rust-2"
                    >
                      Anular
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
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
