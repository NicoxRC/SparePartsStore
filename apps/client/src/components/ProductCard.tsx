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
    <div className="flex h-full flex-col rounded-xl border border-[#E4E8EF] bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[#1E2A4A]">
            {product.description}
          </p>
          <span className="mt-1 inline-block rounded border border-[#D8DCE6] bg-[#F7F6F4] px-1.5 py-0.5 font-mono text-xs text-[#3F4654]">
            {product.reference}
          </span>
        </div>
        <p className="shrink-0 text-base font-bold text-[#E8853A]">
          {currencyFormatter.format(product.salePrice)}
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-sm text-[#3F4654]">
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#8B92A3]">Costo</dt>
          <dd>{currencyFormatter.format(product.cost)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#8B92A3]">Departamento</dt>
          <dd className="truncate">{product.department}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#8B92A3]">Grupo</dt>
          <dd className="truncate">{product.group}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#8B92A3]">Línea</dt>
          <dd className="truncate">{product.line}</dd>
        </div>
      </dl>

      <div className="mt-4 flex gap-2 sm:mt-auto sm:pt-4">
        <Link to={`/products/${product.id}/edit`} className="flex-1">
          <Button variant="secondary" type="button" className="w-full">
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
