import React, { useState } from 'react';
import { Download, X, Share, Monitor, Smartphone, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isDesktop,
    isWebView,
    isDismissed,
    isClosing,
    install,
    openInChrome,
    dismiss,
  } = usePWAInstall();

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Jika sudah terpasang atau ditutup oleh pengguna, sembunyikan banner
  if (isInstalled || (isDismissed && !showGuideModal)) {
    return null;
  }

  const handleInstallClick = async () => {
    // 1. Pada iPhone / iPad (iOS), Safari tidak menyediakan API instalasi otomatis via JS
    if (isIOS) {
      setShowGuideModal(true);
      return;
    }

    // 2. Pada Android dan Komputer / Laptop: LANGSUNG picu dialog pasang otomatis native browser
    setIsInstalling(true);
    try {
      const outcome = await install();
      if (outcome === 'accepted') {
        showToast('Aplikasi berhasil dipasang ke perangkat!');
      } else if (outcome === 'unavailable') {
        // Hanya jika browser tidak mendukung install prompt (misal WebView atau browser lama)
        setShowGuideModal(true);
      }
    } catch {
      setShowGuideModal(true);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <>
      {/* Toast notifikasi */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#8A9A5B] text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating In-App Install Prompt Banner */}
      {!isDismissed && (
        <aside
          aria-label="Pemasangan Aplikasi PWA"
          className={`fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 bg-white/95 backdrop-blur-md border border-[#8A9A5B]/30 rounded-2xl shadow-xl p-3 flex items-center justify-between gap-3 transition-all duration-300 ${
            isClosing ? 'opacity-0 -translate-y-3' : 'animate-in fade-in slide-in-from-top-3'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/icon-192.png"
              alt="Logo Dapur Mama RaraLita"
              className="w-10 h-10 rounded-xl shadow-xs shrink-0 object-cover border border-[#E0DCCF]"
            />
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-gray-900 truncate">
                Dapur Mama RaraLita
              </h4>
              <p className="text-[11px] text-gray-500 truncate">
                {isIOS
                  ? 'Pasang di iPhone / iPad'
                  : isAndroid
                  ? 'Pasang langsung di HP'
                  : 'Pasang langsung di Laptop'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={isInstalling}
              onClick={handleInstallClick}
              className="py-1.5 px-3 bg-[#8A9A5B] hover:bg-[#7a8950] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isInstalling ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Memasang...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Pasang</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Tutup pemberitahuan"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        </aside>
      )}

      {/* Modal Panduan Cadangan (Hanya untuk iOS Safari atau Browser Non-Chromium) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-[#E0DCCF] p-5 sm:p-6 animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X size={20} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#8A9A5B]/15 text-[#556334] flex items-center justify-center mx-auto mb-3">
              {isDesktop ? <Monitor size={24} /> : <Smartphone size={24} />}
            </div>

            <h4 className="text-base font-bold text-center text-gray-900 mb-1 font-serif">
              {isIOS
                ? 'Pasang di iPhone / iPad'
                : isAndroid
                ? 'Pasang di HP Android'
                : 'Pasang di Laptop / Komputer'}
            </h4>
            <p className="text-xs text-center text-gray-500 mb-4">
              {isIOS
                ? 'iOS Safari mewajibkan penambahan via tombol Bagikan'
                : isWebView
                ? 'Tautan saat ini dibuka di dalam aplikasi lain'
                : 'Jalankan aplikasi mandiri tanpa bilah alamat browser'}
            </p>

            {isWebView && isAndroid ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 mb-5 space-y-3">
                <p className="leading-relaxed">
                  Tautan dibuka di browser internal aplikasi (seperti WhatsApp/Instagram). Untuk langsung memasang otomatis dengan satu klik, buka di <strong>Google Chrome</strong>:
                </p>
                <button
                  type="button"
                  onClick={openInChrome}
                  className="w-full py-2.5 px-3 bg-[#8A9A5B] hover:bg-[#7a8950] text-white font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink size={15} />
                  <span>Buka di Google Chrome & Pasang</span>
                </button>
              </div>
            ) : (
              <div className="bg-[#FDFBF7] border border-[#E0DCCF] rounded-2xl p-4 text-xs text-gray-700 mb-5 space-y-3">
                {isIOS ? (
                  <>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Buka halaman di <strong>Safari</strong> lalu ketuk tombol <strong>Bagikan</strong> (<Share size={12} className="inline text-blue-600 mx-0.5" />) di bagian bawah layar.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        2
                      </span>
                      <span>
                        Pilih <strong>"Tambahkan ke Layar Utama"</strong> (Add to Home Screen).
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        3
                      </span>
                      <span>
                        Ketuk <strong>"Tambah"</strong> di kanan atas. Aplikasi langsung terpasang!
                      </span>
                    </div>
                  </>
                ) : isAndroid ? (
                  <>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Ketuk tombol <strong>"Pasang Sekarang"</strong> di bawah untuk memunculkan dialog resmi.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        2
                      </span>
                      <span>
                        Atau ketuk menu titik tiga (<strong>⋮</strong>) di Chrome lalu pilih <strong>"Instal aplikasi"</strong>.
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Klik tombol <strong>"Pasang Sekarang"</strong> di bawah.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        2
                      </span>
                      <span>
                        Atau klik ikon <strong>Instal</strong> di bilah alamat (URL bar) browser.
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {!isIOS && (
                <button
                  type="button"
                  onClick={async () => {
                    setShowGuideModal(false);
                    const res = await install();
                    if (res === 'accepted') {
                      showToast('Aplikasi berhasil dipasang!');
                    }
                  }}
                  className="flex-1 py-2.5 bg-[#8A9A5B] hover:bg-[#7a8950] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Download size={15} />
                  <span>Pasang Sekarang</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                {isIOS ? 'Mengerti' : 'Tutup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
