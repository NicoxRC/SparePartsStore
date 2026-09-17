import { useContext } from 'react';
import { InvoiceDraftsContext, type InvoiceDraftsContextValue } from '../context/invoice-drafts-context';

export function useInvoiceDrafts(): InvoiceDraftsContextValue {
  const context = useContext(InvoiceDraftsContext);
  if (!context) {
    throw new Error('useInvoiceDrafts must be used within an InvoiceDraftsProvider');
  }
  return context;
}
