import { useEffect, useState } from 'react';
import { Alert } from '../components/Alert';
import { Pagination } from '../components/Pagination';
import { PurchaseImportRow } from '../components/purchase-imports/PurchaseImportRow';
import { SupplierHeading } from '../components/purchase-imports/SupplierHeading';
import { UploadPurchaseImportButton } from '../components/purchase-imports/UploadPurchaseImportButton';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { usePurchaseImports } from '../hooks/usePurchaseImports';
import { getApiErrorMessage } from '../lib/errors';
import { groupBySupplier } from '../lib/purchaseImports';
import type { PurchaseImportStatus } from '../services/purchaseImports';

const PAGE_SIZE = 20;

const FILTERS: Array<{ label: string; value: PurchaseImportStatus | undefined }> = [
  { label: 'Borradores', value: 'draft' },
  { label: 'Confirmadas', value: 'confirmed' },
  { label: 'Descartadas', value: 'discarded' },
  { label: 'Todas', value: undefined },
];

export function PurchaseImportsListPage() {
  const { user } = useAuth();
  const { has } = usePermissions();
  const isAdmin = user?.role === 'admin';

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PurchaseImportStatus | undefined>('draft');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const importsQuery = usePurchaseImports({
    page,
    limit: PAGE_SIZE,
    status,
    search: debouncedSearch || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Compras</h1>

      {has('purchase_imports.create') && <UploadPurchaseImportButton />}

      <TextField
        label="Buscar por número de factura o proveedor"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = filter.value === status;
          return (
            <button
              key={filter.label}
              type="button"
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
              className={`min-h-10 rounded-full border px-3.5 py-1.5 text-sm ${
                isActive
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-paper text-steel hover:bg-mist'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {importsQuery.isPending && <Spinner label="Cargando…" />}

      {importsQuery.isError && (
        <Alert variant="error">{getApiErrorMessage(importsQuery.error)}</Alert>
      )}

      {importsQuery.data && (
        <>
          {importsQuery.data.data.length === 0 ? (
            <Alert variant="info">No hay compras para este filtro.</Alert>
          ) : status === 'draft' ? (
            <div className="flex flex-col gap-5">
              {groupBySupplier(importsQuery.data.data).map((group) => (
                <section key={group.supplier.id} className="flex flex-col gap-2">
                  <SupplierHeading supplier={group.supplier} canRename={isAdmin} />
                  <div className="divide-y divide-line rounded border border-line bg-paper">
                    {group.imports.map((purchaseImport) => (
                      <PurchaseImportRow
                        key={purchaseImport.id}
                        purchaseImport={purchaseImport}
                        showSupplier={false}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-line rounded border border-line bg-paper">
              {importsQuery.data.data.map((purchaseImport) => (
                <PurchaseImportRow
                  key={purchaseImport.id}
                  purchaseImport={purchaseImport}
                  showSupplier
                />
              ))}
            </div>
          )}

          <Pagination meta={importsQuery.data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
