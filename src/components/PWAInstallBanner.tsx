import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // default true until checked
  const [isClosing, setIsClosing] = useState(false);
  const [showDesktopGuide, setShowDesktopGuide] = useState(false);

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

    // Handler for Android / Chrome / Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
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
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
    } else {
      // In AI Studio iframe or browser preview without direct beforeinstallprompt trigger
      setShowDesktopGuide(true);
    }
  };

  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
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
                    1. Ketuk tombol <strong className="text-gray-800 inline-flex items-center gap-0.5"><Share size={11} /> Bagikan</strong> di bilah browser Safari/Chrome.<br />
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
            <div className="mt-2.5 flex justify-end">
              <button
                onClick={handleDismiss}
                className="text-[11px] font-semibold text-[#8A9A5B] hover:underline cursor-pointer"
              >
                Mengerti / Nanti Saja
              </button>
            </div>
          </div>
        ) : (
          /* Android / Desktop / Chrome Banner */
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
                    Akses cepat tanpa browser, lancar & offline
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleInstallClick}
                  className="bg-[#8A9A5B] hover:bg-[#7a8950] active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Instal</span>
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

      {/* Petunjuk instalasi untuk desktop browser / preview */}
      {showDesktopGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setShowDesktopGuide(false)}
          />
          <div className="relative bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-[#E0DCCF] z-10 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-[#8A9A5B]/15 text-[#8A9A5B] flex items-center justify-center mx-auto mb-3">
              <Download size={24} />
            </div>
            <h3 className="font-serif font-bold text-base text-gray-800 mb-2">
              Instal Dapur Mama RaraLita
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed mb-4 text-left bg-[#FDFBF7] p-3 rounded-xl border border-[#E0DCCF]">
              <strong>Langkah Mudah:</strong><br />
              1. Buka tautan aplikasi ini langsung di browser Chrome/Edge.<br />
              2. Klik ikon <strong>Instal</strong> (tanda komputer dengan panah bawah di bilah URL kanan atas) atau buka menu titik tiga <strong>(⋮) &gt; Pasang Aplikasi</strong>.
            </p>
            <button
              onClick={() => setShowDesktopGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#8A9A5B] text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer"
            >
              Tutup Petunjuk
            </button>
          </div>
        </div>
      )}
    </>
  );
};
