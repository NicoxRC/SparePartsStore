import { useState } from 'react';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import { Spinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { useCreateMovement, useMovements } from '../hooks/useInventory';
import { useProducts } from '../hooks/useProducts';
import { getApiErrorMessage } from '../lib/errors';
import type { ProductResponse, ProductsQuery } from '../services/products';

const PAGE_SIZE = 20;

interface AdjustModalProps {
  product: ProductResponse;
  onClose: () => void;
}

function AdjustModal({ product, onClose }: AdjustModalProps) {
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const createMovement = useCreateMovement();

  const parsedQty = parseInt(quantity, 10);
  const isValidQty = !isNaN(parsedQty) && parsedQty !== 0;
  const newStock = isValidQty ? product.stock + parsedQty : product.stock;
  const stockWouldGoNegative = isValidQty && newStock < 0;

  const handleSubmit = async () => {
    if (!isValidQty || stockWouldGoNegative) return;
    try {
      await createMovement.mutateAsync({
        productId: product.id,
        quantity: parsedQty,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch {
      // Error shown via mutation.isError
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded bg-white p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">Ajustar stock</h2>
        <p className="mt-1 text-sm text-steel">
          <span className="font-mono font-medium">{product.reference}</span> — {product.description}
        </p>
        <p className="mt-0.5 text-sm text-fog">
          Stock actual: <span className="font-semibold text-ink">{product.stock}</span>
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qty" className="text-sm font-medium text-steel">
              Cantidad <span className="font-normal text-fog">(+ agregar / − restar)</span>
            </label>
            <input
              id="qty"
              type="number"
              inputMode="numeric"
              placeholder="Ej: 10 ó -3"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`min-h-12 w-full rounded-sm border px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/30 sm:min-h-11 sm:py-2.5 sm:text-sm ${
                stockWouldGoNegative ? 'border-rust' : 'border-line'
              }`}
            />
            {stockWouldGoNegative && (
              <p className="text-sm text-rust">
                Stock insuficiente. Stock actual: {product.stock}
              </p>
            )}
            {isValidQty && !stockWouldGoNegative && (
              <p className="text-sm text-fog">
                Nuevo stock:{' '}
                <span className="font-semibold text-ink">{newStock}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className="text-sm font-medium text-steel">
              Notas{' '}
              <span className="font-normal text-fog">(opcional)</span>
            </label>
            <textarea
              id="notes"
              rows={2}
              placeholder="Ej: Recibimos pedido del proveedor X"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              className="w-full resize-none rounded-sm border border-line px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/30"
            />
          </div>
        </div>

        {createMovement.isError && (
          <div className="mt-3">
            <Alert variant="error">
              {getApiErrorMessage(createMovement.error)}
            </Alert>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            isLoading={createMovement.isPending}
            disabled={!isValidQty || stockWouldGoNegative}
            className="flex-1"
          >
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InventoryPage() {
  const { user } = useAuth();
  const canAdjust = user?.role === 'admin' || user?.role === 'employee';

  const [filters, setFilters] = useState<ProductsQuery>({
    page: 1,
    limit: PAGE_SIZE,
    search: '',
  });
  const [adjustProduct, setAdjustProduct] = useState<ProductResponse | null>(null);
  const [showMovements, setShowMovements] = useState(false);

  const productsQuery = useProducts({
    page: filters.page,
    limit: filters.limit,
    ...(filters.search ? { search: filters.search } : {}),
  });

  const movementsQuery = useMovements({ limit: 30 });

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Inventario
        </h1>
        <button
          type="button"
          onClick={() => setShowMovements((p) => !p)}
          className="text-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
        >
          {showMovements ? 'Ver productos' : 'Ver movimientos'}
        </button>
      </div>

      {!showMovements && (
        <>
          <TextField
            label="Buscar producto"
            placeholder="Referencia o descripción"
            value={filters.search ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))
            }
          />

          {productsQuery.isPending && <Spinner label="Cargando productos…" />}
          {productsQuery.isError && (
            <Alert variant="error">{getApiErrorMessage(productsQuery.error)}</Alert>
          )}

          {productsQuery.isSuccess && (
            <>
              {productsQuery.data.data.length === 0 ? (
                <Alert variant="info">No se encontraron productos.</Alert>
              ) : (
                <div className="flex flex-col gap-2">
                  {productsQuery.data.data.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3 rounded border border-line bg-white px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-sm font-semibold text-ink">
                          {product.reference}
                        </p>
                        <p className="truncate text-sm text-steel">
                          {product.description}
                        </p>
                        <p className="mt-0.5 text-sm text-fog">
                          Stock:{' '}
                          <span
                            className={`font-semibold ${
                              product.stock === 0
                                ? 'text-rust'
                                : product.stock <= 5
                                  ? 'text-amber'
                                  : 'text-ok'
                            }`}
                          >
                            {product.stock}
                          </span>
                        </p>
                      </div>
                      {canAdjust && (
                        <button
                          type="button"
                          onClick={() => setAdjustProduct(product)}
                          className="shrink-0 rounded-sm border border-line bg-white px-3 py-2 text-sm font-medium text-steel hover:bg-canvas active:bg-line"
                        >
                          + Stock
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <Pagination
                meta={productsQuery.data.meta}
                onPageChange={(page) =>
                  setFilters((prev) => ({ ...prev, page }))
                }
              />
            </>
          )}
        </>
      )}

      {showMovements && (
        <>
          {movementsQuery.isPending && <Spinner label="Cargando movimientos…" />}
          {movementsQuery.isError && (
            <Alert variant="error">
              {getApiErrorMessage(movementsQuery.error)}
            </Alert>
          )}
          {movementsQuery.isSuccess && (
            <>
              {movementsQuery.data.data.length === 0 ? (
                <Alert variant="info">No hay movimientos registrados.</Alert>
              ) : (
                <div className="flex flex-col gap-2">
                  {movementsQuery.data.data.map((m) => (
                    <div
                      key={m.id}
                      className="rounded border border-line bg-white px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm font-semibold text-ink">
                            {m.productReference}
                          </p>
                          <p className="truncate text-sm text-steel">
                            {m.productDescription}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.movementType === 'purchase'
                              ? 'bg-ok-tint text-ok'
                              : m.movementType === 'initial'
                                ? 'bg-indigo-tint text-indigo'
                                : 'bg-amber-tint text-amber'
                          }`}
                        >
                          {m.movementType === 'purchase'
                            ? 'Compra'
                            : m.movementType === 'initial'
                              ? 'Inicial'
                              : 'Ajuste'}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-sm text-fog">
                        <span
                          className={`font-semibold ${m.quantity > 0 ? 'text-ok' : 'text-rust'}`}
                        >
                          {m.quantity > 0 ? '+' : ''}{m.quantity} uds
                        </span>
                        {m.notes && <span className="truncate">— {m.notes}</span>}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-fog">
                        <span>
                          {m.createdBy
                            ? `${m.createdBy.firstName} ${m.createdBy.lastName}`
                            : 'Sistema'}
                        </span>
                        <span>{formatDate(m.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {adjustProduct && (
        <AdjustModal
          product={adjustProduct}
          onClose={() => setAdjustProduct(null)}
        />
      )}
    </div>
  );
}
