import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { DeleteResolutionDialog } from '../components/DeleteResolutionDialog';
import { Pagination } from '../components/Pagination';
import { Spinner } from '../components/Spinner';
import { useResolutions } from '../hooks/useResolutions';
import { getApiErrorMessage } from '../lib/errors';
import type { ResolutionResponse } from '../services/resolutions';

const PAGE_SIZE = 20;

const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  invoice: 'Factura electrónica',
  support_docs: 'Documento soporte',
};

export function ResolutionsListPage() {
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<ResolutionResponse | null>(null);
  const resolutionsQuery = useResolutions({ page, limit: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Resoluciones DIAN
        </h1>
        <Link to="/invoicing/resolutions/new">
          <Button className="sm:w-auto sm:px-6">+ Nueva</Button>
        </Link>
      </div>

      {resolutionsQuery.isPending && <Spinner label="Cargando…" />}

      {resolutionsQuery.isError && (
        <Alert variant="error">{getApiErrorMessage(resolutionsQuery.error)}</Alert>
      )}

      {resolutionsQuery.data && (
        <>
          {resolutionsQuery.data.data.length === 0 ? (
            <Alert variant="info">
              Todavía no hay resoluciones asociadas. Crea la primera para poder
              facturar electrónicamente.
            </Alert>
          ) : (
            <div className="overflow-x-auto rounded border border-line bg-paper">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="bg-canvas text-left text-xs font-medium uppercase tracking-wide text-fog">
                  <tr>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Prefijo</th>
                    <th className="px-4 py-3">Número</th>
                    <th className="px-4 py-3">Rango</th>
                    <th className="px-4 py-3">Vigencia</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {resolutionsQuery.data.data.map((resolution) => (
                    <tr key={resolution.id}>
                      <td className="px-4 py-3 font-medium text-ink">
                        {DOCUMENT_TYPE_LABEL[resolution.documentType] ??
                          resolution.documentType}
                      </td>
                      <td className="px-4 py-3">{resolution.prefix}</td>
                      <td className="px-4 py-3">{resolution.resolutionNumber}</td>
                      <td className="px-4 py-3">
                        {resolution.rangeStart}–{resolution.rangeEnd}
                      </td>
                      <td className="px-4 py-3">
                        {resolution.startDate} a {resolution.endDate}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setPendingDelete(resolution)}
                          className="text-sm font-medium text-rust hover:underline"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination meta={resolutionsQuery.data.meta} onPageChange={setPage} />
        </>
      )}

      {pendingDelete && (
        <DeleteResolutionDialog
          resolution={pendingDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
