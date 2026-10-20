import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Loader2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (typeof window !== 'undefined' && (window as any).__pwaDeferredPrompt) || null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('dapur_pwa_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    // Check if already in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    setIsDismissed(false);

    // Sync any pre-captured prompt from index.html
    if ((window as any).__pwaDeferredPrompt) {
      setDeferredPrompt((window as any).__pwaDeferredPrompt);
    }

    // Handler for Android / Chrome / Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaDeferredPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handlePromptReady = () => {
      if ((window as any).__pwaDeferredPrompt) {
        setDeferredPrompt((window as any).__pwaDeferredPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).__pwaDeferredPrompt = null;
      setIsDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsDismissed(true);
      sessionStorage.setItem('dapur_pwa_dismissed', 'true');
    }, 250);
  };

  const handleInstallClick = async () => {
    let promptEvent = deferredPrompt || (typeof window !== 'undefined' && (window as any).__pwaDeferredPrompt);

    if (!promptEvent) {
      // If prompt event has not arrived yet, wait briefly for it
      setIsPrompting(true);
      promptEvent = await new Promise<BeforeInstallPromptEvent | null>((resolve) => {
        const timer = setTimeout(() => resolve(null), 1000);
        const onReady = () => {
          clearTimeout(timer);
          window.removeEventListener('pwa-prompt-ready', onReady);
          window.removeEventListener('beforeinstallprompt', onReady);
          resolve((window as any).__pwaDeferredPrompt || null);
        };
        window.addEventListener('pwa-prompt-ready', onReady, { once: true });
        window.addEventListener('beforeinstallprompt', onReady, { once: true });
      });
      setIsPrompting(false);
    }

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsInstalled(true);
          setIsDismissed(true);
        }
      } catch (err) {
        console.error("Gagal memanggil dialog instalasi perangkat:", err);
      }
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') {
        (window as any).__pwaDeferredPrompt = null;
      }
    } else {
      // If running inside an iframe or browser restricts direct prompt, open app directly in full browser tab where install prompt fires
      if (window.self !== window.top) {
        window.open(window.location.href, '_blank');
      }
    }
  };

  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <div 
      className={`w-full transition-all duration-300 ease-out z-30 ${
        isClosing ? 'opacity-0 scale-95 max-h-0 overflow-hidden' : 'opacity-100 scale-100'
      }`}
    >
      {/* iOS Guided Banner */}
      {isIOS ? (
        <div className="bg-[#FAF7EE] border-b border-[#E0DCCF] px-4 py-3 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#8A9A5B] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Share size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-gray-800">
                  Pasang Aplikasi di Layar Utama (iOS)
                </h4>
                <p className="text-[11px] text-gray-600 mt-1 leading-snug">
                  1. Ketuk tombol <strong className="text-gray-800 inline-flex items-center gap-0.5"><Share size={11} /> Bagikan</strong> di bilah browser Safari.<br />
                  2. Geser ke bawah lalu pilih <strong className="text-gray-800 inline-flex items-center gap-0.5"><PlusSquare size={11} /> Tambah ke Layar Utama</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full bg-white/80 shrink-0 cursor-pointer"
              title="Tutup / Nanti Saja"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleDismiss}
              className="text-[11px] font-semibold text-[#8A9A5B] hover:underline cursor-pointer"
            >
              Mengerti / Nanti Saja
            </button>
          </div>
        </div>
      ) : (
        /* Android / Desktop / Chrome Banner - Directly triggers native device install dialog */
        <div className="bg-[#FAF7EE] border-b border-[#E0DCCF] px-4 py-2.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#8A9A5B] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Download size={16} />
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-gray-800 truncate">
                  Pasang Aplikasi Dapur Mama
                </h4>
                <p className="text-[10px] text-gray-500 truncate">
                  Instal langsung ke layar utama perangkat Anda
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleInstallClick}
                disabled={isPrompting}
                className="bg-[#8A9A5B] hover:bg-[#7a8950] active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isPrompting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    <span>Instal Sekarang</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/50 cursor-pointer"
                title="Lewati"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
