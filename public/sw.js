// Service Worker LOOM (SPA-safe) + logs en dev
// - Logs activés si: localhost OU ?swlog=1
// - Ne precache PAS "/" ni "/index.html"
// - Navigations: network-first + fallback index runtime mis à jour à chaque succès réseau
// - N'intercepte pas /assets (chunks Vite hashés)

const VERSION = "v4";
const PRECACHE_NAME = `loom-precache-${VERSION}`;
const RUNTIME_NAME = `loom-runtime-${VERSION}`;

// Logs activés sur localhost ou si ?swlog=1
const SW_LOG_DEFAULT =
  self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

function shouldLogFromUrl(url) {
  try {
    return url.searchParams.has("swlog");
  } catch {
    return false;
  }
}

function log(...args) {
  // NOTE: on log uniquement quand on sait que c'est utile (voir fetch handler)
  console.log("[sw]", ...args);
}

const PRECACHE_URLS = ["/logo.png", "/manifest.json", "/loom_logo_round.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
      if (SW_LOG_DEFAULT) log("installed", { VERSION, PRECACHE_NAME, RUNTIME_NAME });
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== PRECACHE_NAME && key !== RUNTIME_NAME) return caches.delete(key);
          return null;
        })
      );
      await self.clients.claim();
      if (SW_LOG_DEFAULT) log("activated", { VERSION });
    })()
  );
});

async function updateRuntimeIndexFromResponse(response, doLog) {
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("text/html")) return;

  const cache = await caches.open(RUNTIME_NAME);
  await cache.put("/index.html", response.clone());
  if (doLog) log("runtime index updated from network response");
}

async function networkFirstNavigation(request, doLog) {
  try {
    const response = await fetch(request);
    await updateRuntimeIndexFromResponse(response, doLog);
    if (doLog) log("navigate: network", request.url, response.status);
    return response;
  } catch (err) {
    const cache = await caches.open(RUNTIME_NAME);
    const cachedIndex = await cache.match("/index.html");
    if (cachedIndex) {
      if (doLog) log("navigate: fallback cached /index.html (offline/error)", request.url, String(err));
      return cachedIndex;
    }
    if (doLog) log("navigate: offline and no cached index", request.url, String(err));
    return new Response("Offline", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne gérer que le même origin
  if (url.origin !== self.location.origin) return;

  // Ne pas intercepter les chunks Vite hashés
  if (url.pathname.startsWith("/assets/")) return;

  // Ne pas intercepter scripts/styles
  if (request.destination === "script" || request.destination === "style") return;

  // Determine logging for this request
  const doLog = SW_LOG_DEFAULT || shouldLogFromUrl(url);

  // Navigation SPA
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request, doLog));
    return;
  }

  // Autres GET: cache-first runtime
  if (request.method === "GET") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_NAME);
        const cached = await cache.match(request);
        if (cached) {
          if (doLog) log("cache hit", request.url);
          return cached;
        }

        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
          if (doLog) log("cache put", request.url);
        } else {
          if (doLog) log("network non-ok", request.url, response.status);
        }
        return response;
      })()
    );
  }
});