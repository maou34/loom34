const CACHE_NAME = 'loom-v2';

// On ne cache PAS /about /events etc. (routes SPA)
// On cache uniquement des fichiers "stables".
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne gérer que ton domaine (évite effets de bord)
  if (url.origin !== self.location.origin) return;

  // Ne pas intercepter les assets Vite (chunks hashés)
  if (url.pathname.startsWith('/assets/')) return;

  // Ne pas intercepter les scripts/styles (imports dynamiques, etc.)
  if (request.destination === 'script' || request.destination === 'style') return;

  // Requêtes vers l'API d'upload: pas de cache (et en prod ce n'est pas localhost)
  // (tu peux ajuster plus tard pour upload.loom-lgbt.fr)
  if (url.host === 'upload.loom-lgbt.fr') {
    event.respondWith(fetch(request));
    return;
  }

  // Pour la navigation (routes SPA), network-first puis fallback sur index en cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Pour le reste: cache-first puis network
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});