import { useState } from 'react';
import { Alert } from '../Alert';
import { InvoiceTicket } from './InvoiceTicket';
import { PrintTicket } from './PrintTicket';
import { useInvoiceTicket } from '../../hooks/useInvoices';
import { getApiErrorMessage } from '../../lib/errors';
import type { InvoiceTicket as InvoiceTicketData } from '../../services/invoices';

interface PrintInvoiceTicketButtonProps {
  invoiceId: string;
  className?: string;
  label?: string;
}

/** Fetches the invoice's receipt data and hands it to the browser's print dialog. */
export function PrintInvoiceTicketButton({
  invoiceId,
  className = 'font-medium text-ink hover:underline',
  label = 'Imprimir tirilla',
}: PrintInvoiceTicketButtonProps) {
  const ticketMutation = useInvoiceTicket();
  const [ticket, setTicket] = useState<InvoiceTicketData | null>(null);

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={ticketMutation.isPending}
        onClick={() => ticketMutation.mutate(invoiceId, { onSuccess: setTicket })}
      >
        {ticketMutation.isPending ? 'Preparando…' : label}
      </button>
      {ticketMutation.isError && (
        <Alert variant="error">{getApiErrorMessage(ticketMutation.error)}</Alert>
      )}
      {ticket && (
        <PrintTicket onClose={() => setTicket(null)}>
          <InvoiceTicket ticket={ticket} />
        </PrintTicket>
      )}
    </>
  );
}
