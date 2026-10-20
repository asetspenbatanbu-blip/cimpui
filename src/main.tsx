import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Registrasi Service Worker PWA secara langsung dan andal
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn('PWA SW registration notice:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
