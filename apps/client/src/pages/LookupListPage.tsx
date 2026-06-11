import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useDeleteLookup, useLookupList } from '../hooks/useLookups';
import { getApiErrorMessage } from '../lib/errors';
import type { LookupResource, LookupResponse } from '../services/lookups';

const PAGE_SIZE = 20;

interface LookupListPageProps {
  resource: LookupResource;
  title: string;
  newLabel: string;
  basePath: string;
  itemLabelSingular: string;
}

export function LookupListPage({
  resource,
  title,
  newLabel,
  basePath,
  itemLabelSingular,
}: LookupListPageProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [itemPendingDelete, setItemPendingDelete] = useState<LookupResponse | null>(null);

  const query = {
    page,
    limit: PAGE_SIZE,
    ...(search ? { search } : {}),
  };

  const listQuery = useLookupList(resource, query);
  const deleteMutation = useDeleteLookup(resource);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleDeleteRequest = (item: LookupResponse) => {
    setItemPendingDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemPendingDelete) return;
    await deleteMutation.mutateAsync(itemPendingDelete.id);
    setItemPendingDelete(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-[#1E2A4A] sm:text-2xl">
          {title}
        </h1>
        <Link to={`${basePath}/new`} className="shrink-0">
          <Button type="button">{newLabel}</Button>
        </Link>
      </div>

      <TextField
        label="Buscar"
        placeholder="Nombre"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
      />

      {deleteMutation.isError && (
        <Alert variant="error">{getApiErrorMessage(deleteMutation.error)}</Alert>
      )}

      {listQuery.isPending && <Spinner label="Cargando…" />}

      {listQuery.isError && (
        <Alert variant="error">{getApiErrorMessage(listQuery.error)}</Alert>
      )}

      {listQuery.isSuccess && (
        <>
          {listQuery.data.data.length === 0 ? (
            <Alert variant="info">No se encontraron resultados.</Alert>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listQuery.data.data.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-xl border border-[#E4E8EF] bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="truncate text-base font-semibold text-[#1E2A4A]">
                      {item.name}
                    </p>
                  </div>
                  <div className="mt-auto flex gap-2 pt-2">
                    <Link to={`${basePath}/${item.id}/edit`} className="flex-1">
                      <Button variant="secondary" type="button" className="w-full">
                        Editar
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      type="button"
                      className="flex-1"
                      isLoading={deleteMutation.isPending && deleteMutation.variables === item.id}
                      onClick={() => handleDeleteRequest(item)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination meta={listQuery.data.meta} onPageChange={setPage} />
        </>
      )}

      {itemPendingDelete && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-[#1E2A4A]">
              Eliminar {itemLabelSingular}
            </h2>
            <p className="mt-2 text-sm text-[#3F4654]">
              ¿Seguro que deseas eliminar{' '}
              <span className="font-medium">{itemPendingDelete.name}</span>? Esta acción
              no se puede deshacer.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setItemPendingDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                type="button"
                isLoading={deleteMutation.isPending}
                onClick={() => void confirmDelete()}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
