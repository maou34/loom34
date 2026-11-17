// LOOM – gestion du thème jour / nuit
// -----------------------------------------------------------------------------
// - Premier passage : on suit le réglage de l'appareil (prefers-color-scheme).
// - Clic sur le bouton soleil / lune : le choix est mémorisé dans localStorage.
// - Si le réglage de l'appareil change (ex. passage auto en nuit le soir) et
//   que le visiteur n'a rien choisi, le site suit.
// - L'admin n'a pas (encore) de mode nuit : AdminLayout appelle lockTheme('light')
//   tant qu'il est affiché, sans toucher au choix mémorisé du visiteur.

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'loom-theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');
let locked: Theme | null = null;

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null; // navigation privée, stockage bloqué…
  }
}

function systemTheme(): Theme {
  return media.matches ? 'dark' : 'light';
}

export function getTheme(): Theme {
  return readStoredTheme() ?? systemTheme();
}

function apply(theme: Theme, animate = false): void {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 300);
  }
  root.dataset.theme = theme;
  // Couleur de la barre du navigateur sur mobile
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#17110B' : '#FBF8F2');
  window.dispatchEvent(new CustomEvent<Theme>('loom-theme-change', { detail: theme }));
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* le choix ne sera pas mémorisé, mais s'applique quand même */
  }
  if (!locked) apply(theme, true);
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/** Impose un thème (ex. l'admin, toujours en jour) sans modifier le choix mémorisé. */
export function lockTheme(theme: Theme): void {
  locked = theme;
  apply(theme);
}

/** Lève le verrou et revient au thème du visiteur. */
export function unlockTheme(): void {
  locked = null;
  apply(getTheme());
}

/** À appeler une fois au démarrage (src/main.tsx). */
export function initTheme(): void {
  // Chargement direct d'une page admin : jour d'emblée (AdminLayout prend le
  // relais), pour ne pas passer en nuit pendant le chargement de la session.
  const path = window.location.pathname;
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) locked = 'light';
  apply(locked ?? getTheme());
  media.addEventListener('change', () => {
    if (!locked && !readStoredTheme()) apply(systemTheme(), true);
  });
}
