import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useQuotations } from '../hooks/useQuotations';
import { usePermissions } from '../hooks/usePermissions';
import { getApiErrorMessage } from '../lib/errors';
import {
  CUSTOMER_TYPE_LABEL,
  quotationCustomerLabel,
  quotationCustomerType,
} from '../lib/quotationLabels';
import type { QuotationCustomerType, QuotationStatus } from '../services/quotations';

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<QuotationStatus, string> = {
  open: 'Abierta',
  invoiced: 'Facturada',
  cancelled: 'Cancelada',
};

const STATUS_STYLE: Record<QuotationStatus, string> = {
  open: 'bg-amber-tint text-amber',
  invoiced: 'bg-ok-tint text-ok',
  cancelled: 'bg-rust-tint text-rust-2',
};

const FILTERS: Array<{ label: string; value: QuotationStatus | undefined }> = [
  { label: 'Abiertas', value: 'open' },
  { label: 'Facturadas', value: 'invoiced' },
  { label: 'Canceladas', value: 'cancelled' },
  { label: 'Todas', value: undefined },
];

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

function quotationNumberLabel(number: number): string {
  return `COT-${String(number).padStart(4, '0')}`;
}

export function QuotationsListPage() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { has } = usePermissions();
  const [status, setStatus] = useState<QuotationStatus | undefined>('open');
  const [customerType, setCustomerType] = useState<QuotationCustomerType | undefined>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const quotationsQuery = useQuotations({
    page,
    limit: PAGE_SIZE,
    status,
    customerType,
    search: debouncedSearch || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Cotizaciones
        </h1>
        {has('quotations.create') && (
          <Button
            type="button"
            className="sm:w-auto sm:px-6"
            onClick={() => navigate('/cotizaciones/nueva')}
          >
            Nueva cotización
          </Button>
        )}
      </div>

      <TextField
        label="Buscar por número, cliente o identificación"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = filter.value === status;
          return (
            <button
              key={filter.label}
              type="button"
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
              className={filterChipClass(isActive)}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {CUSTOMER_TYPE_FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            aria-pressed={filter.value === customerType}
            onClick={() => {
              setCustomerType(filter.value);
              setPage(1);
            }}
            className={filterChipClass(filter.value === customerType)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {quotationsQuery.isPending && <Spinner label="Cargando…" />}

      {quotationsQuery.isError && (
        <Alert variant="error">{getApiErrorMessage(quotationsQuery.error)}</Alert>
      )}

      {quotationsQuery.data && (
        <>
          {quotationsQuery.data.data.length === 0 ? (
            <Alert variant="info">No hay cotizaciones para este filtro.</Alert>
          ) : (
            <div className="divide-y divide-line rounded border border-line bg-paper">
              {quotationsQuery.data.data.map((quotation) => {
                return (
                <Link
                  key={quotation.id}
                  to={`/cotizaciones/${quotation.id}`}
                  className="flex flex-col gap-2 px-4 py-3 hover:bg-mist sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">
                      <span className="font-mono font-medium">
                        {quotationNumberLabel(quotation.number)}
                      </span>
                      {' — '}
                      {quotationCustomerLabel(quotation)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[quotation.status]}`}
                      >
                        {STATUS_LABEL[quotation.status]}
                      </span>
                      <span className="rounded-full border border-line px-2 py-0.5 text-xs text-steel">
                        {CUSTOMER_TYPE_LABEL[quotationCustomerType(quotation)]}
                      </span>
                      <span className="text-xs text-fog">
                        {new Date(quotation.createdAt).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="shrink-0 font-mono text-base font-semibold text-ink">
                    ${quotation.totalAmount.toLocaleString('es-CO')}
                  </p>
                </Link>
                );
              })}
            </div>
          )}

          <Pagination meta={quotationsQuery.data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
