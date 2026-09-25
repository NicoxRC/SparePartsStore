import { useState } from 'react';
import { Alert } from '../Alert';
import { InvoiceTicket } from './InvoiceTicket';
import { PrintTicket } from './PrintTicket';
import { useInvoiceTickets } from '../../hooks/useInvoices';
import { getApiErrorMessage } from '../../lib/errors';
import type { InvoiceTicket as InvoiceTicketData } from '../../services/invoices';

interface PrintInvoiceTicketButtonProps {
  /** Usually one; several print one after another in the same print job. */
  invoiceIds: string[];
  className?: string;
  label?: string;
}

/** Fetches the invoices' receipt data and hands it to the browser's print dialog. */
export function PrintInvoiceTicketButton({
  invoiceIds,
  className = 'font-medium text-ink hover:underline',
  label = 'Imprimir tirilla',
}: PrintInvoiceTicketButtonProps) {
  const ticketMutation = useInvoiceTickets();
  const [tickets, setTickets] = useState<InvoiceTicketData[] | null>(null);

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={ticketMutation.isPending}
        onClick={() => ticketMutation.mutate(invoiceIds, { onSuccess: setTickets })}
      >
        {ticketMutation.isPending ? 'Preparando…' : label}
      </button>
      {ticketMutation.isError && (
        <Alert variant="error">{getApiErrorMessage(ticketMutation.error)}</Alert>
      )}
      {tickets && (
        <PrintTicket onClose={() => setTickets(null)}>
          {/* Each receipt on its own page, so the printer cuts between them. */}
          {tickets.map((ticket, index) => (
            <div
              key={invoiceIds[index]}
              style={index < tickets.length - 1 ? { breakAfter: 'page' } : undefined}
            >
              <InvoiceTicket ticket={ticket} />
            </div>
          ))}
        </PrintTicket>
      )}
    </>
  );
}
