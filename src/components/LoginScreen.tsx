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

  // Hook PWA dengan deteksi perangkat dan pemicu instalasi
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isDesktop,
    isWebView,
    install,
    openInChrome,
  } = usePWAInstall();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

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

  // Handler instalasi aplikasi PWA
  const handleDirectInstall = async () => {
    if (isInstalled) {
      showToast('Aplikasi Dapur Mama RaraLita sudah terpasang dan aktif di perangkat ini!', 'success');
      return;
    }

    if (isIOS) {
      setShowGuideModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      const outcome = await install();
      if (outcome === 'accepted') {
        showToast('Aplikasi berhasil dipasang ke perangkat Anda!', 'success');
      } else if (outcome === 'unavailable') {
        setShowGuideModal(true);
      }
    } catch {
      setShowGuideModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Label dinamis sesuai perangkat terdeteksi
  const getDeviceLabel = () => {
    if (isInstalled) return 'Aplikasi Terpasang (PWA)';
    if (isAndroid) return 'Instal Aplikasi di Android';
    if (isIOS) return 'Instal Aplikasi di iPhone/iPad';
    return 'Instal Aplikasi di Komputer/Laptop';
  };

  const getDeviceSubtitle = () => {
    if (isInstalled) return 'Sudah aktif di beranda perangkat Anda';
    if (isProcessing) return 'Sedang memproses instalasi...';
    if (isAndroid) return 'Pasang langsung ke layar utama Android';
    if (isIOS) return 'Pasang ke layar utama iPhone/iPad';
    return 'Pasang ke Windows / Mac / Desktop';
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
              {isDesktop ? <Monitor size={18} /> : <Smartphone size={18} />}
            </div>
          </button>
        </form>
      </div>

      {/* Modal Panduan & Pemasangan PWA (iOS, Android, Laptop/PC) */}
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
                ? 'Gunakan Safari untuk memasang langsung ke Layar Utama'
                : isAndroid
                ? 'Jalankan aplikasi mandiri tanpa bilah alamat browser'
                : 'Pasang aplikasi di desktop Windows / macOS / Linux'}
            </p>

            <div className="bg-[#FDFBF7] border border-[#E0DCCF] rounded-2xl p-4 text-xs text-gray-700 mb-5 space-y-3">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Buka halaman ini di browser <strong>Safari</strong> lalu ketuk tombol <strong>Bagikan</strong> (<Share size={12} className="inline text-blue-600 mx-0.5" />) di bilah bawah.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Gulir ke bawah dan pilih <strong>"Tambahkan ke Layar Utama"</strong> (Add to Home Screen).
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Ketuk <strong>"Tambah"</strong> di pojok kanan atas. Ikon aplikasi akan langsung muncul di beranda iPhone Anda!
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
                      Pastikan tautan dibuka di <strong>Google Chrome</strong> (bukan di browser chat internal WhatsApp/Instagram).
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Ketuk tombol <strong>"Pasang Sekarang"</strong> di bawah, atau ketuk menu titik tiga (<strong>⋮</strong>) di pojok kanan atas Chrome &gt; pilih <strong>"Instal aplikasi"</strong>.
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
                      Di browser Google Chrome atau Microsoft Edge, klik tombol <strong>"Pasang Sekarang"</strong> di bawah.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Atau klik ikon <strong>Instal</strong> (gambar monitor dengan panah ke bawah) di ujung kanan bilah alamat (address bar) browser.
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              {!isIOS && (
                <button
                  type="button"
                  onClick={async () => {
                    setShowGuideModal(false);
                    const res = await install();
                    if (res === 'accepted') {
                      showToast('Aplikasi berhasil dipasang!', 'success');
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
    </div>
  );
};
