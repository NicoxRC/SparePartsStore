import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Pagination } from '../components/Pagination';
import { Spinner } from '../components/Spinner';
import {
  useInvoices,
  useRefreshInvoiceStatus,
  useResendInvoice,
} from '../hooks/useInvoices';
import { getApiErrorMessage } from '../lib/errors';
import type { InvoiceResponse } from '../services/invoices';

const PAGE_SIZE = 20;

const DIAN_STATUS_STYLE: Record<string, string> = {
  DIAN_ACEPTADO: 'bg-ok-tint text-ok',
  DIAN_RECHAZADO: 'bg-rust-tint text-rust-2',
};

/** Groups a page of invoices by issue date, preserving the backend's
 * newest-first order both across and within groups. */
function groupInvoicesByDate(invoices: InvoiceResponse[]): [string, InvoiceResponse[]][] {
  const groups = new Map<string, InvoiceResponse[]>();
  for (const invoice of invoices) {
    const group = groups.get(invoice.issueDate);
    if (group) {
      group.push(invoice);
    } else {
      groups.set(invoice.issueDate, [invoice]);
    }
  }
  return [...groups.entries()];
}

/** "issueDate" is a plain YYYY-MM-DD string (the store's local day) —
 * built from its parts, not `new Date(str)`, so no UTC-shift can push it
 * into the wrong day. */
function formatDateHeading(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const isCurrentYear = year === new Date().getFullYear();
  const formatted = date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: isCurrentYear ? undefined : 'numeric',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function InvoicesListPage() {
  const [page, setPage] = useState(1);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const invoicesQuery = useInvoices({ page, limit: PAGE_SIZE });
  const resendMutation = useResendInvoice();
  const refreshMutation = useRefreshInvoiceStatus();

  const handleResend = async (id: string) => {
    setActionError(null);
    setActioningId(id);
    try {
      await resendMutation.mutateAsync({ id });
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setActioningId(null);
    }
  };

  const handleRefresh = async (id: string) => {
    setActionError(null);
    setActioningId(id);
    try {
      await refreshMutation.mutateAsync(id);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Facturas
        </h1>
        <div className="flex gap-3">
          <Link
            to="/invoicing/debit-notes"
            className="text-sm font-medium text-ink hover:underline"
          >
            Notas débito →
          </Link>
          <Link
            to="/invoicing/credit-notes"
            className="text-sm font-medium text-ink hover:underline"
          >
            Notas crédito →
          </Link>
        </div>
      </div>

      {actionError && <Alert variant="error">{actionError}</Alert>}

      {invoicesQuery.isPending && <Spinner label="Cargando…" />}

      {invoicesQuery.isError && (
        <Alert variant="error">{getApiErrorMessage(invoicesQuery.error)}</Alert>
      )}

      {invoicesQuery.data && (
        <>
          {invoicesQuery.data.data.length === 0 ? (
            <Alert variant="info">Todavía no se ha enviado ninguna factura.</Alert>
          ) : (
            <div className="flex flex-col gap-6">
              {groupInvoicesByDate(invoicesQuery.data.data).map(([date, dayInvoices]) => {
                const dayTotal = dayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
                return (
                  <section key={date} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-1.5">
                      <h2 className="text-sm font-semibold text-ink sm:text-base">
                        {formatDateHeading(date)}
                      </h2>
                      <p className="shrink-0 text-xs text-fog sm:text-sm">
                        {dayInvoices.length} {dayInvoices.length === 1 ? 'factura' : 'facturas'}
                        {' · '}
                        <span className="font-mono font-medium text-steel">
                          ${dayTotal.toLocaleString('es-CO')}
                        </span>
                      </p>
                    </div>

                    <div className="divide-y divide-line rounded border border-line bg-white">
                      {dayInvoices.map((invoice) => {
                        const isActioning = actioningId === invoice.id;
                        return (
                          <div
                            key={invoice.id}
                            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm text-ink">
                                <span className="font-mono font-medium">
                                  {invoice.dataicoNumber ?? `${invoice.prefix}${invoice.number}`}
                                </span>
                                {' — '}
                                {invoice.customerCompanyName ?? invoice.customerIdentification}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                {invoice.dianStatus && (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                      DIAN_STATUS_STYLE[invoice.dianStatus] ??
                                      'bg-info-tint text-ink'
                                    }`}
                                  >
                                    {invoice.dianStatus}
                                  </span>
                                )}
                                {invoice.pdfUrl && (
                                  <a
                                    href={invoice.pdfUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-medium text-ink hover:underline"
                                  >
                                    Ver PDF
                                  </a>
                                )}
                                <button
                                  type="button"
                                  disabled={isActioning}
                                  onClick={() => void handleRefresh(invoice.id)}
                                  className="text-xs font-medium text-ink hover:underline disabled:opacity-40"
                                >
                                  Consultar
                                </button>
                                <button
                                  type="button"
                                  disabled={isActioning}
                                  onClick={() => void handleResend(invoice.id)}
                                  className="text-xs font-medium text-ink hover:underline disabled:opacity-40"
                                >
                                  Reenviar
                                </button>
                                <Link
                                  to={`/invoicing/invoices/${invoice.id}/debit-note`}
                                  className="text-xs font-medium text-ink hover:underline"
                                >
                                  Nota débito
                                </Link>
                                <Link
                                  to={`/invoicing/invoices/${invoice.id}/credit-note`}
                                  className="text-xs font-medium text-ink hover:underline"
                                >
                                  Nota crédito
                                </Link>
                              </div>
                            </div>
                            <p className="shrink-0 font-mono text-base font-semibold text-ink">
                              ${invoice.totalAmount.toLocaleString('es-CO')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <Pagination meta={invoicesQuery.data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
