import { useEffect, useState } from 'react';

/**
 * TEMPORARY — a dev-only comparison tool, not a feature. Lets the human
 * toggle between the shipped "Talonario reencarnado" direction and three
 * quick alternates (see the `[data-theme]` blocks in index.css) while
 * clicking around the real, running app, since no image generation was
 * available to produce comps. Rendered only in `import.meta.env.DEV` —
 * never ships in a production build. Delete this file and its index.css
 * blocks once a direction is confirmed.
 */
const OPTIONS = [
  { value: '', label: 'Talonario (elegido)' },
  { value: 'talonario-suave', label: 'Talonario, más suave' },
  { value: 'tablero', label: 'Tablero de vuelos' },
  { value: 'despiece', label: 'Diagrama de despiece (extremo)' },
] as const;

export function ThemePreviewSwitcher() {
  const [theme, setTheme] = useState('');

  useEffect(() => {
    if (theme) {
      document.documentElement.dataset.theme = theme;
    } else {
      delete document.documentElement.dataset.theme;
    }
  }, [theme]);

  return (
    <div className="fixed bottom-2 left-2 z-[100] flex flex-col gap-1 rounded border border-black/20 bg-black/80 p-2 text-xs text-white shadow-lg backdrop-blur">
      <span className="px-1 font-semibold uppercase tracking-wide text-white/60">
        Comparar dirección visual
      </span>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setTheme(option.value)}
          className={`rounded-sm px-2 py-1 text-left hover:bg-white/10 ${
            theme === option.value ? 'bg-white/20 font-medium' : ''
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
