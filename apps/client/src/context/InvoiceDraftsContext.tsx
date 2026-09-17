import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createEmptyInvoiceDraft, type InvoiceDraft } from '../lib/invoiceDraft';
import { InvoiceDraftsContext } from './invoice-drafts-context';

const STORAGE_KEY = 'casarespuestos.invoiceDrafts';

interface StoredState {
  drafts: InvoiceDraft[];
  activeDraftId: string;
}

function loadInitialState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredState>;
      if (parsed.drafts && parsed.drafts.length > 0 && parsed.activeDraftId) {
        return { drafts: parsed.drafts, activeDraftId: parsed.activeDraftId };
      }
    }
  } catch {
    // Corrupt/unavailable storage (private mode, quota) — fall through.
  }
  const draft = createEmptyInvoiceDraft();
  return { drafts: [draft], activeDraftId: draft.id };
}

/**
 * Keeps every in-progress invoice ("Nueva factura") alive across the whole
 * app session — more than one can be open at once (several customers at
 * the counter), and navigating away to Productos/Inventario/etc. and back
 * never loses one, since this provider sits above the router and never
 * unmounts on route changes. Also persisted to localStorage so an
 * accidental refresh doesn't lose them either.
 */
export function InvoiceDraftsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable — in-memory state still works for this session.
    }
  }, [state]);

  const setActiveDraftId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeDraftId: id }));
  }, []);

  const addDraft = useCallback(() => {
    const draft = createEmptyInvoiceDraft();
    setState((prev) => ({
      drafts: [...prev.drafts, draft],
      activeDraftId: draft.id,
    }));
  }, []);

  const closeDraft = useCallback((id: string) => {
    setState((prev) => {
      const remaining = prev.drafts.filter((draft) => draft.id !== id);
      if (remaining.length === 0) {
        const draft = createEmptyInvoiceDraft();
        return { drafts: [draft], activeDraftId: draft.id };
      }
      const activeDraftId =
        prev.activeDraftId === id
          ? remaining[remaining.length - 1].id
          : prev.activeDraftId;
      return { drafts: remaining, activeDraftId };
    });
  }, []);

  const updateDraft = useCallback(
    (id: string, patch: Partial<Omit<InvoiceDraft, 'id'>>) => {
      setState((prev) => ({
        ...prev,
        drafts: prev.drafts.map((draft) =>
          draft.id === id ? { ...draft, ...patch } : draft,
        ),
      }));
    },
    [],
  );

  return (
    <InvoiceDraftsContext.Provider
      value={{
        drafts: state.drafts,
        activeDraftId: state.activeDraftId,
        setActiveDraftId,
        addDraft,
        closeDraft,
        updateDraft,
      }}
    >
      {children}
    </InvoiceDraftsContext.Provider>
  );
}
