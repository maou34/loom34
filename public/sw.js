const CACHE_NAME = 'loom-v1';
const urlsToCache = [
  '/',
  '/about',
  '/articles',
  '/events',
  '/gallery',
  '/partners',
  '/monsieur-ours',
  '/logo.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Laisse passer les requêtes vers le serveur d'upload directement (pas de cache)
  if (url.origin === 'http://localhost:8081' || url.host === 'localhost:8081') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Pour les autres requêtes, utilise le cache
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});