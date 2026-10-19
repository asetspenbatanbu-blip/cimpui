import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  User, 
  Key, 
  LogOut, 
  CheckCircle2, 
  RotateCcw,
  Sparkles,
  MapPin,
  Database,
  Copy,
  Check,
  X
} from 'lucide-react';
import { AdminUser } from '../types';

interface PengaturanAdminProps {
  currentUser: AdminUser;
  onLogout: () => void;
  onOpenResetModal: () => void;
  onOpenLocationModal?: () => void;
  totalLocations?: number;
}

export const SUPABASE_SQL_SCRIPT = `-- Skrip Pembuatan Tabel Pesanan Dapur Mama RaraLita
create table if not exists public.cimpui_orders (
  id text primary key,
  date text not null,
  customer_name text not null,
  customer_location text default 'Batulicin',
  total_items integer default 0,
  items jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Aktifkan Row Level Security (RLS)
alter table public.cimpui_orders enable row level security;

-- Kebijakan Akses Baca (SELECT) untuk Publik / Anon
create policy "Allow public read access on cimpui_orders"
  on public.cimpui_orders for select
  using (true);

-- Kebijakan Akses Tambah (INSERT) untuk Publik / Anon
create policy "Allow public insert access on cimpui_orders"
  on public.cimpui_orders for insert
  with check (true);

-- Kebijakan Akses Ubah (UPDATE) untuk Publik / Anon
create policy "Allow public update access on cimpui_orders"
  on public.cimpui_orders for update
  using (true);

-- Kebijakan Akses Hapus (DELETE) untuk Publik / Anon
create policy "Allow public delete access on cimpui_orders"
  on public.cimpui_orders for delete
  using (true);

-- Aktifkan Sinkronisasi Realtime
alter publication supabase_realtime add table public.cimpui_orders;`;

export const PengaturanAdmin: React.FC<PengaturanAdminProps> = ({
  currentUser,
  onLogout,
  onOpenResetModal,
  onOpenLocationModal,
  totalLocations = 0
}) => {
  const [adminList, setAdminList] = useState<AdminUser[]>(() => {
    try {
      const saved = localStorage.getItem('dapur_mama_admins');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Form State
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Delete admin confirmation modal state
  const [adminToDelete, setAdminToDelete] = useState<string | null>(null);

  // Supabase SQL Modal state
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem('dapur_mama_admins', JSON.stringify(adminList));
  }, [adminList]);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin SQL:", err);
    }
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const name = newAdminName.trim();
    const username = newAdminUsername.trim().toLowerCase();
    const password = newAdminPassword.trim();

    if (!name || !username || !password) {
      setFormError('Harap lengkapi semua data admin (Nama, Username, Password).');
      return;
    }

    if (username === 'dayatbk') {
      setFormError('Username "dayatbk" sudah dicadangkan untuk Super Admin.');
      return;
    }

    if (adminList.some(a => a.username.toLowerCase() === username)) {
      setFormError(`Username "${username}" sudah digunakan oleh admin lain.`);
      return;
    }

    const newAdmin: AdminUser = {
      username,
      name,
      password,
      role: 'ADMIN',
      createdAt: new Date().toLocaleDateString('id-ID')
    };

    setAdminList(prev => [...prev, newAdmin]);
    setNewAdminName('');
    setNewAdminUsername('');
    setNewAdminPassword('');
    setFormSuccess(`Admin "${name}" berhasil didaftarkan!`);
    setTimeout(() => {
      setFormSuccess('');
    }, 2500);
  };

  const handleConfirmDeleteAdmin = () => {
    if (!adminToDelete) return;
    setAdminList(prev => prev.filter(a => a.username !== adminToDelete));
    setAdminToDelete(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#FDFBF7] pb-24 overflow-y-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="p-4 bg-white shadow-xs border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShieldCheck className="text-[#8A9A5B]" /> Pengaturan & Admin
          </h2>
          <p className="text-[11px] text-gray-500">
            Kelola data admin, database & akun sistem
          </p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 transition-all text-xs font-semibold cursor-pointer"
          title="Keluar dari akun"
        >
          <LogOut size={14} />
          <span>Keluar</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Card Profil Akun Saat Ini */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E0DCCF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#8A9A5B] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base text-gray-800">
                  {currentUser.name}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  currentUser.role === 'SUPER_ADMIN'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-[#F5F1E9] text-[#8A9A5B] border border-[#8A9A5B]/30'
                }`}>
                  {currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Username: <code className="font-mono text-gray-600 font-semibold">@{currentUser.username}</code>
              </p>
            </div>
          </div>
        </div>

        {/* Database Supabase Integration Status */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E0DCCF]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Database size={18} />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-gray-800">
                  Database Supabase Terhubung
                </h4>
                <p className="text-[11px] text-gray-500">
                  Proyek: <strong className="text-gray-700">asetsmpn1btlcn</strong> (Tabel: <code className="font-mono text-emerald-700 font-bold">cimpui_orders</code>)
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Aktif
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 text-[11px]">Skrip SQL Tabel <code className="font-mono text-gray-700 font-bold">cimpui_orders</code></span>
            <button
              onClick={() => setShowSqlModal(true)}
              className="text-[#8A9A5B] font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Copy size={13} />
              <span>Salin Skrip SQL</span>
            </button>
          </div>
        </div>

        {/* Form Tambah Admin di Bawah Super Admin */}
        {currentUser.role === 'SUPER_ADMIN' ? (
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#E0DCCF]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#8A9A5B]/15 text-[#8A9A5B] flex items-center justify-center">
                <UserPlus size={16} />
              </div>
              <h3 className="font-serif font-bold text-base text-gray-800">
                Tambah Admin Baru
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Super Admin dapat mendaftarkan akun admin toko untuk membantu mengelola pesanan.
            </p>

            {formError && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={16} className="text-green-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddAdmin} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Nama Lengkap Admin
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={e => setNewAdminName(e.target.value)}
                    placeholder="Contoh: Rara Lita..."
                    className="w-full pl-9 pr-3 py-2 bg-[#FDFBF7] border border-[#E0DCCF] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#8A9A5B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Username Login
                  </label>
                  <input
                    type="text"
                    value={newAdminUsername}
                    onChange={e => setNewAdminUsername(e.target.value)}
                    placeholder="Contoh: admin_rara"
                    autoCapitalize="none"
                    className="w-full px-3 py-2 bg-[#FDFBF7] border border-[#E0DCCF] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#8A9A5B]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Key size={14} />
                    </div>
                    <input
                      type="text"
                      value={newAdminPassword}
                      onChange={e => setNewAdminPassword(e.target.value)}
                      placeholder="Password login..."
                      className="w-full pl-9 pr-3 py-2 bg-[#FDFBF7] border border-[#E0DCCF] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#8A9A5B]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-[#8A9A5B] hover:bg-[#7a8950] text-white font-semibold text-xs rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus size={15} />
                <span>Daftarkan Admin</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-[#FAF7EE] border border-[#E0DCCF] rounded-2xl p-4 text-xs text-gray-600">
            Anda login sebagai <strong>Admin Biasa</strong>. Penambahan atau penghapusan admin hanya dapat dilakukan oleh akun <strong>Super Admin</strong>.
          </div>
        )}

        {/* Daftar Seluruh Admin */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#E0DCCF]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif font-bold text-base text-gray-800">
              Daftar Admin Terdaftar ({adminList.length + 1})
            </h3>
          </div>

          <div className="space-y-2.5">
            {/* Super Admin Item */}
            <div className="flex items-center justify-between p-3 bg-[#FAF7EE] border border-amber-200/80 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                  <Sparkles size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-800">Dayat (Super Admin)</span>
                    <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">UTAMA</span>
                  </div>
                  <span className="text-[11px] text-gray-500">@dayatbk</span>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 font-medium">Permanen</span>
            </div>

            {/* Sub-Admins List */}
            {adminList.map(admin => (
              <div 
                key={admin.username}
                className="flex items-center justify-between p-3 bg-[#FDFBF7] border border-[#E0DCCF] rounded-xl hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center font-bold text-xs">
                    {admin.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-gray-800">{admin.name}</span>
                      <span className="text-[9px] bg-gray-200 text-gray-700 font-semibold px-1.5 py-0.5 rounded">ADMIN</span>
                    </div>
                    <span className="text-[11px] text-gray-500">@{admin.username}</span>
                  </div>
                </div>

                {currentUser.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={() => setAdminToDelete(admin.username)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title={`Hapus admin @${admin.username}`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Kelola Wilayah / Lokasi Pemesan */}
        {onOpenLocationModal && (
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#E0DCCF] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#C04000] flex items-center justify-center shrink-0">
                <MapPin size={20} />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-gray-800">
                  Daftar Wilayah Pemesan
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {totalLocations} wilayah terdaftar untuk pemesanan & rekap
                </p>
              </div>
            </div>
            <button
              onClick={onOpenLocationModal}
              className="px-3.5 py-2 bg-[#8A9A5B] hover:bg-[#7a8950] active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Kelola Wilayah</span>
            </button>
          </div>
        )}

        {/* Zona Tindakan Khusus Super Admin: Reset Data */}
        {currentUser.role === 'SUPER_ADMIN' && (
          <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4">
            <h4 className="font-bold text-xs text-red-800 flex items-center gap-1.5 mb-1">
              <RotateCcw size={14} className="text-red-600" />
              <span>Pusat Reset Transaksi</span>
            </h4>
            <p className="text-[11px] text-gray-600 mb-3">
              Kosongkan seluruh riwayat pesanan & rekapitulasi data penjualan dengan kode pengaman.
            </p>
            <button
              onClick={onOpenResetModal}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Buka Menu Reset Transaksi</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal Skrip SQL Supabase */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setShowSqlModal(false)}
          />
          <div className="relative bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-[#E0DCCF] z-10 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Database size={17} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-gray-800">
                    Skrip SQL Tabel Supabase
                  </h3>
                  <span className="text-[10px] text-gray-500">Tabel: public.cimpui_orders</span>
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full bg-gray-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-600 my-3 leading-relaxed shrink-0">
              Buka menu <strong>SQL Editor</strong> di dashboard Supabase proyek <strong>asetsmpn1btlcn</strong>, lalu jalankan perintah berikut untuk membuat tabel dan izin publik:
            </p>

            <div className="relative flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-900 text-emerald-400 font-mono text-[11px] p-3">
              <pre className="h-full overflow-y-auto whitespace-pre-wrap select-all pr-2">
                {SUPABASE_SQL_SCRIPT}
              </pre>
            </div>

            <div className="mt-4 pt-2 flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopySql}
                className="flex-1 py-2.5 px-4 bg-[#8A9A5B] hover:bg-[#7a8950] active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check size={15} />
                    <span>Tersalin ke Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy size={15} />
                    <span>Salin Seluruh Skrip SQL</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSqlModal(false)}
                className="py-2.5 px-4 border border-[#E0DCCF] text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Admin */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setAdminToDelete(null)}
          />
          <div className="relative bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-[#E0DCCF] z-10 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="font-serif font-bold text-base text-gray-800 mb-1">
              Hapus Admin?
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Akun admin <strong className="text-gray-800">@{adminToDelete}</strong> akan dihapus dan tidak bisa lagi masuk ke sistem.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setAdminToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E0DCCF] text-gray-700 font-semibold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeleteAdmin}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
