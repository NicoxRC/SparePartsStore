import { daysLabel, daysSince, PAYMENT_TERM_DAYS } from '../lib/quotationDays';

interface QuotationDayCountersProps {
  createdAt: string;
  lastChangedAt: string;
}

/**
 * "Creada hace X días" and "Último cambio hace Y días". The first one is
 * the payment term's clock — it never restarts when the items change — so
 * it turns red once it reaches 30 days. The second one is only informative.
 */
export function QuotationDayCounters({ createdAt, lastChangedAt }: QuotationDayCountersProps) {
  const sinceCreated = daysSince(createdAt);
  const sinceChanged = daysSince(lastChangedAt);
  const isOverdue = sinceCreated >= PAYMENT_TERM_DAYS;

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className={isOverdue ? 'font-semibold text-rust' : 'text-steel'}>
        Creada {daysLabel(sinceCreated)}
        {isOverdue && ` · pasó el plazo de ${PAYMENT_TERM_DAYS} días`}
      </span>
      <span className="text-fog">Último cambio {daysLabel(sinceChanged)}</span>
    </span>
  );
}
