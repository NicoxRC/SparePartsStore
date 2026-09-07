import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import { Spinner } from '../components/Spinner';
import {
  useInvoices,
  useRefreshInvoiceStatus,
  useResendInvoice,
} from '../hooks/useInvoices';
import { getApiErrorMessage } from '../lib/errors';

const PAGE_SIZE = 20;

const DIAN_STATUS_STYLE: Record<string, string> = {
  DIAN_ACEPTADO: 'bg-[#E9F3EC] text-[#2F6B45]',
  DIAN_RECHAZADO: 'bg-[#FBEAE7] text-[#A93C30]',
};

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
        <h1 className="text-xl font-bold tracking-tight text-[#1E2A4A] sm:text-2xl">
          Facturas
        </h1>
        <Link to="/invoicing/invoices/new">
          <Button className="sm:w-auto sm:px-6">+ Nueva factura</Button>
        </Link>
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
            <div className="overflow-x-auto rounded-2xl border border-[#E4E8EF] bg-white shadow-sm">
              <table className="min-w-full divide-y divide-[#E4E8EF] text-sm">
                <thead className="bg-[#F7F6F4] text-left text-xs font-medium uppercase tracking-wide text-[#8B92A3]">
                  <tr>
                    <th className="px-4 py-3">Número</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Estado DIAN</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E8EF]">
                  {invoicesQuery.data.data.map((invoice) => {
                    const isActioning = actioningId === invoice.id;
                    return (
                      <tr key={invoice.id}>
                        <td className="px-4 py-3 font-medium text-[#1E2A4A]">
                          {invoice.dataicoNumber ?? `${invoice.prefix}${invoice.number}`}
                        </td>
                        <td className="px-4 py-3">
                          {invoice.customerCompanyName ?? invoice.customerIdentification}
                        </td>
                        <td className="px-4 py-3">
                          ${invoice.totalAmount.toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3">
                          {invoice.dianStatus ? (
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                DIAN_STATUS_STYLE[invoice.dianStatus] ?? 'bg-[#EEF1F7] text-[#1E2A4A]'
                              }`}
                            >
                              {invoice.dianStatus}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">{invoice.issueDate}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            {invoice.pdfUrl && (
                              <a
                                href={invoice.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-medium text-[#1E2A4A] hover:underline"
                              >
                                Ver PDF
                              </a>
                            )}
                            <button
                              type="button"
                              disabled={isActioning}
                              onClick={() => void handleRefresh(invoice.id)}
                              className="text-sm font-medium text-[#1E2A4A] hover:underline disabled:opacity-40"
                            >
                              Consultar
                            </button>
                            <button
                              type="button"
                              disabled={isActioning}
                              onClick={() => void handleResend(invoice.id)}
                              className="text-sm font-medium text-[#1E2A4A] hover:underline disabled:opacity-40"
                            >
                              Reenviar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination meta={invoicesQuery.data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
