import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Registrasi Service Worker PWA dengan Auto-Update Instan
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // 1. Cek pembaruan segera saat aplikasi dimuat
        registration.update().catch(() => {});

        // 2. Cek pembaruan berkala setiap 30 detik
        const intervalId = setInterval(() => {
          registration.update().catch(() => {});
        }, 30000);

        // 3. Cek pembaruan setiap kali pengguna kembali ke tab / membuka kembali aplikasi di HP
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        });
        window.addEventListener('focus', () => {
          registration.update().catch(() => {});
        });

        // 4. Jika terdeteksi service worker versi baru sedang diunduh:
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Ada versi baru! Perintahkan untuk langsung aktif (skip waiting)
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });

        // Bersihkan interval saat unload
        window.addEventListener('unload', () => clearInterval(intervalId));
      })
      .catch((err) => {
        console.warn('PWA SW registration notice:', err);
      });

    // 5. Ketika service worker baru berhasil mengambil alih kendali, reload halaman otomatis
    let isRefreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!isRefreshing) {
        isRefreshing = true;
        console.log('Versi baru PWA aktif. Me-reload otomatis...');
        window.location.reload();
      }
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
