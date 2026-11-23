import type { LineBreakdown } from '../lib/invoiceMath';

interface TotalsSummaryProps extends LineBreakdown {
  /** Total before the whole-sale discount, shown struck through when there is one. */
  undiscountedTotal?: number;
  /**
   * A quotation's abonos. When above 0 they're shown under the total with
   * what's left — informative only: the total (and any invoice) stays whole.
   */
  paidAmount?: number;
}

const money = (amount: number) => `$${amount.toLocaleString('es-CO')}`;

/** Subtotal / IVA / Total of a sale, quotation or note — the prices already include IVA; it is shown broken out of them. */
export function TotalsSummary({
  subtotal,
  tax,
  total,
  exempt,
  undiscountedTotal,
  paidAmount = 0,
}: TotalsSummaryProps) {
  return (
    <dl className="ml-auto flex w-full max-w-xs flex-col gap-1 font-mono text-sm text-steel">
      {Boolean(exempt) && (
        <div className="flex justify-between gap-4">
          <dt>Exentos</dt>
          <dd>{money(exempt)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-4">
        <dt>Subtotal</dt>
        <dd>{money(subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>IVA</dt>
        <dd>{money(tax)}</dd>
      </div>
      <div className="total-rule flex items-baseline justify-between gap-4 px-1 pb-1 text-lg font-semibold text-ink">
        <dt>Total</dt>
        <dd className="flex items-baseline gap-2">
          {undiscountedTotal !== undefined && undiscountedTotal !== total && (
            <span className="text-sm font-normal text-fog line-through">
              {money(undiscountedTotal)}
            </span>
          )}
          {money(total)}
        </dd>
      </div>
      {paidAmount > 0 && (
        <>
          <div className="flex justify-between gap-4 px-1">
            <dt>Abonos</dt>
            <dd className="text-ok">−{money(paidAmount)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-1 font-semibold text-ink">
            <dt>Saldo</dt>
            <dd>{money(total - paidAmount)}</dd>
          </div>
        </>
      )}
    </dl>
  );
}
