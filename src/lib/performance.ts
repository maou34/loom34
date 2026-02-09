// Performance monitoring utilities
export function measureWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Core Web Vitals
  import('web-vitals').then(webVitals => {
    webVitals.onCLS(console.log);
    webVitals.onFCP(console.log);
    webVitals.onLCP(console.log);
    webVitals.onTTFB(console.log);
  }).catch(() => {
    // Gracefully handle if web-vitals is not available
  });
}

// Lazy load images when they come into viewport
export function setupImageLazyLoading(): void {
  if (typeof window === 'undefined') return;

  const images = document.querySelectorAll('img[data-lazy]');
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.getAttribute('data-lazy');
          if (src) {
            img.src = src;
            img.removeAttribute('data-lazy');
            observer.unobserve(img);
          }
        }
      });
    });

    images.forEach(img => observer.observe(img));
  } else {
    // Fallback for browsers without IntersectionObserver
    images.forEach(img => {
      const src = img.getAttribute('data-lazy');
      if (src) {
        (img as HTMLImageElement).src = src;
        img.removeAttribute('data-lazy');
      }
    });
  }
}

// Preload critical resources
export function preloadCriticalResources(): void {
  if (typeof window === 'undefined') return;

  const criticalResources = [
    '/gallery/loom_logo_round.png', // Logo
  ];

  criticalResources.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    document.head.appendChild(link);
  });
}

// Service Worker registration for PWA capabilities
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
