import { money } from '../../lib/portfolio';
import type { PortfolioTotals } from '../../services/portfolio';

interface PortfolioTotalsLedgerProps {
  totals: PortfolioTotals;
}

/**
 * The cartera's three figures as one ledger line — what was handed out on
 * credit, what was paid toward it, and what is still owed — with the
 * double rule of a ledger total under the balance.
 */
export function PortfolioTotalsLedger({ totals }: PortfolioTotalsLedgerProps) {
  return (
    <dl className="grid border border-line bg-paper sm:grid-cols-3 sm:divide-x sm:divide-line">
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3 sm:flex-col sm:items-start sm:justify-start sm:border-b-0">
        <dt className="text-sm text-steel">
          Total en cotizaciones
          <span className="ml-1 text-fog">({totals.quotationCount})</span>
        </dt>
        <dd className="font-mono text-lg text-ink sm:text-xl">{money(totals.totalAmount)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3 sm:flex-col sm:items-start sm:justify-start sm:border-b-0">
        <dt className="text-sm text-steel">Abonado</dt>
        <dd className="font-mono text-lg text-ok sm:text-xl">{money(totals.paidAmount)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-3 bg-amber-tint px-4 py-3 sm:flex-col sm:items-start sm:justify-start">
        <dt className="text-sm font-semibold text-amber">Pendiente por cobrar</dt>
        <dd className="total-rule font-mono text-xl font-bold text-ink sm:text-2xl">
          {money(totals.balance)}
        </dd>
      </div>
    </dl>
  );
}
