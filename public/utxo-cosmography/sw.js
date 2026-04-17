// UTXO Cosmography — Service Worker
//
// Strategy:
//   - index.html     → network-first (so deploys land immediately,
//                      cached copy is the offline fallback)
//   - static assets  → cache-first (icon, manifest — rarely change)
//   - external APIs  → pass-through (mempool.space etc.)
//
// CACHE_NAME bumps on each meaningful change so the activate handler
// evicts old caches and clients pick up the new shell.
//   v1: original release
//   v2: dark-mode + theme-aware vars + hidden burger + warm-tan rules
//       + scope-relative shell paths
//   v3: iframe-side self-sync of parent theme (data-theme propagated
//       in <head> before first paint via parent.document access)
//   v4: legend SVGs → currentColor, remaining inline hex → var()
//   v5: bypass /api/* (mempool proxy) so cache-first logic doesn't
//       freeze live chain data client-side
//   v6: floating canvas insets (fee oracle, mempool, hash rate) read
//       --c-overlay-bg so they darken with the rest of the page
//   v7: soften --c-ink-whale + --c-ink-grid (parchment) from clinical
//       near-black to warm deep brown so ink-on-parchment reads warm

const CACHE_NAME = 'utxo-cosmos-v7';

// Scope-relative paths — the SW lives at /utxo-cosmography/sw.js so its
// scope is /utxo-cosmography/ and these resolve correctly inside it.
// (The previous absolute paths /index.html etc. were caching the wrong
// resources from the parent app root.)
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

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

// ---- FETCH ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // External requests (mempool.space API etc.) go straight to network —
  // the app already has its own offline fallback for those.
  if (url.origin !== self.location.origin) return;

  // Same-origin API calls (e.g. /api/mempool/* proxy) must never be
  // cached by the SW — block data is cached server-side with the right
  // TTLs, and client-side caching would pin stale tip/mempool/fee data.
  if (url.pathname.startsWith('/api/')) return;

  // Only handle GETs.
  if (event.request.method !== 'GET') return;

  const isHtml = event.request.mode === 'navigate'
    || event.request.destination === 'document'
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('/index.html');

  if (isHtml) {
    // Network-first for the HTML shell so theme/CSS updates land on the
    // first reload after a deploy. Falls back to cache when offline.
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(c => c || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Cache-first for static assets (icon, manifest, anything else).
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
