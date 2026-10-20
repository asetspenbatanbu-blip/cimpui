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
  CheckCircle2,
  Sparkles,
  ArrowDown,
  ChevronDown
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
  const [isDesktop, setIsDesktop] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  // Status tampilan: 'popup' (notifikasi/popup penuh), 'minimized' (tombol kecil mengambang), atau 'hidden'
  const [viewState, setViewState] = useState<'popup' | 'minimized' | 'hidden'>('popup');
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showDesktopGuide, setShowDesktopGuide] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // 1. Cek Mode Standalone (Jika sudah terinstal di home screen / desktop)
    if (isPWAStandalone()) {
      setIsInstalled(true);
      setViewState('hidden');
      return;
    }

    // 2. Deteksi Lingkungan Iframe (Pratinjau)
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    // 3. Deteksi Perangkat
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const isDesktopDevice = !/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    setIsDesktop(isDesktopDevice);

    // 4. Cek Status Session: Jika pengguna sebelumnya mengecilkan popup
    const wasDismissed = sessionStorage.getItem('dapur_pwa_dismissed') === 'true';
    if (wasDismissed) {
      setViewState('minimized');
    } else {
      // Munculkan popup otomatis setelah delay singkat untuk animasi halus
      const timer = setTimeout(() => {
        setViewState('popup');
      }, 600);
      return () => clearTimeout(timer);
    }

    // Tangkap prompt dari index.html jika sudah siap
    if ((window as any).__pwaDeferredPrompt) {
      setDeferredPrompt((window as any).__pwaDeferredPrompt);
    }

    // Listener BeforeInstallPrompt untuk Chrome, Edge, Android
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaDeferredPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Jika belum di-dismiss permanen, pastikan popup terbuka atau siap
      if (sessionStorage.getItem('dapur_pwa_dismissed') !== 'true') {
        setViewState('popup');
      }
    };

    const handlePromptReady = () => {
      if ((window as any).__pwaDeferredPrompt) {
        setDeferredPrompt((window as any).__pwaDeferredPrompt);
        if (sessionStorage.getItem('dapur_pwa_dismissed') !== 'true') {
          setViewState('popup');
        }
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).__pwaDeferredPrompt = null;
      setViewState('hidden');
    };

    // Listener Restore dari tombol pemulihan
    const handleRestoreBanner = () => {
      sessionStorage.removeItem('dapur_pwa_dismissed');
      setViewState('popup');
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

  // Penutupan atau Pengecilan ke Tombol Kecil Mengambang
  const handleMinimize = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setViewState('minimized');
      setIsAnimating(false);
      sessionStorage.setItem('dapur_pwa_dismissed', 'true');
      window.dispatchEvent(new CustomEvent('pwa-banner-dismissed'));
    }, 250);
  };

  // Tutup sepenuhnya untuk sesi ini
  const handleCloseCompletely = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsAnimating(true);
    setTimeout(() => {
      setViewState('hidden');
      setIsAnimating(false);
      sessionStorage.setItem('dapur_pwa_dismissed', 'true');
      window.dispatchEvent(new CustomEvent('pwa-banner-dismissed'));
    }, 250);
  };

  // Buka kembali popup penuh dari tombol kecil
  const handleExpandPopup = () => {
    sessionStorage.removeItem('dapur_pwa_dismissed');
    setViewState('popup');
  };

  // Aksi Klik Pemasangan Aplikasi
  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' && (window as any).__pwaDeferredPrompt);

    // 1. Jika pengguna di iOS (Safari)
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    // 2. Jika event prompt bawaan browser tersedia (Chrome, Edge, Samsung Internet, Android)
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsInstalled(true);
          setViewState('hidden');
        }
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          (window as any).__pwaDeferredPrompt = null;
        }
        return;
      } catch (err) {
        console.warn("Gagal memanggil prompt instalasi bawaan:", err);
      }
    }

    // 3. Jika berjalan di Desktop tanpa promptEvent langsung
    if (isDesktop && !isInIframe) {
      setShowDesktopGuide(true);
      return;
    }

    // 4. Jika di dalam Iframe (AI Studio Preview) atau browser menahan prompt
    setShowDesktopGuide(true);
  };

  // Jika sudah terinstal sebagai standalone native app, jangan tampilkan apa-apa
  if (isInstalled || viewState === 'hidden') {
    return null;
  }

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. NOTIFIKASI & POPUP OTOMATIS (PWA Install Prompt Banner / Bottom Toast)  */}
      {/* ========================================================================= */}
      {viewState === 'popup' && (
        <div 
          className={`fixed bottom-16 sm:bottom-6 right-3 sm:right-6 left-3 sm:left-auto sm:max-w-md z-50 transition-all duration-300 ease-out transform ${
            isAnimating ? 'opacity-0 translate-y-6 scale-95 pointer-events-none' : 'opacity-100 translate-y-0 scale-100'
          }`}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-[#8A9A5B]/30 ring-1 ring-black/5">
            {/* Header Notifikasi Popup */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src="/pwa-192x192.png" 
                    alt="Logo Dapur Mama" 
                    className="w-12 h-12 rounded-2xl shadow-md border border-[#8A9A5B]/20 object-cover bg-[#8A9A5B]"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-[#8A9A5B] text-white p-0.5 rounded-full ring-2 ring-white">
                    <CheckCircle2 size={12} />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-serif font-bold text-sm sm:text-base text-gray-800 leading-tight">
                      Pasang Dapur Mama
                    </h3>
                    <span className="text-[10px] bg-[#8A9A5B]/15 text-[#8A9A5B] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Sparkles size={10} />
                      <span>Resmi PWA</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                    Tambahkan ke Layar Utama (Add to Home Screen)
                  </p>
                </div>
              </div>

              {/* Tombol Tutup / Minimize */}
              <button
                onClick={handleMinimize}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer transition-colors shrink-0"
                title="Kecilkan Notifikasi"
              >
                <X size={18} />
              </button>
            </div>

            {/* Manfaat / Keunggulan PWA */}
            <div className="my-3 py-2.5 px-3 bg-[#FAF7EE] rounded-2xl border border-[#E0DCCF]/70 text-[11px] text-gray-700 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8A9A5B]" />
                <span><strong>Buka Cepat & Layar Penuh:</strong> Tanpa perlu membuka browser lagi.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8A9A5B]" />
                <span><strong>Bisa Dibuka Offline:</strong> Riwayat dan rekap pesanan tetap dapat dilihat.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8A9A5B]" />
                <span><strong>Hemat Kuota & Ringan:</strong> Tanpa membebani memori ponsel.</span>
              </div>
            </div>

            {/* Tombol Aksi Utama */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleInstallClick}
                className="flex-1 py-3 px-4 bg-[#8A9A5B] hover:bg-[#7a8950] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-[#8A9A5B]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isIOS ? (
                  <>
                    <Share size={16} />
                    <span>Petunjuk Pasang di iPhone</span>
                  </>
                ) : (
                  <>
                    <Download size={16} className="animate-pulse" />
                    <span>Pasang ke Layar Utama</span>
                  </>
                )}
              </button>

              <button
                onClick={handleMinimize}
                className="py-3 px-3.5 border border-[#E0DCCF] text-gray-500 hover:text-gray-800 text-xs font-semibold rounded-2xl hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                title="Kecilkan ke tombol sudut"
              >
                Nanti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TOMBOL KECIL MENGAMBANG (Floating Mini-Widget / Install Button)         */}
      {/* ========================================================================= */}
      {viewState === 'minimized' && (
        <div className="fixed bottom-20 right-3.5 sm:bottom-6 sm:right-6 z-40 animate-in fade-in zoom-in duration-300">
          <div className="group relative flex items-center">
            {/* Tombol Utama */}
            <button
              onClick={handleExpandPopup}
              className="bg-[#8A9A5B] hover:bg-[#7a8950] active:scale-95 text-white font-bold text-xs pl-3 pr-2.5 py-2.5 rounded-full shadow-xl shadow-[#8A9A5B]/35 flex items-center gap-2 cursor-pointer transition-all border-2 border-white/40 ring-1 ring-[#8A9A5B]/30"
              title="Ketuk untuk Menambahkan Aplikasi ke Layar Utama"
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Download size={13} className="text-white animate-bounce" />
              </div>
              <span className="tracking-wide">Pasang App</span>
              
              {/* Badge Titik Notifikasi Berdenyut */}
              <span className="relative flex h-2 w-2 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
              </span>
            </button>

            {/* Tombol Silang Kecil untuk menyembunyikan sepenuhnya */}
            <button
              onClick={handleCloseCompletely}
              className="ml-1 p-1 text-gray-400 hover:text-gray-600 bg-white/90 hover:bg-white rounded-full shadow-sm cursor-pointer transition-colors border border-gray-200"
              title="Tutup sepenuhnya"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PANDUAN VISUAL KHUSUS IPHONE & IPAD (iOS Safari Modal)                 */}
      {/* ========================================================================= */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setShowIOSGuide(false)}
          />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#E0DCCF] z-10 animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#8A9A5B]/15 text-[#8A9A5B] flex items-center justify-center">
                  <Smartphone size={22} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-gray-800">
                    Pasang di iPhone / iPad
                  </h3>
                  <span className="text-[10px] text-gray-400 font-medium">Khusus Browser Safari</span>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full bg-gray-100 cursor-pointer"
                title="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {/* 3 Langkah Praktis */}
            <div className="my-4 space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF7EE] border border-[#E0DCCF]">
                <div className="w-7 h-7 rounded-xl bg-[#8A9A5B] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-xs">
                  1
                </div>
                <div className="text-xs text-gray-700 leading-snug">
                  Ketuk tombol <strong className="text-gray-900 inline-flex items-center gap-1 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200"><Share size={12} className="text-[#007AFF]" /> Bagikan (Share)</strong> pada bilah bawah browser Safari.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF7EE] border border-[#E0DCCF]">
                <div className="w-7 h-7 rounded-xl bg-[#8A9A5B] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-xs">
                  2
                </div>
                <div className="text-xs text-gray-700 leading-snug">
                  Gulir ke bawah pada menu yang muncul, lalu pilih <strong className="text-gray-900 inline-flex items-center gap-1 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200"><PlusSquare size={12} className="text-gray-800" /> Tambah ke Layar Utama</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF7EE] border border-[#E0DCCF]">
                <div className="w-7 h-7 rounded-xl bg-[#8A9A5B] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-xs">
                  3
                </div>
                <div className="text-xs text-gray-700 leading-snug">
                  Ketuk tombol <strong className="text-[#007AFF] font-bold">"Tambah" (Add)</strong> di pojok kanan atas layar. Selesai! Ikon aplikasi akan muncul di beranda HP Anda.
                </div>
              </div>
            </div>

            {/* Indikator Panah ke Bawah (Menunjuk ke bilah Safari) */}
            <div className="flex flex-col items-center justify-center py-1 text-[#8A9A5B] animate-bounce">
              <span className="text-[10px] font-bold">Ikon Share ada di bilah bawah Safari</span>
              <ArrowDown size={18} />
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full mt-2 py-2.5 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PANDUAN VISUAL CHROME / EDGE / DESKTOP / IFRAME                        */}
      {/* ========================================================================= */}
      {showDesktopGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setShowDesktopGuide(false)}
          />
          <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#E0DCCF] z-10 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#8A9A5B]/15 text-[#8A9A5B] flex items-center justify-center">
                  <Monitor size={22} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-gray-800">
                    Pasang Aplikasi
                  </h3>
                  <span className="text-[10px] text-gray-400 font-medium">Chrome / Edge / Android</span>
                </div>
              </div>
              <button
                onClick={() => setShowDesktopGuide(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full bg-gray-100 cursor-pointer"
                title="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Langkah-langkah */}
            <div className="my-4 space-y-2.5">
              {isInIframe && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed font-medium">
                  <strong>Catatan Pratinjau:</strong> Browser membatasi instalasi langsung di dalam pratinjau. Gunakan tombol di bawah untuk membuka di tab browser utama agar dialog instalasi muncul otomatis:
                </div>
              )}

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAF7EE] border border-[#E0DCCF]">
                <div className="w-6 h-6 rounded-lg bg-[#8A9A5B] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs text-gray-700 leading-snug">
                  <strong>Ikon di Kolom URL:</strong> Klik ikon <Monitor size={13} className="inline text-[#8A9A5B] mx-0.5" /> <em>(Pasang / Install)</em> di sisi kanan kolom alamat URL browser Anda.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAF7EE] border border-[#E0DCCF]">
                <div className="w-6 h-6 rounded-lg bg-[#8A9A5B] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs text-gray-700 leading-snug">
                  <strong>Menu Titik Tiga (⋮):</strong> Buka menu browser <MoreVertical size={13} className="inline text-gray-600" /> lalu pilih <strong>"Pasang Dapur Mama..."</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.
                </div>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              {isInIframe && (
                <a
                  href={typeof window !== 'undefined' ? window.location.href : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowDesktopGuide(false)}
                  className="w-full py-2.5 px-4 bg-[#8A9A5B] hover:bg-[#7a8950] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-center no-underline"
                >
                  <ExternalLink size={14} />
                  <span>Buka di Tab Baru & Pasang</span>
                </a>
              )}

              <button
                onClick={() => setShowDesktopGuide(false)}
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
