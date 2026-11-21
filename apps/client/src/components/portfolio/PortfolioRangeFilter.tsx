interface PortfolioRangeFilterProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}

const inputClass =
  'min-h-12 w-full border border-line-2 bg-paper px-3 py-2.5 font-mono text-base text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/30 sm:min-h-11 sm:text-sm';

/**
 * "Desde / Hasta" on the day each quotation was made. Both optional: blank
 * means every date. Each input caps the other so the range can't invert.
 */
export function PortfolioRangeFilter({ from, to, onChange }: PortfolioRangeFilterProps) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-steel">
        Cotizaciones hechas entre
      </legend>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-36 flex-1 flex-col gap-1 text-xs text-fog sm:flex-none">
          Desde
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => onChange({ from: e.target.value, to })}
            className={inputClass}
          />
        </label>
        <label className="flex min-w-36 flex-1 flex-col gap-1 text-xs text-fog sm:flex-none">
          Hasta
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => onChange({ from, to: e.target.value })}
            className={inputClass}
          />
        </label>
        {(from || to) && (
          <button
            type="button"
            onClick={() => onChange({ from: '', to: '' })}
            className="min-h-12 px-3 text-sm font-medium text-steel underline underline-offset-4 hover:text-ink sm:min-h-11"
          >
            Todas las fechas
          </button>
        )}
      </div>
    </fieldset>
  );
}
