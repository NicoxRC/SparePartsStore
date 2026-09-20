import type { ImportCounters, LineFilter } from '../../lib/purchaseImports';

interface LineFilterChipsProps {
  value: LineFilter;
  counters: ImportCounters;
  totalLines: number;
  onChange: (filter: LineFilter) => void;
}

export function LineFilterChips({ value, counters, totalLines, onChange }: LineFilterChipsProps) {
  const chips: Array<{ filter: LineFilter; label: string; count: number }> = [
    { filter: 'all', label: 'Todas', count: totalLines },
    { filter: 'pending', label: 'Pendientes', count: counters.pendingLines },
    { filter: 'new', label: 'Nuevas', count: counters.newLines },
    { filter: 'existing', label: 'Existentes', count: counters.existingLines },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(({ filter, label, count }) => (
        <button
          key={filter}
          type="button"
          aria-pressed={value === filter}
          onClick={() => onChange(filter)}
          className={`min-h-10 rounded-full border px-3.5 py-1.5 text-sm ${
            value === filter
              ? 'border-ink bg-ink text-paper'
              : 'border-line bg-paper text-steel hover:bg-mist'
          }`}
        >
          {label} <span className="font-mono">{count}</span>
        </button>
      ))}
    </div>
  );
}
