// ============================================
// GensetInvoice — Service Worker
// Strategi: cache app shell (HTML/CSS/JS statis) untuk buka instan,
// tapi data invoice (Supabase) selalu diambil fresh dari network —
// jangan sampai user lihat data invoice yang basi/ketinggalan.
// ============================================

const CACHE_NAME = 'genset-invoice-v2';

// File statis yang aman di-cache (tidak berubah tiap request)
const APP_SHELL = [
  './dashboard.html',
  './invoice-editor-functional.html',
  './invoice-preview.html',
  './invoice-history.html',
  './customers.html',
  './settings.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: simpan app shell ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: buang cache versi lama kalau ada update
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

// Fetch strategy:
// - Request ke Supabase (data) → selalu network, JANGAN di-cache (data harus selalu fresh)
// - Request ke file app shell → cache-first, biar buka instan walau sinyal lemah
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan intercept request ke Supabase — biarkan lewat langsung ke network
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Simpan hasil fetch baru ke cache untuk next time (khusus file app sendiri)
          if (event.request.method === 'GET' && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Offline dan tidak ada di cache — fallback ke dashboard sebagai halaman aman
          if (event.request.mode === 'navigate') {
            return caches.match('./dashboard.html');
          }
        });
    })
  );
});
