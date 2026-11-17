import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './theme/theme.css'
import './index.css'
import './styles/globals.css'
import { measureWebVitals, setupImageLazyLoading, preloadCriticalResources, registerServiceWorker } from './lib/performance.ts'

import { initTheme } from './theme/theme'

// Thème jour / nuit (avant le premier rendu)
initTheme();

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
