import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
    __pwaInstalled?: boolean;
  }
}

const DISMISS_STORAGE_KEY = 'spenba_pwa_prompt_dismissed';
const DISMISS_EVENT_NAME = 'spenba:pwa-dismissed';
const RESTORE_EVENT_NAME = 'spenba:pwa-restored';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.__pwaDeferredPrompt) {
      return window.__pwaDeferredPrompt;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DISMISS_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // 1. Cek Mode Standalone (aplikasi sudah diinstal dan dibuka dari layar utama / desktop)
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        !!window.__pwaInstalled;
      setIsInstalled(isStandalone);
    };
    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsInstalled(true);
    };
    mediaQuery.addEventListener?.('change', handleDisplayModeChange);

    // 2. Cek apakah dibuka di dalam pratinjau (iframe)
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    // 3. Deteksi Otomatis Perangkat: iOS (iPhone/iPad) vs Android vs Laptop/PC
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);
    const isMobileOther = /webos|blackberry|iemobile|opera mini/.test(ua);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(!isIOSDevice && !isAndroidDevice && !isMobileOther);

    // 4. Tangkap event beforeinstallprompt (khusus Android & Laptop/PC Chrome/Edge/Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwaDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handlePromptReady = (e: any) => {
      if (e.detail) {
        setDeferredPrompt(e.detail);
      } else if (window.__pwaDeferredPrompt) {
        setDeferredPrompt(window.__pwaDeferredPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      window.__pwaInstalled = true;
      window.__pwaDeferredPrompt = null;
      setDeferredPrompt(null);
    };

    // 5. Sinkronisasi status tutup (dismiss) dan pemulihan (restore) antar komponen
    const handleSyncDismiss = () => {
      setIsClosing(true);
      setTimeout(() => {
        setIsDismissed(true);
      }, 280);
    };

    const handleSyncRestore = () => {
      setIsDismissed(false);
      setIsClosing(false);
    };

    // Cek kembali jika window.__pwaDeferredPrompt sudah terisi sebelum hook mount
    if (window.__pwaDeferredPrompt) {
      setDeferredPrompt(window.__pwaDeferredPrompt);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-deferred-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener(DISMISS_EVENT_NAME, handleSyncDismiss);
    window.addEventListener(RESTORE_EVENT_NAME, handleSyncRestore);

    return () => {
      mediaQuery.removeEventListener?.('change', handleDisplayModeChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-deferred-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener(DISMISS_EVENT_NAME, handleSyncDismiss);
      window.removeEventListener(RESTORE_EVENT_NAME, handleSyncRestore);
    };
  }, []);

  // Fungsi penutupan halus (Smooth Dismissal) & penyimpanan ke sessionStorage
  const dismiss = useCallback(() => {
    setIsClosing(true);
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, 'true');
    } catch {
      // Abaikan jika sessionStorage diblokir
    }
    window.dispatchEvent(new Event(DISMISS_EVENT_NAME));
    setTimeout(() => {
      setIsDismissed(true);
    }, 280);
  }, []);

  // Fungsi pemulihan panduan instalasi dari sessionStorage
  const restore = useCallback(() => {
    try {
      sessionStorage.removeItem(DISMISS_STORAGE_KEY);
    } catch {
      // Abaikan jika sessionStorage diblokir
    }
    setIsDismissed(false);
    setIsClosing(false);
    window.dispatchEvent(new Event(RESTORE_EVENT_NAME));
  }, []);

  // Fungsi pemicu dialog instalasi native browser (beforeinstallprompt)
  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const activePrompt = deferredPrompt || (typeof window !== 'undefined' ? window.__pwaDeferredPrompt : null);
    if (!activePrompt) {
      return 'unavailable';
    }
    try {
      await activePrompt.prompt();
      const { outcome } = await activePrompt.userChoice;
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') {
        window.__pwaDeferredPrompt = null;
      }

      if (outcome === 'accepted') {
        setIsInstalled(true);
        if (typeof window !== 'undefined') {
          window.__pwaInstalled = true;
        }
        return 'accepted';
      }

      dismiss();
      return 'dismissed';
    } catch (err) {
      console.warn('Gagal memicu install prompt:', err);
      return 'unavailable';
    }
  }, [deferredPrompt, dismiss]);

  return {
    isInstallable: !!deferredPrompt || (typeof window !== 'undefined' && !!window.__pwaDeferredPrompt),
    isInstalled,
    isIOS,
    isAndroid,
    isDesktop,
    isAndroidOrDesktop: !isIOS,
    isInIframe,
    isDismissed,
    isClosing,
    install,
    dismiss,
    restore,
  };
}
