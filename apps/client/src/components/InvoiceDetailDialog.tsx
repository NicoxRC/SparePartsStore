import { createPortal } from 'react-dom';
import { Alert } from './Alert';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { useInvoiceTicketQuery } from '../hooks/useInvoices';
import { getApiErrorMessage } from '../lib/errors';

interface InvoiceDetailDialogProps {
  invoiceId: string;
  onClose: () => void;
}

const money = (amount: number) => `$${amount.toLocaleString('es-CO')}`;

/**
 * What was sold on an invoice, on screen — same data as the printed tirilla
 * (`GET /invoicing/invoices/:id/ticket`, built from what's already stored)
 * but without opening the browser's print dialog, so staff can just glance
 * at it. Never touches Dataico, unlike "Consultar" (DIAN status refresh).
 */
export function InvoiceDetailDialog({ invoiceId, onClose }: InvoiceDetailDialogProps) {
  const ticketQuery = useInvoiceTicketQuery(invoiceId);
  const ticket = ticketQuery.data;

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded bg-paper p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">
          {ticket ? ticket.number : 'Detalle de la factura'}
        </h2>

        {ticketQuery.isPending && <Spinner label="Cargando…" />}
        {ticketQuery.isError && (
          <Alert variant="error">{getApiErrorMessage(ticketQuery.error)}</Alert>
        )}

        {ticket && (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-steel">{ticket.customer.name}</p>

            <ul className="flex flex-col divide-y divide-line text-sm">
              {ticket.items.map((item, index) => (
                <li key={index} className="flex items-start justify-between gap-3 py-2">
                  <span>
                    {item.description}
                    {item.taxRate <= 0 && (
                      <span className="ml-1.5 text-xs font-medium text-fog">Exento</span>
                    )}
                    <span className="block text-xs text-fog">
                      {item.quantity} × {money(item.value / item.quantity)}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono">{money(item.value)}</span>
                </li>
              ))}
            </ul>

            <dl className="flex flex-col gap-1 border-t border-line pt-2 font-mono text-sm text-steel">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{money(ticket.subtotal)}</dd>
              </div>
              {ticket.taxes.map((tax) => (
                <div key={tax.rate} className="flex justify-between">
                  <dt>IVA {tax.rate}%</dt>
                  <dd>{money(tax.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between text-base font-semibold text-ink">
                <dt>Total</dt>
                <dd>{money(ticket.total)}</dd>
              </div>
            </dl>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
