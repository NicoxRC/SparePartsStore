interface CashRegisterSwitcherProps {
  number: number;
  allowed: number[];
  onSelect: (number: number) => void;
}

/** Picks the till this device is working at. Renders nothing for someone
 * with a single till — there's nothing to choose. */
export function CashRegisterSwitcher({ number, allowed, onSelect }: CashRegisterSwitcherProps) {
  if (allowed.length < 2) return null;

  return (
    <div
      role="group"
      aria-label="Caja en la que trabajas"
      className="inline-flex overflow-hidden rounded-sm border border-line"
    >
      {allowed.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === number}
          onClick={() => onSelect(option)}
          className={`min-h-9 px-3 text-xs font-medium ${
            option === number ? 'bg-ink text-paper' : 'bg-paper text-steel hover:text-ink'
          }`}
        >
          Caja {option}
        </button>
      ))}
    </div>
  );
}
