import { useState } from 'react';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { CustomerCard } from '../components/CustomerCard';
import { Pagination } from '../components/Pagination';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { useCustomers, useDeleteCustomer } from '../hooks/useCustomers';
import { getApiErrorMessage } from '../lib/errors';
import type { CustomerResponse } from '../services/customers';

const PAGE_SIZE = 20;

export function CustomersListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [customerPendingDelete, setCustomerPendingDelete] =
    useState<CustomerResponse | null>(null);

  const customersQuery = useCustomers({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
  });
  const deleteMutation = useDeleteCustomer();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!customerPendingDelete) return;
    await deleteMutation.mutateAsync(customerPendingDelete.id);
    setCustomerPendingDelete(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
        Clientes
      </h1>

      <TextField
        label="Buscar"
        placeholder="Identificación, razón social o nombre"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
      />

      {deleteMutation.isError && (
        <Alert variant="error">{getApiErrorMessage(deleteMutation.error)}</Alert>
      )}

      {customersQuery.isPending && <Spinner label="Cargando clientes…" />}

      {customersQuery.isError && (
        <Alert variant="error">{getApiErrorMessage(customersQuery.error)}</Alert>
      )}

      {customersQuery.isSuccess && (
        <>
          {customersQuery.data.data.length === 0 ? (
            <Alert variant="info">No se encontraron clientes.</Alert>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {customersQuery.data.data.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  canDelete={isAdmin}
                  onDelete={setCustomerPendingDelete}
                  isDeleting={
                    deleteMutation.isPending &&
                    deleteMutation.variables === customer.id
                  }
                />
              ))}
            </div>
          )}

          <Pagination meta={customersQuery.data.meta} onPageChange={setPage} />
        </>
      )}

      {customerPendingDelete && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-ink">Eliminar cliente</h2>
            <p className="mt-2 text-sm text-steel">
              ¿Seguro que deseas eliminar a{' '}
              <span className="font-medium">
                {customerPendingDelete.companyName ||
                  [customerPendingDelete.firstName, customerPendingDelete.familyName]
                    .filter(Boolean)
                    .join(' ') ||
                  customerPendingDelete.identification}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setCustomerPendingDelete(null)}
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
