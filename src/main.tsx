import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import './styles/globals.css'
import { measureWebVitals, setupImageLazyLoading, preloadCriticalResources, registerServiceWorker } from './lib/performance.ts'

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
