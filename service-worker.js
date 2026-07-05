// ============================================
// GensetInvoice — Service Worker
// Strategi: NETWORK-FIRST untuk halaman HTML — selalu coba ambil
// versi terbaru dari internet dulu, cache cuma jadi cadangan kalau
// offline. Ini mencegah bug "app terasa tidak update" walau sudah
// di-push ke GitHub.
// Untuk file statis (ikon), tetap cache-first karena isinya jarang ganti.
// ============================================

const CACHE_NAME = 'genset-invoice-v4';

const APP_SHELL = [
  './dashboard.html',
  './invoice-editor-functional.html',
  './invoice-preview.html',
  './invoice-history.html',
  './customers.html',
  './settings.html',
  './panduan.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.hostname.includes('supabase.co')) {
    return;
  }

  const isHTMLPage = event.request.mode === 'navigate' || url.pathname.endsWith('.html');

  if (isHTMLPage) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./dashboard.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (event.request.method === 'GET' && response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      });
    })
  );
});
