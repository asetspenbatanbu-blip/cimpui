import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, Lock, Eye, EyeOff, AlertCircle, Loader2, Download } from 'lucide-react';
import { AdminUser } from '../types';
import { supabase } from '../lib/supabase';
import { PWAInstallBanner, restorePWABanner, isPWADismissed, isPWAStandalone } from './PWAInstallBanner';

interface LoginScreenProps {
  onLoginSuccess: (user: AdminUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(isPWADismissed);
  const [standalone, setStandalone] = useState(isPWAStandalone);

  useEffect(() => {
    setStandalone(isPWAStandalone());
    setBannerDismissed(isPWADismissed());

    const handleDismissed = () => setBannerDismissed(true);
    const handleRestored = () => setBannerDismissed(false);

    window.addEventListener('pwa-banner-dismissed', handleDismissed);
    window.addEventListener('pwa-banner-restore', handleRestored);

    return () => {
      window.removeEventListener('pwa-banner-dismissed', handleDismissed);
      window.removeEventListener('pwa-banner-restore', handleRestored);
    };
  }, []);

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
    // Mendukung login baik menggunakan Username maupun Nama Admin
    try {
      const { data, error } = await supabase
        .from('cimpui_admins')
        .select('*')
        .or(`username.ilike.${cleanId},name.ilike.${cleanId}`);

      if (error) {
        console.error('Error dari Supabase cimpui_admins:', error);
      }

      if (data && data.length > 0) {
        // Cek kecocokan password
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

    // 3. Fallback: Cek Sub-Admins di localStorage (jika offline)
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

  return (
    <div className="min-h-[100dvh] bg-[#FDFBF7] flex flex-col justify-center items-center p-4 relative font-sans">
      {/* Background Decorative Rings */}
      <div className="absolute top-0 left-0 right-0 h-44 bg-[#8A9A5B] rounded-b-[40px] shadow-sm -z-0" />

      {/* Spanduk PWA di Halaman Login */}
      <div className="relative z-10 w-full max-w-sm mb-3">
        <PWAInstallBanner />
      </div>

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
        </form>
      </div>

      {/* Tombol Pemulihan Panduan PWA di Halaman Login */}
      {!standalone && bannerDismissed && (
        <div className="relative z-10 mt-4 text-center animate-in fade-in duration-300">
          <button
            type="button"
            onClick={() => {
              restorePWABanner();
              setBannerDismissed(false);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-[#8A9A5B] hover:text-[#7a8950] font-semibold bg-white/95 hover:bg-white shadow-md shadow-[#8A9A5B]/10 px-4 py-2 rounded-full cursor-pointer transition-all active:scale-95 border border-[#8A9A5B]/30"
          >
            <Download size={13} />
            <span>Tampilkan kembali panduan instalasi aplikasi</span>
          </button>
        </div>
      )}
    </div>
  );
};
