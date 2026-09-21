import type { LineBreakdown } from '../lib/invoiceMath';

interface TotalsSummaryProps extends LineBreakdown {
  /** Total before the whole-sale discount, shown struck through when there is one. */
  undiscountedTotal?: number;
}

const money = (amount: number) => `$${amount.toLocaleString('es-CO')}`;

/** Subtotal / IVA / Total of a sale, quotation or note — the IVA is added on top of the prices. */
export function TotalsSummary({ subtotal, tax, total, undiscountedTotal }: TotalsSummaryProps) {
  return (
    <dl className="ml-auto flex w-full max-w-xs flex-col gap-1 font-mono text-sm text-steel">
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
    </dl>
  );
}
