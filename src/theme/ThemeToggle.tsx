// LOOM – bouton soleil / lune pour l'en-tête (desktop et mobile)
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getTheme, toggleTheme, type Theme } from './theme';

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  useEffect(() => {
    const onChange = (e: Event) => setThemeState((e as CustomEvent<Theme>).detail);
    window.addEventListener('loom-theme-change', onChange);
    return () => window.removeEventListener('loom-theme-change', onChange);
  }, []);

  const isDark = theme === 'dark';
  const label = isDark ? 'Passer en mode jour' : 'Passer en mode nuit';

  return (
    <button
      type="button"
      onClick={() => setThemeState(toggleTheme())}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-loom-header-border bg-loom-theme-toggle-bg text-loom-theme-toggle-fg transition-colors hover:border-loom-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-loom-header-bg"
    >
      {isDark ? <Sun aria-hidden="true" size={20} /> : <Moon aria-hidden="true" size={20} />}
    </button>
  );
}
