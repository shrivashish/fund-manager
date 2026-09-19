/* Fund Manager service worker: makes the app load offline.
   All app data lives in localStorage, so the worker only caches the app files. */
const VERSION = 'fund-manager-v1';
const FONTS = 'fund-manager-fonts-v1';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from cache right away, refresh the cache in the background.
function staleWhileRevalidate(request, cacheName, fallbackKey) {
  return caches.open(cacheName).then((cache) =>
    cache.match(fallbackKey || request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && (response.ok || response.type === 'opaque')) {
            cache.put(fallbackKey || request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Google Fonts (stylesheet and font files)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONTS));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Opening the app: always answer with the cached page so it starts offline.
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request, VERSION, new URL('index.html', self.registration.scope).href));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, VERSION));
});
