import { createContext } from 'react';
import type { InvoiceDraft } from '../lib/invoiceDraft';

export interface InvoiceDraftsContextValue {
  drafts: InvoiceDraft[];
  activeDraftId: string;
  setActiveDraftId: (id: string) => void;
  addDraft: () => void;
  closeDraft: (id: string) => void;
  updateDraft: (id: string, patch: Partial<Omit<InvoiceDraft, 'id'>>) => void;
}

export const InvoiceDraftsContext = createContext<InvoiceDraftsContextValue | undefined>(
  undefined,
);
