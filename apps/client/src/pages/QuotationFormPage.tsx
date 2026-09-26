import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Spinner } from '../components/Spinner';
import { InvoiceDraftsProvider } from '../context/InvoiceDraftsContext';
import { useTodayCashRegister } from '../hooks/useCashRegister';
import { useInvoiceDrafts } from '../hooks/useInvoiceDrafts';
import { getApiErrorMessage } from '../lib/errors';
import { InvoiceDraftForm } from './InvoiceFormPage';

/**
 * "Nueva cotización" from Cotizaciones: the same products → customer →
 * Cotizar form as Venta, without the invoice step, kept in its own draft
 * (separate storage key) so it never mixes with Venta's open tabs.
 */
export function QuotationFormPage() {
  return (
    <InvoiceDraftsProvider storageKey="casarespuestos.quotationDraft">
      <QuotationDraft />
    </InvoiceDraftsProvider>
  );
}

function QuotationDraft() {
  const cashRegisterQuery = useTodayCashRegister();
  const { drafts, activeDraftId } = useInvoiceDrafts();
  const draft = drafts.find((candidate) => candidate.id === activeDraftId) ?? drafts[0];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Nueva cotización
        </h1>
        <Link to="/cotizaciones" className="text-sm font-medium text-ink hover:underline">
          Volver a Cotizaciones
        </Link>
      </div>

      {cashRegisterQuery.isPending && <Spinner label="Cargando…" />}
      {cashRegisterQuery.isError && (
        <Alert variant="error">
          No se pudo verificar el estado de la caja: {getApiErrorMessage(cashRegisterQuery.error)}
        </Alert>
      )}
      {cashRegisterQuery.data && !cashRegisterQuery.data.isOpen && (
        // Stock leaves the store like a sale, so the API needs an open register.
        <Alert variant="info">
          La caja de hoy no está abierta. Ábrela en <Link to="/ventas" className="underline">Venta</Link>{' '}
          para poder cotizar.
        </Alert>
      )}

      {cashRegisterQuery.data?.isOpen && (
        <div className="rounded border border-line bg-paper p-4 sm:p-6">
          <InvoiceDraftForm key={draft.id} draft={draft} mode="quotation" />
        </div>
      )}
    </div>
  );
}
