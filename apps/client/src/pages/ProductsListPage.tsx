import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import { ProductCard } from '../components/ProductCard';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { useDeleteProduct, useProducts } from '../hooks/useProducts';
import { getApiErrorMessage } from '../lib/errors';
import type { ProductResponse, ProductsQuery } from '../services/products';

const PAGE_SIZE = 20;

export function ProductsListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [filters, setFilters] = useState<ProductsQuery>({
    page: 1,
    limit: PAGE_SIZE,
    search: '',
    department: '',
    group: '',
    line: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [productPendingDelete, setProductPendingDelete] =
    useState<ProductResponse | null>(null);

  const query: ProductsQuery = {
    page: filters.page,
    limit: filters.limit,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.department ? { department: filters.department } : {}),
    ...(filters.group ? { group: filters.group } : {}),
    ...(filters.line ? { line: filters.line } : {}),
  };

  const productsQuery = useProducts(query);
  const deleteMutation = useDeleteProduct();

  const updateFilter = (patch: Partial<ProductsQuery>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  };

  const handleDeleteRequest = (product: ProductResponse) => {
    setProductPendingDelete(product);
  };

  const confirmDelete = async () => {
    if (!productPendingDelete) return;
    await deleteMutation.mutateAsync(productPendingDelete.id);
    setProductPendingDelete(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-900">Productos</h1>
        <Link to="/products/new">
          <Button type="button">+ Nuevo</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <TextField
          label="Buscar"
          placeholder="Referencia o descripción"
          value={filters.search ?? ''}
          onChange={(e) => updateFilter({ search: e.target.value })}
        />

        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          className="self-start text-sm font-medium text-blue-600"
        >
          {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>

        {showFilters && (
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-3">
            <TextField
              label="Departamento"
              placeholder="Todos"
              value={filters.department ?? ''}
              onChange={(e) => updateFilter({ department: e.target.value })}
            />
            <TextField
              label="Grupo"
              placeholder="Todos"
              value={filters.group ?? ''}
              onChange={(e) => updateFilter({ group: e.target.value })}
            />
            <TextField
              label="Línea"
              placeholder="Todas"
              value={filters.line ?? ''}
              onChange={(e) => updateFilter({ line: e.target.value })}
            />
          </div>
        )}
      </div>

      {deleteMutation.isError && (
        <Alert variant="error">{getApiErrorMessage(deleteMutation.error)}</Alert>
      )}

      {productsQuery.isPending && <Spinner label="Cargando productos…" />}

      {productsQuery.isError && (
        <Alert variant="error">{getApiErrorMessage(productsQuery.error)}</Alert>
      )}

      {productsQuery.isSuccess && (
        <>
          {productsQuery.data.data.length === 0 ? (
            <Alert variant="info">No se encontraron productos.</Alert>
          ) : (
            <div className="flex flex-col gap-3">
              {productsQuery.data.data.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  canDelete={isAdmin}
                  onDelete={handleDeleteRequest}
                  isDeleting={
                    deleteMutation.isPending &&
                    deleteMutation.variables === product.id
                  }
                />
              ))}
            </div>
          )}

          <Pagination
            meta={productsQuery.data.meta}
            onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          />
        </>
      )}

      {productPendingDelete && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900">Eliminar producto</h2>
            <p className="mt-2 text-sm text-gray-600">
              ¿Seguro que deseas eliminar{' '}
              <span className="font-medium">{productPendingDelete.description}</span>?
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setProductPendingDelete(null)}
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
