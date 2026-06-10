import { Link } from 'react-router-dom';
import type { ProductResponse } from '../services/products';
import { Button } from './Button';

interface ProductCardProps {
  product: ProductResponse;
  canDelete: boolean;
  onDelete: (product: ProductResponse) => void;
  isDeleting: boolean;
}

const currencyFormatter = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 2,
});

export function ProductCard({
  product,
  canDelete,
  onDelete,
  isDeleting,
}: ProductCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-gray-900">
            {product.description}
          </p>
          <p className="text-sm text-gray-500">Ref: {product.reference}</p>
        </div>
        <p className="shrink-0 text-base font-bold text-blue-600">
          {currencyFormatter.format(product.salePrice)}
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-sm text-gray-600">
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-400">Costo</dt>
          <dd>{currencyFormatter.format(product.cost)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-400">Departamento</dt>
          <dd className="truncate">{product.department}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-400">Grupo</dt>
          <dd className="truncate">{product.group}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-400">Línea</dt>
          <dd className="truncate">{product.line}</dd>
        </div>
      </dl>

      <div className="mt-4 flex gap-2">
        <Link to={`/products/${product.id}/edit`} className="flex-1">
          <Button variant="secondary" type="button">
            Editar
          </Button>
        </Link>
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
