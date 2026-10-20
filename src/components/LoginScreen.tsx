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
  PlusSquare,
  MoreVertical,
  Monitor
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

  // PWA Install State & Hook
  const { isInstallable, isInstalled, isIOS, triggerInstall } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>(
    isIOS ? 'ios' : 'android'
  );
  const [installSuccessMessage, setInstallSuccessMessage] = useState('');

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

  const handleInstallClick = async () => {
    if (isInstalled) {
      setInstallSuccessMessage('Aplikasi Dapur Mama RaraLita sudah terinstal di perangkat Anda!');
      setTimeout(() => setInstallSuccessMessage(''), 4000);
      return;
    }

    if (isInstallable) {
      const outcome = await triggerInstall();
      if (outcome === 'accepted') {
        setInstallSuccessMessage('Aplikasi berhasil dipasang ke layar utama!');
        setTimeout(() => setInstallSuccessMessage(''), 4000);
        return;
      }
    }

    // Tampilkan modal panduan jika prompt otomatis browser belum siap atau di iOS/desktop
    setShowInstallModal(true);
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

        {/* Install Success Notification */}
        {installSuccessMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in leading-snug">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span className="font-medium">{installSuccessMessage}</span>
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

          {/* Tombol Instal Model PWA (Dibawah Tombol Masuk Aplikasi) */}
          <button
            type="button"
            onClick={handleInstallClick}
            className={`w-full py-3 px-3.5 rounded-2xl border transition-all flex items-center justify-between text-left group cursor-pointer ${
              isInstalled
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 shadow-xs'
                : 'bg-[#FDFBF7] hover:bg-[#F6F2E9] border-[#8A9A5B]/35 hover:border-[#8A9A5B] text-gray-800 active:scale-[0.98] shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  isInstalled
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-[#8A9A5B] text-white shadow-md shadow-[#8A9A5B]/25'
                }`}
              >
                {isInstalled ? <CheckCircle2 size={20} /> : <Download size={20} />}
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span className={isInstalled ? 'text-emerald-900' : 'text-gray-900'}>
                    {isInstalled ? 'Aplikasi Terpasang (PWA)' : 'Instal Aplikasi (PWA)'}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                      isInstalled
                        ? 'bg-emerald-200/70 text-emerald-800'
                        : 'bg-[#8A9A5B]/15 text-[#556334]'
                    }`}
                  >
                    PWA
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                  {isInstalled
                    ? 'Sudah aktif di layar utama perangkat'
                    : 'Pasang ke layar utama HP / Komputer'}
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
              <Smartphone size={18} />
            </div>
          </button>
        </form>
      </div>

      {/* Modal Panduan Instal Model PWA */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-[#E0DCCF] overflow-hidden">
            {/* Header Modal */}
            <div className="bg-[#8A9A5B] text-white p-5 text-center relative">
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-black/10 transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
              <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-2 backdrop-blur-xs">
                <Download size={24} className="text-white" />
              </div>
              <h3 className="text-base font-bold font-serif">Instal Dapur Mama RaraLita</h3>
              <p className="text-[11px] text-white/90 mt-0.5">
                Model PWA (Progressive Web App)
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-5">
              <p className="text-xs text-gray-600 leading-relaxed mb-4 text-center">
                Pasang aplikasi langsung ke layar utama perangkat Anda agar bisa dibuka instan seperti aplikasi Android / iOS bawaan tanpa mengetik link browser.
              </p>

              {/* Direct Native Install Button if Available */}
              {isInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await triggerInstall();
                    if (res === 'accepted') {
                      setShowInstallModal(false);
                      setInstallSuccessMessage('Aplikasi berhasil dipasang ke layar utama!');
                    }
                  }}
                  className="w-full mb-4 py-2.5 px-4 bg-[#8A9A5B] hover:bg-[#7a8950] text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Download size={16} />
                  <span>Pasang Otomatis Sekarang</span>
                </button>
              )}

              {/* Tabs Platform */}
              <div className="flex bg-[#F4EFE6] p-1 rounded-xl mb-4 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'android'
                      ? 'bg-white text-gray-800 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Smartphone size={13} />
                  <span>Android</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'ios'
                      ? 'bg-white text-gray-800 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Share size={13} />
                  <span>iPhone/iPad</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('desktop')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'desktop'
                      ? 'bg-white text-gray-800 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Monitor size={13} />
                  <span>Komputer</span>
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'android' && (
                <div className="space-y-2.5 text-xs text-gray-700 bg-[#FDFBF7] p-3 rounded-2xl border border-[#E0DCCF]">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      Tekan tombol <strong>Menu (titik tiga ⋮)</strong> di pojok kanan atas Google Chrome / browser Anda.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      Pilih menu <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      Tekan tombol <strong>Instal</strong>. Aplikasi akan langsung muncul di beranda HP Anda!
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ios' && (
                <div className="space-y-2.5 text-xs text-gray-700 bg-[#FDFBF7] p-3 rounded-2xl border border-[#E0DCCF]">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      Buka aplikasi menggunakan browser bawaan <strong>Safari</strong> di iPhone/iPad.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      Tekan tombol <strong>Bagikan (Share)</strong> <Share size={13} className="inline mx-1 text-blue-600" /> di bilah bawah layar Safari.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      Gulir ke bawah dan pilih <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong> <PlusSquare size={13} className="inline mx-1 text-gray-700" />, lalu tekan <strong>Tambah</strong>.
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'desktop' && (
                <div className="space-y-2.5 text-xs text-gray-700 bg-[#FDFBF7] p-3 rounded-2xl border border-[#E0DCCF]">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      Gunakan browser Google Chrome atau Microsoft Edge di komputer Anda.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      Perhatikan ikon <strong>Instal</strong> di bilah alamat link URL (sebelah kanan atas).
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      Klik <strong>"Instal"</strong> agar aplikasi memiliki jendela khusus tanpa address bar.
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="w-full mt-4 py-2.5 bg-[#F4EFE6] hover:bg-[#EBE5D8] text-gray-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
