// Service Worker untuk Progressive Web App (PWA) Dapur Mama RaraLita
// Versi diperbarui untuk mendukung Auto-Update instan tanpa perlu bersihkan riwayat browser
const CACHE_NAME = 'mamararalita-pwa-v3';

// Aset inti yang di-precache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png'
];

// 1. Event Install: Pre-cache aset utama dan langsung aktifkan (skipWaiting)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('PWA Precache warning:', err);
      });
    })
  );
});

// 2. Event Activate: Bersihkan semua cache lama dan segera kendalikan semua tab (clients.claim)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('Menghapus cache PWA lama:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Listener pesan: Izinkan aplikasi meminta skipWaiting secara manual jika ada versi baru
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

// 4. Event Fetch:
// - Navigasi / index.html: SELALU Network-First dengan cache: 'no-cache'
//   agar jika ada perubahan kode/tampilan, browser langsung mengambil file HTML terbaru
//   yang merujuk ke file JS bundle baru (Vite hash) tanpa tertahan cache lama.
// - Offline: jika internet mati, kembalikan dari cache.
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Hanya tangani GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Abaikan request API eksternal (Supabase, Google Fonts eksternal, dll.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // A. STRATEGI NAVIGASI (Halaman HTML / SPA Route) -> NETWORK FIRST
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Jika offline, sajikan index.html dari cache
          const cachedPage = await caches.match('/index.html');
          return cachedPage || caches.match('/');
        })
    );
    return;
  }

  // B. STRATEGI UNTUK MANIFEST & SW: Selalu Network First
  if (url.pathname === '/manifest.json' || url.pathname === '/sw.js') {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .catch(() => caches.match(request))
    );
    return;
  }

  // C. STRATEGI UNTUK ASET STATIS (CSS, JS, Ikon, Gambar): Stale-While-Revalidate
  // File JS/CSS Vite memiliki content hash unik di nama filenya (contoh: index-a1b2c3d4.js).
  // Dengan Stale-While-Revalidate, aplikasi cepat terbuka, namun update terbaru tetap di-download di latar belakang.
  const isStaticAsset =
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|gif|css|js|woff|woff2|json)$/i) ||
    url.pathname.startsWith('/assets/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone).catch(() => {});
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // D. Default: Network First
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
