import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { PortfolioRangeFilter } from '../components/portfolio/PortfolioRangeFilter';
import { PortfolioTotalsLedger } from '../components/portfolio/PortfolioTotalsLedger';
import { PortfolioSummaryReport } from '../components/print/PortfolioReport';
import { PrintTicket } from '../components/print/PrintTicket';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { usePortfolio } from '../hooks/usePortfolio';
import { usePortfolioRange } from '../hooks/usePortfolioRange';
import { getApiErrorMessage } from '../lib/errors';
import { money } from '../lib/portfolio';
import { CUSTOMER_TYPE_LABEL } from '../lib/quotationLabels';
import { daysLabel, daysSince, PAYMENT_TERM_DAYS } from '../lib/quotationDays';
import type { PortfolioCustomerSummary } from '../services/portfolio';
import type { QuotationCustomerType } from '../services/quotations';

const CUSTOMER_TYPE_FILTERS: Array<{ label: string; value: QuotationCustomerType | undefined }> = [
  { label: 'Todos', value: undefined },
  { label: CUSTOMER_TYPE_LABEL.empresa, value: 'empresa' },
  { label: CUSTOMER_TYPE_LABEL.empleado, value: 'empleado' },
];

function filterChipClass(isActive: boolean): string {
  return `rounded-full border px-3 py-1.5 text-sm ${
    isActive ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-steel hover:bg-mist'
  }`;
}

/** Cartera general — every customer who owes something on an open quotation. */
export function PortfolioPage() {
  const { from, to, setRange, apiRange, queryString } = usePortfolioRange();
  const [customerType, setCustomerType] = useState<QuotationCustomerType | undefined>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const portfolioQuery = usePortfolio({
    ...apiRange,
    customerType,
    search: debouncedSearch || undefined,
  });
  const summary = portfolioQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Cartera</h1>
        <Button
          type="button"
          variant="secondary"
          className="sm:w-auto sm:px-6"
          disabled={!summary || summary.customers.length === 0}
          onClick={() => setIsPrinting(true)}
        >
          Imprimir PDF
        </Button>
      </div>

      <PortfolioRangeFilter from={from} to={to} onChange={setRange} />

      <TextField
        label="Buscar cliente por nombre o cédula/NIT"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {CUSTOMER_TYPE_FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            aria-pressed={filter.value === customerType}
            onClick={() => setCustomerType(filter.value)}
            className={filterChipClass(filter.value === customerType)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {portfolioQuery.isPending && <Spinner label="Cargando cartera…" />}

      {portfolioQuery.isError && (
        <Alert variant="error">{getApiErrorMessage(portfolioQuery.error)}</Alert>
      )}

      {summary && (
        <>
          <PortfolioTotalsLedger totals={summary.totals} />

          {summary.customers.length === 0 ? (
            <Alert variant="info">
              Nadie debe nada{from || to ? ' en estas fechas' : ''}. Las cotizaciones abiertas
              aparecen aquí con su saldo.
            </Alert>
          ) : (
            <ul className="divide-y divide-line border border-line bg-paper">
              {summary.customers.map((customer) => (
                <CustomerRow
                  key={customer.identification}
                  customer={customer}
                  queryString={queryString}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {isPrinting && summary && (
        <PrintTicket format="letter" onClose={() => setIsPrinting(false)}>
          <PortfolioSummaryReport summary={summary} range={apiRange} />
        </PrintTicket>
      )}
    </div>
  );
}

interface CustomerRowProps {
  customer: PortfolioCustomerSummary;
  queryString: string;
}

function CustomerRow({ customer, queryString }: CustomerRowProps) {
  const oldestDays = daysSince(customer.oldestCreatedAt);
  const isOverdue = oldestDays >= PAYMENT_TERM_DAYS;
  const { totals } = customer;

  return (
    <li>
      <Link
        to={`/cartera/${encodeURIComponent(customer.identification)}${queryString}`}
        className="flex flex-col gap-2 px-4 py-3 hover:bg-mist sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{customer.name}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-mono text-steel">
              {customer.identificationType} {customer.identification}
            </span>
            <span className="text-steel">
              {totals.quotationCount}{' '}
              {totals.quotationCount === 1 ? 'cotización' : 'cotizaciones'}
            </span>
            <span className={isOverdue ? 'font-semibold text-rust' : 'text-fog'}>
              La más antigua: {daysLabel(oldestDays)}
              {isOverdue && ` · pasó el plazo de ${PAYMENT_TERM_DAYS} días`}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-baseline justify-between gap-4 sm:flex-col sm:items-end sm:gap-0.5">
          <p className="font-mono text-lg font-semibold text-ink">{money(totals.balance)}</p>
          <p className="text-xs text-fog">
            {totals.paidAmount > 0 ? (
              <>
                de <span className="font-mono">{money(totals.totalAmount)}</span> · abonado{' '}
                <span className="font-mono text-ok">{money(totals.paidAmount)}</span>
              </>
            ) : (
              'sin abonos'
            )}
          </p>
        </div>
      </Link>
    </li>
  );
}
