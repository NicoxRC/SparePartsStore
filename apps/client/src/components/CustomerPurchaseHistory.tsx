import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from './Alert';
import { Spinner } from './Spinner';
import { TextField } from './TextField';
import { useCustomerHistory } from '../hooks/useCustomers';
import { getApiErrorMessage } from '../lib/errors';
import type { InvoiceResponse } from '../services/invoices';
import type { QuotationResponse } from '../services/quotations';

interface CustomerPurchaseHistoryProps {
  customerId: string;
}

const QUOTATION_STATUS_LABEL: Record<QuotationResponse['status'], string> = {
  open: 'Abierta',
  invoiced: 'Facturada',
  cancelled: 'Cancelada',
};

const QUOTATION_STATUS_STYLE: Record<QuotationResponse['status'], string> = {
  open: 'bg-amber-tint text-amber',
  invoiced: 'bg-ok-tint text-ok',
  cancelled: 'bg-rust-tint text-rust-2',
};

/** `issueDate` is a plain YYYY-MM-DD string — built from parts, not
 * `new Date(str)`, so no UTC-shift can push it into the wrong day. */
function formatIssueDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function quotationNumberLabel(number: number): string {
  return `COT-${String(number).padStart(4, '0')}`;
}

function InvoiceRow({ invoice }: { invoice: InvoiceResponse }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-mono font-medium text-ink">
          {invoice.dataicoNumber ?? `${invoice.prefix}${invoice.number}`}
        </p>
        <p className="text-xs text-fog">
          {formatIssueDate(invoice.issueDate)}
          {invoice.dianStatus ? ` · ${invoice.dianStatus}` : ''}
        </p>
      </div>
      <p className="shrink-0 font-mono font-semibold text-ink">
        ${invoice.totalAmount.toLocaleString('es-CO')}
      </p>
    </div>
  );
}

function QuotationRow({ quotation }: { quotation: QuotationResponse }) {
  return (
    <Link
      to={`/cotizaciones/${quotation.id}`}
      className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-mist"
    >
      <div className="min-w-0">
        <p className="truncate font-mono font-medium text-ink">
          {quotationNumberLabel(quotation.number)}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <span
            className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${QUOTATION_STATUS_STYLE[quotation.status]}`}
          >
            {QUOTATION_STATUS_LABEL[quotation.status]}
          </span>
          <span className="text-xs text-fog">{formatDateTime(quotation.createdAt)}</span>
        </div>
      </div>
      <p className="shrink-0 font-mono font-semibold text-ink">
        ${quotation.totalAmount.toLocaleString('es-CO')}
      </p>
    </Link>
  );
}

export function CustomerPurchaseHistory({ customerId }: CustomerPurchaseHistoryProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const historyQuery = useCustomerHistory(customerId, {
    from: from || undefined,
    to: to || undefined,
  });

  const invoicesTotal =
    historyQuery.data?.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0) ?? 0;
  const quotationsTotal =
    historyQuery.data?.quotations.reduce((sum, q) => sum + q.totalAmount, 0) ?? 0;

  return (
    <section className="flex flex-col gap-4 rounded border border-line bg-paper p-4 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-fog">
        Historial de compras
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Desde"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <TextField label="Hasta" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {historyQuery.isPending && <Spinner label="Cargando historial…" />}

      {historyQuery.isError && (
        <Alert variant="error">{getApiErrorMessage(historyQuery.error)}</Alert>
      )}

      {historyQuery.data && (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-fog">
                Facturas ({historyQuery.data.invoices.length})
              </h3>
              {historyQuery.data.invoices.length > 0 && (
                <p className="font-mono text-xs text-steel">
                  ${invoicesTotal.toLocaleString('es-CO')}
                </p>
              )}
            </div>
            {historyQuery.data.invoices.length === 0 ? (
              <p className="text-sm text-fog">Sin facturas en este rango.</p>
            ) : (
              <div className="divide-y divide-line rounded-sm border border-line-2">
                {historyQuery.data.invoices.map((invoice) => (
                  <InvoiceRow key={invoice.id} invoice={invoice} />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-fog">
                Cotizaciones ({historyQuery.data.quotations.length})
              </h3>
              {historyQuery.data.quotations.length > 0 && (
                <p className="font-mono text-xs text-steel">
                  ${quotationsTotal.toLocaleString('es-CO')}
                </p>
              )}
            </div>
            {historyQuery.data.quotations.length === 0 ? (
              <p className="text-sm text-fog">Sin cotizaciones en este rango.</p>
            ) : (
              <div className="divide-y divide-line rounded-sm border border-line-2">
                {historyQuery.data.quotations.map((quotation) => (
                  <QuotationRow key={quotation.id} quotation={quotation} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
