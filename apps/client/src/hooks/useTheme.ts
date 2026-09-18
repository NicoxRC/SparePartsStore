import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

function readInitialTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Mirrors the inline pre-paint script in index.html — that script sets
 * the initial `data-theme` before React mounts (to avoid a flash of the
 * wrong theme); this hook takes over from there for the toggle. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.dataset.theme = 'dark';
    } else {
      delete document.documentElement.dataset.theme;
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
