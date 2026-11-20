import { useSearchParams } from 'react-router-dom';

/**
 * The cartera's date range lives in the URL (`?desde=&hasta=`), so it
 * survives going from the general view into a customer and back, and a
 * refresh. Blank means no bound.
 */
export function usePortfolioRange() {
  const [searchParams, setSearchParams] = useSearchParams();
  const from = searchParams.get('desde') ?? '';
  const to = searchParams.get('hasta') ?? '';

  const setRange = (range: { from: string; to: string }) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (range.from) next.set('desde', range.from);
        else next.delete('desde');
        if (range.to) next.set('hasta', range.to);
        else next.delete('hasta');
        return next;
      },
      { replace: true },
    );
  };

  return {
    from,
    to,
    setRange,
    /** For the API: only the bounds that are set. */
    apiRange: { from: from || undefined, to: to || undefined },
    /** To carry the range along on a link. */
    queryString: searchParams.toString() ? `?${searchParams.toString()}` : '',
  };
}
