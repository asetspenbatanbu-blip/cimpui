import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Download,
  Smartphone,
  CheckCircle2,
  X,
  Share,
  Monitor,
  ExternalLink,
  Sparkles,
  ArrowDown
} from 'lucide-react';
import { AdminUser } from '../types';
import { supabase } from '../lib/supabase';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface LoginScreenProps {
  onLoginSuccess: (user: AdminUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Hook PWA dengan deteksi perangkat dan inisiasi instalasi otomatis
  const {
    isInstalled,
    platform,
    browserName,
    isIframe,
    isProcessing,
    showIOSOverlay,
    setShowIOSOverlay,
    showBrowserDirectOverlay,
    setShowBrowserDirectOverlay,
    triggerAutomaticInstall,
    triggerIOSProfileDownload
  } = usePWAInstall();

  const [installNotification, setInstallNotification] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setInstallNotification({ type, message });
    setTimeout(() => setInstallNotification(null), 5000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const rawInput = username.trim();
    const cleanId = rawInput.replace(/^@/, '');
    const p = password.trim();

    if (!cleanId || !p) {
      setErrorMessage('Harap isi username atau nama admin, serta password');
      return;
    }

    // 1. Cek Akun Utama Super Admin: dayatbk / dayatlagi
    if ((cleanId.toLowerCase() === 'dayatbk' || cleanId.toLowerCase() === 'dayat') && p === 'dayatlagi') {
      const superAdmin: AdminUser = {
        username: 'dayatbk',
        name: 'Dayat (Super Admin)',
        role: 'SUPER_ADMIN'
      };
      localStorage.setItem('dapur_mama_auth', JSON.stringify(superAdmin));
      onLoginSuccess(superAdmin);
      return;
    }

    setIsLoading(true);

    // 2. Cek Akun Sub-Admin dari Supabase (Tabel: cimpui_admins)
    try {
      const { data, error } = await supabase
        .from('cimpui_admins')
        .select('*')
        .or(`username.ilike.${cleanId},name.ilike.${cleanId}`);

      if (error) {
        console.error('Error dari Supabase cimpui_admins:', error);
      }

      if (data && data.length > 0) {
        const matched = data.find(
          item => item.password === p || item.password?.trim() === p
        );

        if (matched) {
          const userObj: AdminUser = {
            username: matched.username,
            name: matched.name,
            role: (matched.role as any) || 'ADMIN'
          };
          localStorage.setItem('dapur_mama_auth', JSON.stringify(userObj));
          setIsLoading(false);
          onLoginSuccess(userObj);
          return;
        } else {
          setIsLoading(false);
          setErrorMessage('Password yang Anda masukkan salah. Silakan periksa kembali.');
          return;
        }
      }
    } catch (err: any) {
      console.error('Error saat menghubungi Supabase:', err);
    }

    // 3. Fallback: Cek Sub-Admins di localStorage
    try {
      const savedAdmins = localStorage.getItem('dapur_mama_admins');
      if (savedAdmins) {
        const adminsList: AdminUser[] = JSON.parse(savedAdmins);
        const found = adminsList.find(
          a =>
            (a.username.toLowerCase() === cleanId.toLowerCase() ||
             a.name.toLowerCase() === cleanId.toLowerCase()) &&
            (a.password === p || a.password?.trim() === p)
        );
        if (found) {
          const userObj: AdminUser = {
            username: found.username,
            name: found.name,
            role: found.role
          };
          localStorage.setItem('dapur_mama_auth', JSON.stringify(userObj));
          setIsLoading(false);
          onLoginSuccess(userObj);
          return;
        }
      }
    } catch (err) {
      console.error('Error verifying admin login from local storage:', err);
    }

    setIsLoading(false);
    setErrorMessage('Akun admin tidak ditemukan. Pastikan username atau nama sudah didaftarkan oleh Super Admin.');
  };

  // Langsung mulai instalasi otomatis saat tombol diklik
  const handleDirectInstall = async () => {
    if (isProcessing) return;

    const result = await triggerAutomaticInstall();
    if (result.status === 'accepted') {
      showToast(result.message, 'success');
    } else if (result.status === 'already_installed') {
      showToast(result.message, 'success');
    } else if (result.status === 'opened_external') {
      showToast(result.message, 'info');
    } else if (result.status === 'ios_profile_started') {
      showToast('Memulai pemasangan otomatis di iPhone / iPad...', 'info');
    } else if (result.status === 'browser_direct') {
      showToast(result.message, 'info');
    }
  };

  // Label dinamis sesuai perangkat terdeteksi
  const getDeviceLabel = () => {
    if (isInstalled) return 'Aplikasi Terpasang (PWA)';
    if (platform === 'android') return 'Instal Aplikasi di Android';
    if (platform === 'ios') return 'Instal Aplikasi di iPhone/iPad';
    return `Instal Aplikasi di Komputer (${browserName})`;
  };

  const getDeviceSubtitle = () => {
    if (isInstalled) return 'Sudah aktif di beranda perangkat Anda';
    if (isProcessing) return 'Sedang memproses instalasi otomatis...';
    if (platform === 'android') return 'Otomatis pasang ke layar utama HP Android';
    if (platform === 'ios') return 'Otomatis pasang ke layar utama iPhone/iPad';
    return 'Otomatis pasang ke komputer / laptop';
  };

  return (
    <div className="min-h-[100dvh] bg-[#FDFBF7] flex flex-col justify-center items-center p-4 relative font-sans">
      {/* Background Decorative Rings */}
      <div className="absolute top-0 left-0 right-0 h-44 bg-[#8A9A5B] rounded-b-[40px] shadow-sm -z-0" />

      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-xl border border-[#E0DCCF] p-6 sm:p-8 animate-in zoom-in-95 duration-200">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#8A9A5B] text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-[#8A9A5B]/30">
            <ShieldCheck size={34} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-wide font-serif">
            Dapur mama RaraLita
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-semibold">
            Portal Masuk Admin
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 animate-in shake leading-snug">
            <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Install Status Toast */}
        {installNotification && (
          <div
            className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-xs animate-in fade-in leading-snug border ${
              installNotification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {installNotification.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            ) : (
              <Sparkles size={16} className="shrink-0 text-amber-600" />
            )}
            <span className="font-medium">{installNotification.message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="username"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FDFBF7] border border-[#E0DCCF] rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-[#8A9A5B] focus:ring-1 focus:ring-[#8A9A5B] disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan password..."
                disabled={isLoading}
                className="w-full pl-10 pr-10 py-2.5 bg-[#FDFBF7] border border-[#E0DCCF] rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-[#8A9A5B] focus:ring-1 focus:ring-[#8A9A5B] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Tombol Masuk ke Aplikasi */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-[#8A9A5B] hover:bg-[#7a8950] text-white font-bold rounded-2xl shadow-lg shadow-[#8A9A5B]/25 active:scale-95 transition-all text-sm tracking-wide cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Memeriksa Akun...</span>
              </>
            ) : (
              <span>Masuk ke Aplikasi</span>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-3 flex items-center justify-center">
            <div className="border-t border-[#E0DCCF] w-full" />
            <span className="bg-white px-2.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
              atau
            </span>
            <div className="border-t border-[#E0DCCF] w-full" />
          </div>

          {/* Tombol Instal Model PWA Otomatis (Dibawah Tombol Masuk Aplikasi) */}
          <button
            type="button"
            onClick={handleDirectInstall}
            disabled={isProcessing}
            className={`w-full py-3 px-3.5 rounded-2xl border transition-all flex items-center justify-between text-left group cursor-pointer ${
              isInstalled
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
                : 'bg-[#FDFBF7] hover:bg-[#F6F2E9] border-[#8A9A5B]/40 hover:border-[#8A9A5B] text-gray-800 active:scale-[0.98] shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  isInstalled
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isProcessing
                    ? 'bg-amber-600 text-white'
                    : 'bg-[#8A9A5B] text-white shadow-md shadow-[#8A9A5B]/25'
                }`}
              >
                {isProcessing ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : isInstalled ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <Download size={20} />
                )}
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span className={isInstalled ? 'text-emerald-900' : 'text-gray-900'}>
                    {getDeviceLabel()}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                      isInstalled
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-[#8A9A5B]/15 text-[#556334]'
                    }`}
                  >
                    {isInstalled ? 'AKTIF' : 'OTOMATIS'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                  {getDeviceSubtitle()}
                </p>
              </div>
            </div>
            <div
              className={`shrink-0 transition-colors ${
                isInstalled
                  ? 'text-emerald-600'
                  : 'text-gray-400 group-hover:text-[#8A9A5B]'
              }`}
            >
              {platform === 'desktop' ? <Monitor size={18} /> : <Smartphone size={18} />}
            </div>
          </button>
        </form>
      </div>

      {/* Asisten Pemasangan Langsung Khusus iOS (iPhone / iPad) */}
      {showIOSOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm mx-auto bg-white rounded-3xl shadow-2xl border border-[#E0DCCF] p-5 pb-6 animate-in slide-in-from-bottom-6">
            <button
              type="button"
              onClick={() => setShowIOSOverlay(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Tutup"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#8A9A5B] text-white flex items-center justify-center shrink-0">
                <Smartphone size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Perangkat iPhone / iPad Terdeteksi</h4>
                <p className="text-[11px] text-[#8A9A5B] font-semibold">Profil WebClip Diunduh Otomatis</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Untuk memasang langsung ke Layar Utama iPhone/iPad, cukup ikuti 1 langkah cepat berikut di Safari:
            </p>

            <div className="bg-[#FDFBF7] border border-[#E0DCCF] rounded-2xl p-3.5 mb-4 space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-gray-800 font-medium">
                <span className="w-6 h-6 rounded-lg bg-[#8A9A5B] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  1
                </span>
                <span>
                  Ketuk tombol <strong>Bagikan</strong> (<Share size={13} className="inline text-blue-600 mx-0.5" />) di bilah bawah Safari
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-gray-800 font-medium">
                <span className="w-6 h-6 rounded-lg bg-[#8A9A5B] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  2
                </span>
                <span>
                  Pilih <strong>"Tambahkan ke Layar Utama"</strong> (Add to Home Screen)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-emerald-700 text-xs font-bold mb-4 animate-bounce">
              <ArrowDown size={16} />
              <span>Tekan tombol Bagikan di bilah bawah peramban Anda</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={triggerIOSProfileDownload}
                className="flex-1 py-2.5 px-3 bg-[#F4EFE6] hover:bg-[#EBE5D8] text-gray-800 text-xs font-bold rounded-xl transition-colors text-center"
              >
                Unduh Profil Lagi
              </button>
              <button
                type="button"
                onClick={() => setShowIOSOverlay(false)}
                className="flex-1 py-2.5 px-3 bg-[#8A9A5B] hover:bg-[#7a8950] text-white text-xs font-bold rounded-xl transition-colors text-center"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asisten Langsung Browser (Jika Prompt Perlu Dipicu Manual) */}
      {showBrowserDirectOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-[#E0DCCF] p-5 animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setShowBrowserDirectOverlay(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Tutup"
            >
              <X size={20} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#8A9A5B]/15 text-[#556334] flex items-center justify-center mx-auto mb-3">
              <Download size={24} />
            </div>

            <h4 className="text-base font-bold text-center text-gray-900 mb-1">
              Pasang di {browserName} ({platform === 'android' ? 'Android' : 'Komputer'})
            </h4>
            <p className="text-xs text-center text-gray-500 mb-4">
              Konfirmasi pemasangan langsung pada peramban {browserName} Anda:
            </p>

            <div className="bg-[#FDFBF7] border border-[#E0DCCF] rounded-2xl p-3 text-xs text-gray-700 mb-4 space-y-2">
              {platform === 'android' ? (
                <p>
                  Ketuk menu titik tiga (<strong>⋮</strong>) di pojok kanan atas browser {browserName}, lalu pilih <strong>"Instal aplikasi"</strong>.
                </p>
              ) : (
                <p>
                  Klik ikon <strong>Instal</strong> pada bilah alamat URL (address bar) di sebelah kanan atas browser {browserName}.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowBrowserDirectOverlay(false);
                window.open(`${window.location.origin}${window.location.pathname}?autoInstall=1`, '_blank');
              }}
              className="w-full py-2.5 bg-[#8A9A5B] hover:bg-[#7a8950] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <ExternalLink size={15} />
              <span>Buka di Jendela Khusus & Pasang</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
