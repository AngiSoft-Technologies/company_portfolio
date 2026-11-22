const CACHE = 'angisoft-v3';
const APP_SHELL = ['/', '/index.html', '/favicon.ico', '/site.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept cross-origin requests (CDN images/video, fonts, APIs on
  // other hosts) — the browser handles those natively and SW fetch() of
  // no-cors/cross-origin resources rejects with NetworkError.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/v1') || url.pathname.startsWith('/socket.io')) return;

  // Range requests (audio/video seeking) must pass straight through —
  // caching partial 206 responses corrupts the cache entry.
  if (request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/index.html'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          // Only cache complete successful responses — never opaque,
          // partial (206) or error responses.
          if (res.ok && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
