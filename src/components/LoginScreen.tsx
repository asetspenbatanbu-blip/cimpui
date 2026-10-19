import React, { useState } from 'react';
import { ShieldCheck, User, Lock, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import { AdminUser } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: AdminUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (!u || !p) {
      setErrorMessage('Harap isi username dan password');
      return;
    }

    // Check Super Admin: dayatbk / dayatlagi
    if (u === 'dayatbk' && p === 'dayatlagi') {
      const superAdmin: AdminUser = {
        username: 'dayatbk',
        name: 'Dayat (Super Admin)',
        role: 'SUPER_ADMIN'
      };
      localStorage.setItem('dapur_mama_auth', JSON.stringify(superAdmin));
      onLoginSuccess(superAdmin);
      return;
    }

    // Check Sub-Admins in localStorage
    try {
      const savedAdmins = localStorage.getItem('dapur_mama_admins');
      if (savedAdmins) {
        const adminsList: AdminUser[] = JSON.parse(savedAdmins);
        const found = adminsList.find(
          a => a.username.toLowerCase() === u && a.password === p
        );
        if (found) {
          const userObj: AdminUser = {
            username: found.username,
            name: found.name,
            role: found.role
          };
          localStorage.setItem('dapur_mama_auth', JSON.stringify(userObj));
          onLoginSuccess(userObj);
          return;
        }
      }
    } catch (err) {
      console.error('Error verifying admin login:', err);
    }

    setErrorMessage('Username atau password salah! Silakan coba lagi.');
  };

  const handleFillSuperAdminDemo = () => {
    setUsername('dayatbk');
    setPassword('dayatlagi');
    setErrorMessage('');
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
            Portal Masuk Super Admin
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 animate-in shake">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
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
                placeholder="Masukkan username..."
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full pl-10 pr-4 py-2.5 bg-[#FDFBF7] border border-[#E0DCCF] rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-[#8A9A5B] focus:ring-1 focus:ring-[#8A9A5B]"
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
                className="w-full pl-10 pr-10 py-2.5 bg-[#FDFBF7] border border-[#E0DCCF] rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-[#8A9A5B] focus:ring-1 focus:ring-[#8A9A5B]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3.5 bg-[#8A9A5B] hover:bg-[#7a8950] text-white font-bold rounded-2xl shadow-lg shadow-[#8A9A5B]/25 active:scale-95 transition-all text-sm tracking-wide"
          >
            Masuk ke Aplikasi
          </button>
        </form>

        {/* Demo Fast Fill Button */}
        <div className="mt-5 pt-4 border-t border-[#E0DCCF]/60 text-center">
          <button
            type="button"
            onClick={handleFillSuperAdminDemo}
            className="inline-flex items-center gap-1.5 text-xs text-[#8A9A5B] hover:underline font-semibold bg-[#F5F1E9] px-3 py-1.5 rounded-full"
          >
            <Sparkles size={13} />
            <span>Isi Akun Super Admin Otomatis</span>
          </button>
          <p className="text-[10px] text-gray-400 mt-2">
            Super Admin: <code className="text-gray-600 font-mono">dayatbk</code> / <code className="text-gray-600 font-mono">dayatlagi</code>
          </p>
        </div>
      </div>
    </div>
  );
};
