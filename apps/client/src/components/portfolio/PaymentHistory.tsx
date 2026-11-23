import { money, PAYMENT_MEANS_LABEL, storeDateTimeLabel } from '../../lib/portfolio';
import type { QuotationPayment } from '../../services/portfolio';

interface PaymentHistoryProps {
  payments: QuotationPayment[];
  /** Admin only — shows "Anular" on each abono that still counts. */
  onVoid?: (payment: QuotationPayment) => void;
}

/**
 * A quotation's abonos, oldest first: when, how much, cash or transfer, who
 * received it. Voided ones stay, struck through. Shared by Cotizaciones
 * (so the cashier sees what was already paid) and the cartera.
 */
export function PaymentHistory({ payments, onVoid }: PaymentHistoryProps) {
  return (
    <ol className="divide-y divide-line border border-line">
      {payments.map((payment) => {
        const isVoided = !!payment.voidedAt;
        return (
          <li
            key={payment.id}
            className={`flex items-start justify-between gap-3 px-3 py-2 text-sm ${
              isVoided ? 'carbon-row text-fog' : ''
            }`}
          >
            <div className="min-w-0">
              <p className={`flex flex-wrap items-center gap-x-2 ${isVoided ? 'line-through' : 'text-ink'}`}>
                <span className="border border-line-2 px-1.5 text-xs font-semibold uppercase tracking-wide">
                  {PAYMENT_MEANS_LABEL[payment.paymentMeans]}
                </span>
                <span>{storeDateTimeLabel(payment.createdAt)}</span>
              </p>
              <p className="mt-0.5 text-xs text-fog">
                {payment.createdByName ? `Recibió ${payment.createdByName}` : 'Recibido'}
                {isVoided &&
                  ` · Anulado${payment.voidedByName ? ` por ${payment.voidedByName}` : ''} el ${storeDateTimeLabel(payment.voidedAt!)}`}
              </p>
              {payment.notes && <p className="mt-0.5 text-xs text-steel">{payment.notes}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`font-mono ${isVoided ? 'line-through' : 'text-ink'}`}>
                {money(payment.amount)}
              </span>
              {onVoid && !isVoided && (
                <button
                  type="button"
                  onClick={() => onVoid(payment)}
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
  );
}
