// UTXO Cosmography — Service Worker
// Strategy: cache-first for the app shell; pass-through for external API calls.
// Update CACHE_NAME when deploying a new version of index.html.

const CACHE_NAME = 'utxo-cosmos-v1';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon.svg'];

// ---- INSTALL: pre-cache the app shell ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// ---- ACTIVATE: clean up old caches ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  return self.clients.claim();
});

// ---- FETCH: cache-first for same-origin; network-only for API ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Let external requests (mempool.space API) go straight to network.
  // The app already has an offline fallback for those.
  if (url.origin !== self.location.origin) return;

  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
