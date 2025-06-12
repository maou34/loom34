import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { measureWebVitals, setupImageLazyLoading, preloadCriticalResources, registerServiceWorker } from './lib/performance.ts'

// Initialize performance optimizations
preloadCriticalResources();
setupImageLazyLoading();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);

// Measure Web Vitals for performance monitoring
measureWebVitals();
