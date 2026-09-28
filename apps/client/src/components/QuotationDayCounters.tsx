import { daysLabel, daysSince, PAYMENT_TERM_DAYS } from '../lib/quotationDays';

interface QuotationDayCountersProps {
  createdAt: string;
  lastChangedAt: string;
}

/**
 * "Creada hace X días" and "Último cambio hace Y días". The second one is
 * the payment term's clock, so it turns red once it reaches 30 days.
 */
export function QuotationDayCounters({ createdAt, lastChangedAt }: QuotationDayCountersProps) {
  const sinceCreated = daysSince(createdAt);
  const sinceChanged = daysSince(lastChangedAt);
  const isOverdue = sinceChanged >= PAYMENT_TERM_DAYS;

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="text-steel">Creada {daysLabel(sinceCreated)}</span>
      <span className={isOverdue ? 'font-semibold text-rust' : 'text-steel'}>
        Último cambio {daysLabel(sinceChanged)}
        {isOverdue && ` · pasó el plazo de ${PAYMENT_TERM_DAYS} días`}
      </span>
    </span>
  );
}
