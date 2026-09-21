import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TICKET_FONT } from '../../lib/ticketFormat';

interface PrintTicketProps {
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Renders `children` into a portal at document.body (a sibling of #root,
 * not inside it), invisible on screen and shown only under `@media print`
 * — see the `.print-ticket` rule in index.css. Triggers the browser's
 * print dialog on mount and unmounts itself once it closes, so this is a
 * one-shot "print this ticket" action, not a persistent view. Works with
 * a real receipt printer configured as the default print device the same
 * way it works with "print to PDF" — the browser doesn't distinguish.
 */
export function PrintTicket({ onClose, children }: PrintTicketProps) {
  useEffect(() => {
    const handleAfterPrint = () => onClose();
    window.addEventListener('afterprint', handleAfterPrint);
    // Let the ticket paint before invoking the browser's print dialog.
    const timeout = setTimeout(() => window.print(), 50);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      clearTimeout(timeout);
    };
    // Deliberately mount-only — printing again if `onClose`'s identity
    // happened to change would reopen the print dialog unprompted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="print-ticket text-black" style={{ fontFamily: TICKET_FONT }}>
      {children}
    </div>,
    document.body,
  );
}
