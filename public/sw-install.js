// Service Worker minimal (PROD) — uniquement pour satisfaire les critères
// d'installabilité PWA de Chrome (manifest + SW actif avec handler fetch).
// Ne fait AUCUN cache : évite les pages blanches / caches obsolètes
// rencontrés avec l'ancien sw.js en production.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
