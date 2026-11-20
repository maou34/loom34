import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
// Police Figtree servie par le site (plus par Google Fonts : aucune adresse IP de visiteur transmise à Google)
import '@fontsource/figtree/latin-400.css'
import '@fontsource/figtree/latin-500.css'
import '@fontsource/figtree/latin-600.css'
import '@fontsource/figtree/latin-700.css'
import '@fontsource/figtree/latin-800.css'
import './theme/theme.css'
import './index.css'
import './styles/globals.css'
import { measureWebVitals, setupImageLazyLoading, preloadCriticalResources, registerServiceWorker } from './lib/performance.ts'

import { initTheme } from './theme/theme'

// Thème jour / nuit (avant le premier rendu)
initTheme();

// Après une mise en ligne, un onglet resté ouvert sur l'ancienne version ne
// trouve plus les fichiers de pages qu'il demande (leurs noms changent à chaque
// build) : on recharge une fois pour récupérer la nouvelle version, au lieu
// d'afficher une erreur. Garde-fou contre une boucle : une seule fois par minute.
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('loom-reloaded-at') || 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem('loom-reloaded-at', String(Date.now()));
  } catch {
    // stockage indisponible : on recharge quand même
  }
  event.preventDefault();
  window.location.reload();
});

// Initialize performance optimizations
preloadCriticalResources();
setupImageLazyLoading();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Measure Web Vitals for performance monitoring
measureWebVitals();
