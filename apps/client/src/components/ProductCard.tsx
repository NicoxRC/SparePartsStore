import { Link } from 'react-router-dom';
import type { ProductResponse } from '../services/products';
import { Button } from './Button';

interface ProductCardProps {
  product: ProductResponse;
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (product: ProductResponse) => void;
  isDeleting: boolean;
}

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function ProductCard({
  product,
  canEdit,
  canDelete,
  onDelete,
  isDeleting,
}: ProductCardProps) {
  return (
    <div className="flex h-full flex-col rounded border border-line bg-white p-4 transition-colors hover:border-fog">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">
            {product.description}
          </p>
          <span className="mt-1 inline-block rounded border border-line bg-canvas px-1.5 py-0.5 font-mono text-xs text-steel">
            {product.reference}
          </span>
        </div>
        <p className="shrink-0 font-mono text-base font-bold text-signal">
          {currencyFormatter.format(product.salePrice)}
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-sm text-steel">
        <div>
          <dt className="text-xs uppercase tracking-wide text-fog">Costo</dt>
          <dd className="font-mono">{currencyFormatter.format(product.cost)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-fog">Stock</dt>
          <dd className="font-mono">{product.stock}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-fog">Departamento</dt>
          <dd className="truncate">{product.department.name}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-fog">Grupo</dt>
          <dd className="truncate">{product.group.name}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-fog">Marca</dt>
          <dd className="truncate">{product.brand.name}</dd>
        </div>
      </dl>

      <div className="mt-4 flex gap-2 sm:mt-auto sm:pt-4">
        {canEdit && (
          <Link to={`/products/${product.id}/edit`} className="flex-1">
            <Button variant="secondary" type="button" className="w-full">
              Editar
            </Button>
          </Link>
        )}
        {canDelete && (
          <Button
            variant="danger"
            type="button"
            className="flex-1"
            isLoading={isDeleting}
            onClick={() => onDelete(product)}
          >
            Eliminar
          </Button>
        )}
      </div>
    </div>
  );
}
