import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Pagination } from '../components/Pagination';
import { Spinner } from '../components/Spinner';
import { useCreditNotes } from '../hooks/useCreditNotes';
import { getApiErrorMessage } from '../lib/errors';

const PAGE_SIZE = 20;

const DIAN_STATUS_STYLE: Record<string, string> = {
  DIAN_RECHAZADO: 'rounded-full bg-rust-tint px-2 py-0.5 text-rust-2',
};

export function CreditNotesListPage() {
  const [page, setPage] = useState(1);
  const creditNotesQuery = useCreditNotes({ page, limit: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Notas crédito
        </h1>
        <Link to="/invoicing/invoices" className="text-sm font-medium text-ink hover:underline">
          ← Volver a Facturas
        </Link>
      </div>

      {creditNotesQuery.isPending && <Spinner label="Cargando…" />}

      {creditNotesQuery.isError && (
        <Alert variant="error">{getApiErrorMessage(creditNotesQuery.error)}</Alert>
      )}

      {creditNotesQuery.data && (
        <>
          {creditNotesQuery.data.data.length === 0 ? (
            <Alert variant="info">Todavía no se ha emitido ninguna nota crédito.</Alert>
          ) : (
            <div className="divide-y divide-line border border-line bg-paper">
              {creditNotesQuery.data.data.map((note) => (
                <div
                  key={note.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">
                      <span className="font-mono font-medium">
                        {note.dataicoNumber ?? `${note.prefix}${note.number}`}
                      </span>
                      {' — aplica a '}
                      <span className="font-mono">{note.invoiceLabel}</span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {note.dianStatus === 'DIAN_ACEPTADO' && (
                        <span className="stamp">Aceptado DIAN</span>
                      )}
                      {note.dianStatus && note.dianStatus !== 'DIAN_ACEPTADO' && (
                        <span
                          className={`text-xs font-medium ${
                            DIAN_STATUS_STYLE[note.dianStatus] ??
                            'rounded-full bg-info-tint px-2 py-0.5 text-ink'
                          }`}
                        >
                          {note.dianStatus}
                        </span>
                      )}
                      {note.pdfUrl && (
                        <a
                          href={note.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-ink hover:underline"
                        >
                          Ver PDF
                        </a>
                      )}
                      <span className="text-xs text-fog">
                        {new Date(note.createdAt).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="shrink-0 font-mono text-base font-semibold text-ink">
                    ${note.totalAmount.toLocaleString('es-CO')}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Pagination meta={creditNotesQuery.data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
