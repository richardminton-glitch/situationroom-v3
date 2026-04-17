// ─── TXID Pathing — Service Worker ──────────────────────────────────────────
// Strategy:
//   App shell (HTML/CSS/JS)   → network-first (so deploys land on reload,
//                                cache is the offline fallback)
//   Static assets (icon etc.) → cache-first
//   /api/* (mempool proxy)    → always pass through; the proxy route is
//                                already cached server-side with the right
//                                TTLs — any client-side caching would pin
//                                stale tip/mempool/fee data.
//   Cross-origin (fonts, d3)  → pass through; browser HTTP cache handles it
//
// Version history
//   v1: original blueprint PWA (mempool.space direct)
//   v2: themed port — routes through /api/mempool proxy, bypasses /api/*
//       client-side, network-first HTML so theme changes land on reload

// v3: swap chrome borders from clinical --c-fg to warm --c-rule (parchment)
//     and soften node-border / link strokes to 0.72–0.78 alpha
const CACHE = 'txid-path-v3';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon.svg'];

// ── Install: pre-cache the app shell ────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// ── Activate: remove stale caches ───────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  return self.clients.claim();
});

// ── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Cross-origin (fonts, d3 CDN) → let the browser handle it
  if (url.origin !== self.location.origin) return;

  // Same-origin API calls (e.g. /api/mempool/* proxy) must never be cached
  // by the SW — block data is cached server-side with the right TTLs, and
  // client-side caching would pin stale tip/mempool/fee data.
  if (url.pathname.startsWith('/api/')) return;

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
            caches.open(CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(c => c || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Cache-first for static assets (icon, manifest, anything else)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
