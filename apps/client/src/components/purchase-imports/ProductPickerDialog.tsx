import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { Spinner } from '../Spinner';
import { TextField } from '../TextField';
import { useProducts } from '../../hooks/useProducts';
import { getApiErrorMessage } from '../../lib/errors';
import type { ProductResponse } from '../../services/products';

interface ProductPickerDialogProps {
  title?: string;
  /** Pre-fills the search, e.g. with the reference printed on the invoice line. */
  initialSearch?: string;
  onPick: (product: ProductResponse) => void;
  onClose: () => void;
}

export function ProductPickerDialog({
  title = 'Elegir producto',
  initialSearch = '',
  onPick,
  onClose,
}: ProductPickerDialogProps) {
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const term = debouncedSearch.trim();
  const productsQuery = useProducts(
    { search: term || undefined, limit: 10 },
    { enabled: term.length > 0 },
  );

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 rounded bg-paper p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>

        <TextField
          label="Buscar por referencia o descripción"
          value={search}
          autoFocus
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="min-h-24 flex-1 overflow-y-auto rounded-sm border border-line bg-paper">
          {term.length === 0 && (
            <p className="px-4 py-3 text-sm text-fog">
              Escribe la referencia o la descripción del producto.
            </p>
          )}
          {term.length > 0 && productsQuery.isPending && <Spinner label="Buscando…" />}
          {productsQuery.isError && (
            <div className="p-3">
              <Alert variant="error">{getApiErrorMessage(productsQuery.error)}</Alert>
            </div>
          )}
          {productsQuery.isSuccess && productsQuery.data.data.length === 0 && (
            <p className="px-4 py-3 text-sm text-fog">Sin resultados.</p>
          )}
          {term.length > 0 &&
            productsQuery.data?.data.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onPick(product)}
                className="flex min-h-12 w-full flex-col items-start gap-0.5 border-b border-line px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-mist"
              >
                <span className="font-medium text-ink">
                  <span className="font-mono">{product.reference}</span> — {product.description}
                </span>
                <span className="text-xs text-fog">
                  ${product.salePrice.toLocaleString('es-CO')} · stock {product.stock}
                </span>
              </button>
            ))}
        </div>

        <Button type="button" variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>,
    document.body,
  );
}
