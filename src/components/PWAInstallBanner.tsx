import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Share, 
  PlusSquare, 
  X, 
  ExternalLink, 
  Monitor, 
  Smartphone,
  MoreVertical,
  CheckCircle2
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function restorePWABanner() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('dapur_pwa_dismissed');
    window.dispatchEvent(new CustomEvent('pwa-banner-restore'));
  }
}

export function isPWADismissed(): boolean {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('dapur_pwa_dismissed') === 'true';
  }
  return false;
}

export function isPWAStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches
  );
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (typeof window !== 'undefined' && (window as any).__pwaDeferredPrompt) || null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [showVisualGuide, setShowVisualGuide] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // 1. Cek Mode Standalone (Sudah Terinstal)
    if (isPWAStandalone()) {
      setIsInstalled(true);
      return;
    }

    // 2. Deteksi apakah berjalan di dalam pratinjau (iframe)
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    // 3. Deteksi Perangkat iOS (iPhone / iPad)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // 4. Cek status sessionStorage
    const dismissed = sessionStorage.getItem('dapur_pwa_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
    }

    // Sync prompt yang sudah tertangkap sejak awal di index.html
    if ((window as any).__pwaDeferredPrompt) {
      setDeferredPrompt((window as any).__pwaDeferredPrompt);
    }

    // Event listener untuk Chromium / Android / Edge
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

    // Listener pemulihan sesi dari tombol login
    const handleRestoreBanner = () => {
      setIsDismissed(false);
      setIsClosing(false);
      if ((window as any).__pwaDeferredPrompt) {
        setDeferredPrompt((window as any).__pwaDeferredPrompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-banner-restore', handleRestoreBanner);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-banner-restore', handleRestoreBanner);
    };
  }, []);

  // Penutupan Halus (Smooth Dismissal)
  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsDismissed(true);
      setIsClosing(false);
      sessionStorage.setItem('dapur_pwa_dismissed', 'true');
      window.dispatchEvent(new CustomEvent('pwa-banner-dismissed'));
    }, 300);
  };

  // Aksi Klik Instal Otomatis / Panduan Interaktif
  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' && (window as any).__pwaDeferredPrompt);

    // Jika berjalan di dalam pratinjau (iframe) atau browser menahan prompt:
    if (isInIframe || !promptEvent) {
      setShowVisualGuide(true);
      return;
    }

    // Langsung picu dialog instalasi bawaan browser
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setIsInstalled(true);
        setIsDismissed(true);
      }
    } catch (err) {
      console.error("Gagal memanggil prompt instalasi:", err);
      setShowVisualGuide(true);
    }

    setDeferredPrompt(null);
    if (typeof window !== 'undefined') {
      (window as any).__pwaDeferredPrompt = null;
    }
  };

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
    setShowVisualGuide(false);
  };

  // Jangan render jika aplikasi sudah standalone atau ditutup di sesi ini
  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      <div 
        className={`w-full transition-all duration-300 ease-out z-30 ${
          isClosing ? 'opacity-0 scale-95 max-h-0 overflow-hidden' : 'opacity-100 scale-100 max-h-96'
        }`}
      >
        {/* ========================================================= */}
        {/* 1. IPHONE & IPAD (iOS) - Panduan Visual 3 Langkah          */}
        {/* ========================================================= */}
        {isIOS ? (
          <div className="bg-[#FAF7EE] border-b border-[#E0DCCF] px-4 py-3 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#8A9A5B] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Share size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold bg-[#8A9A5B] text-white px-1.5 py-0.2 rounded uppercase tracking-wider">
                      iOS Safari
                    </span>
                    <h4 className="text-xs font-bold text-gray-800">
                      Pasang Aplikasi di Layar Utama
                    </h4>
                  </div>
                  
                  {/* Panduan Visual 3 Langkah */}
                  <div className="mt-2 space-y-1.5 text-[11px] text-gray-700 bg-white/70 p-2.5 rounded-xl border border-[#E0DCCF]">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#8A9A5B]/15 text-[#8A9A5B] font-bold flex items-center justify-center text-[10px] shrink-0">
                        1
                      </span>
                      <span>
                        Ketuk tombol <strong className="text-gray-900 inline-flex items-center gap-0.5 font-bold"><Share size={11} className="text-[#8A9A5B]" /> Bagikan (Share)</strong> di bilah Safari.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#8A9A5B]/15 text-[#8A9A5B] font-bold flex items-center justify-center text-[10px] shrink-0">
                        2
                      </span>
                      <span>
                        Gulir ke bawah, lalu pilih <strong className="text-gray-900 inline-flex items-center gap-0.5 font-bold"><PlusSquare size={11} className="text-[#8A9A5B]" /> Tambah ke Layar Utama</strong>.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#8A9A5B]/15 text-[#8A9A5B] font-bold flex items-center justify-center text-[10px] shrink-0">
                        3
                      </span>
                      <span>
                        Ketuk tombol <strong className="text-gray-900 font-bold">"Tambah"</strong> di pojok kanan atas.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tombol Tutup (×) */}
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full bg-white/80 shrink-0 cursor-pointer transition-colors"
                title="Tutup Spanduk"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tombol "Nanti Saja" */}
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleDismiss}
                className="text-[11px] font-semibold text-gray-500 hover:text-[#8A9A5B] hover:underline cursor-pointer transition-colors"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* 2. ANDROID & LAPTOP/PC (Chrome / Edge / Chromium)         */
          /* ========================================================= */
          <div className="bg-[#FAF7EE] border-b border-[#E0DCCF] px-4 py-2.5 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#8A9A5B] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Download size={16} />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-gray-800 truncate">
                      Pasang Aplikasi Dapur Mama
                    </h4>
                    {isInIframe && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded hidden sm:inline">
                        Mode Pratinjau
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">
                    Akses cepat dari layar utama atau desktop, lancar & offline
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Tombol Instal Aplikasi */}
                <button
                  onClick={handleInstallClick}
                  className="bg-[#8A9A5B] hover:bg-[#7a8950] active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Instal Aplikasi</span>
                </button>

                {/* Tombol Nanti Saja (Teks) */}
                <button
                  onClick={handleDismiss}
                  className="text-[11px] text-gray-500 hover:text-gray-800 px-1.5 py-1 font-medium cursor-pointer transition-colors hidden sm:block"
                  title="Nanti Saja"
                >
                  Nanti Saja
                </button>

                {/* Tombol Tutup (×) */}
                <button
                  onClick={handleDismiss}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/50 cursor-pointer transition-colors"
                  title="Tutup"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. MODAL PANDUAN VISUAL INTERAKTIF (Untuk Iframe / Browser) */}
      {/* ========================================================= */}
      {showVisualGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setShowVisualGuide(false)}
          />
          <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#E0DCCF] z-10 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#8A9A5B]/15 text-[#8A9A5B] flex items-center justify-center">
                  <Download size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-gray-800">
                    Panduan Pasang Aplikasi
                  </h3>
                  <span className="text-[10px] text-gray-400">Dapur Mama RaraLita</span>
                </div>
              </div>
              <button
                onClick={() => setShowVisualGuide(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full bg-gray-100 cursor-pointer"
                title="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Steps */}
            <div className="my-4 space-y-3">
              {isInIframe && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                  <strong>Penting:</strong> Browser membatasi instalasi langsung di dalam pratinjau. Buka di tab baru browser untuk memicu pemasangan instan:
                </div>
              )}

              {/* Langkah 1 */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FDFBF7] border border-[#E0DCCF]">
                <div className="w-6 h-6 rounded-lg bg-[#8A9A5B] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs text-gray-700 leading-snug">
                  <strong>Ikon di Kolom URL:</strong> Klik ikon <Monitor size={13} className="inline text-[#8A9A5B] mx-0.5" /> <em>(Pasang Aplikasi)</em> di ujung kanan kolom alamat browser Anda.
                </div>
              </div>

              {/* Langkah 2 */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FDFBF7] border border-[#E0DCCF]">
                <div className="w-6 h-6 rounded-lg bg-[#8A9A5B] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs text-gray-700 leading-snug">
                  <strong>Menu Titik Tiga (⋮):</strong> Buka menu browser <MoreVertical size={13} className="inline text-gray-600" /> lalu pilih <strong>"Pasang Dapur Mama..."</strong> atau <strong>"Instal Aplikasi"</strong>.
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              {isInIframe && (
                <button
                  onClick={handleOpenInNewTab}
                  className="w-full py-2.5 px-4 bg-[#8A9A5B] hover:bg-[#7a8950] active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink size={14} />
                  <span>Buka di Tab Baru untuk Menginstal</span>
                </button>
              )}

              <button
                onClick={() => setShowVisualGuide(false)}
                className="w-full py-2 px-4 border border-[#E0DCCF] text-gray-600 font-semibold text-xs rounded-xl hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
