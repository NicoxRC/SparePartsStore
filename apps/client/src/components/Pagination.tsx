import type { PaginationMeta } from '../services/products';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const { page, totalPages, total } = meta;

  if (totalPages <= 1) {
    return (
      <p className="py-2 text-center text-xs text-gray-400">
        {total} {total === 1 ? 'resultado' : 'resultados'}
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="min-h-11 min-w-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40"
      >
        Anterior
      </button>
      <p className="text-sm text-gray-500">
        Página {page} de {totalPages} · {total} resultados
      </p>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="min-h-11 min-w-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  );
}
