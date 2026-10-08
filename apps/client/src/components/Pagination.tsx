import type { PaginationMeta } from '../services/products';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

/** First, last and the pages around the current one; `null` marks a skipped stretch. */
function pageItems(page: number, totalPages: number, siblings: number): Array<number | null> {
  const pages = [1, totalPages];
  for (let p = page - siblings; p <= page + siblings; p += 1) {
    if (p > 1 && p < totalPages) pages.push(p);
  }
  pages.sort((a, b) => a - b);

  const items: Array<number | null> = [];
  pages.forEach((p, index) => {
    const gap = index === 0 ? 0 : p - pages[index - 1];
    // A single skipped page is shown as itself rather than as "…".
    if (gap === 2) items.push(p - 1);
    else if (gap > 2) items.push(null);
    items.push(p);
  });
  return items;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const { page, totalPages, total } = meta;

  if (totalPages <= 1) {
    return (
      <p className="py-2 text-center font-mono text-xs text-fog">
        {total} {total === 1 ? 'resultado' : 'resultados'}
      </p>
    );
  }

  const renderPages = (siblings: number, className: string) => (
    <div className={`${className} flex-wrap items-center justify-center gap-1`}>
      {pageItems(page, totalPages, siblings).map((item, index) =>
        item === null ? (
          <span key={`gap-${index}`} className="px-1 font-mono text-sm text-fog">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-label={`Página ${item}`}
            aria-current={item === page ? 'page' : undefined}
            className={`min-h-11 min-w-10 border px-2 font-mono text-sm ${
              item === page
                ? 'border-ink bg-ink text-paper'
                : 'border-line bg-paper text-steel hover:bg-mist'
            }`}
          >
            {item}
          </button>
        ),
      )}
    </div>
  );

  return (
    <nav aria-label="Paginación" className="flex flex-col gap-1 py-2">
      {/* Fewer page numbers on a phone so they stay on one line. */}
      {renderPages(1, 'flex sm:hidden')}
      {renderPages(2, 'hidden sm:flex')}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="min-h-11 min-w-11 border border-line bg-paper px-4 py-2 text-sm font-medium text-steel hover:bg-mist disabled:opacity-40"
        >
          Anterior
        </button>
        <p className="text-center font-mono text-sm text-fog">
          Página {page} de {totalPages} · {total} resultados
        </p>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="min-h-11 min-w-11 border border-line bg-paper px-4 py-2 text-sm font-medium text-steel hover:bg-mist disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
