import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  Store, 
  History as HistoryIcon, 
  Plus, 
  Minus, 
  Contact, 
  X, 
  Trash2, 
  CheckCircle2, 
  ChevronRight, 
  Edit2, 
  ClipboardList, 
  Search, 
  AlertTriangle, 
  RotateCcw,
  ShieldCheck,
  MapPin,
  ChevronDown,
  Download
} from 'lucide-react';
import { Category, AppTab, RekapFilter, CartItem, Order, AdminUser } from './types';
import { LoginScreen } from './components/LoginScreen';
import { PengaturanAdmin } from './components/PengaturanAdmin';
import { PWAInstallBanner, restorePWABanner, isPWAStandalone } from './components/PWAInstallBanner';

// --- Data Constants & Configurations ---
const CATEGORY_CONFIG: Record<Category, { label: string; rekapLabel: string; sizes: string[] }> = {
  ROTI_PIZZA: {
    label: "Roti & Pizza",
    rekapLabel: "Rekap Roti dan Pizza",
    sizes: ["1 Pcs", "Kotak", "Porsi", "Loyang"]
  },
  BOLU: {
    label: "Bolu",
    rekapLabel: "Rekap Bolu",
    sizes: ["Loyang", "Setengah Loyang", "Kotak", "Potong"]
  },
  KUE: {
    label: "Kue Kering",
    rekapLabel: "Rekap Kue Kering",
    sizes: ["250 gr", "500 gr", "Tabung 500 gr", "Tabung 1000 gr"]
  },
  GORENGAN: {
    label: "Gorengan",
    rekapLabel: "Rekap Gorengan",
    sizes: ["250 gr", "500 gr"]
  }
};

const CATEGORY_ORDER: Category[] = ['ROTI_PIZZA', 'BOLU', 'KUE', 'GORENGAN'];

const DEFAULT_MENU_ITEMS: Record<Category, string[]> = {
  ROTI_PIZZA: [
    "Roti Coklat", "Roti Keju", "Roti Sosis", "Roti Abon", "Roti Sobek", 
    "Pizza Mini", "Pizza Meat Lover", "Pizza Sosis Keju", "Pizza Supreme"
  ],
  BOLU: [
    "Bolu Gulung", "Bolu Kukus", "Bolu Pandan", "Bolu Keju", 
    "Bolu Coklat", "Bolu Ketan Hitam", "Bolu Pisang", "Bolu Marmer"
  ],
  KUE: [
    "Nastar bulat", "Kue kacang", "Nastar gulung", "Nastar bunga", 
    "Lidah kucing", "Semprit sagu", "Sagu panjang", "Putri salju", 
    "Semprit dahlia", "Semprit coklat", "Janet", "Kastangel"
  ],
  GORENGAN: [
    "Kacang sembunyi", "Stik bawang", "Stik ketan", "Akar pinang", 
    "Keripik pisang asin", "Keripik pisang manis", "Stik keju", "Keripik bawang", "Bolu Kering"
  ]
};

const DEFAULT_LOCATIONS = [
  "Batulicin",
  "Simpang Empat",
  "Pagatan",
  "Satui",
  "Sungai Danau",
  "Kusan Hilir",
  "Angsana",
  "Luar Daerah"
];

interface SelectedProduct {
  name: string;
  category: Category;
}

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    try {
      const savedAuth = localStorage.getItem('dapur_mama_auth');
      if (savedAuth) return JSON.parse(savedAuth);
    } catch (e) {
      console.error("Error reading auth state:", e);
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<AppTab>('MENU');
  const [menuTab, setMenuTab] = useState<Category>('ROTI_PIZZA');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [history, setHistory] = useState<Order[]>([]);

  // Standalone PWA detection
  const [isStandalone, setIsStandalone] = useState(isPWAStandalone);

  useEffect(() => {
    setIsStandalone(isPWAStandalone());
    const handleInstalled = () => setIsStandalone(true);
    window.addEventListener('appinstalled', handleInstalled);
    return () => window.removeEventListener('appinstalled', handleInstalled);
  }, []);

  // Wilayah / Locations State
  const [locations, setLocations] = useState<string[]>(() => {
    try {
      const savedLocs = localStorage.getItem('dapur_mama_locations');
      if (savedLocs) return JSON.parse(savedLocs);
    } catch (e) {
      console.error("Error reading locations:", e);
    }
    return DEFAULT_LOCATIONS;
  });
  const [selectedLocation, setSelectedLocation] = useState<string>(locations[0] || "Batulicin");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [newLocationInput, setNewLocationInput] = useState('');

  // Custom Menu Items State
  const [menuItems, setMenuItems] = useState<Record<Category, string[]>>(() => {
    try {
      const saved = localStorage.getItem('dapur_mama_custom_menu');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ROTI_PIZZA: parsed.ROTI_PIZZA || DEFAULT_MENU_ITEMS.ROTI_PIZZA,
          BOLU: parsed.BOLU || DEFAULT_MENU_ITEMS.BOLU,
          KUE: parsed.KUE || DEFAULT_MENU_ITEMS.KUE,
          GORENGAN: parsed.GORENGAN || DEFAULT_MENU_ITEMS.GORENGAN
        };
      }
    } catch (e) {
      console.error("Error loading custom menu:", e);
    }
    return DEFAULT_MENU_ITEMS;
  });

  // Rekap Filter State
  const [rekapFilter, setRekapFilter] = useState<RekapFilter>('ALL');

  // Modal Tambah Menu Manual State
  const [isAddMenuModalOpen, setIsAddMenuModalOpen] = useState(false);
  const [targetAddCategory, setTargetAddCategory] = useState<Category>('ROTI_PIZZA');
  const [newMenuName, setNewMenuName] = useState('');

  // Mode Edit Menu & Modal Edit Item State
  const [isMenuEditMode, setIsMenuEditMode] = useState(false);
  const [isEditMenuModalOpen, setIsEditMenuModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<{ category: Category; oldName: string; newName: string } | null>(null);

  // Modal State for Variant
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedQty, setSelectedQty] = useState<number>(1);

  // Checkout State
  const [customerName, setCustomerName] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Reset Transaksi State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Simpan custom menu jika ada perubahan
  useEffect(() => {
    localStorage.setItem('dapur_mama_custom_menu', JSON.stringify(menuItems));
  }, [menuItems]);

  // Simpan locations jika ada perubahan
  useEffect(() => {
    localStorage.setItem('dapur_mama_locations', JSON.stringify(locations));
  }, [locations]);

  // Load history on mount and subscribe to realtime updates
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('cimpui_orders')
          .select('*')
          .order('date', { ascending: false });

        if (data && !error) {
          const mappedHistory: Order[] = data.map(d => ({
            id: d.id,
            date: d.date,
            customerName: d.customer_name,
            customerLocation: d.customer_location || locations[0] || "Batulicin",
            items: d.items,
            totalItems: d.total_items
          }));
          setHistory(mappedHistory);
        } else {
          // Fallback to local storage if supabase offline
          const savedLocally = localStorage.getItem('dapur_mama_history');
          if (savedLocally) {
            setHistory(JSON.parse(savedLocally));
          }
        }
      } catch (err) {
        console.error("Error fetching from supabase:", err);
        const savedLocally = localStorage.getItem('dapur_mama_history');
        if (savedLocally) {
          setHistory(JSON.parse(savedLocally));
        }
      }
    };

    fetchHistory();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('cimpui_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cimpui_orders'
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Save history on change locally
  useEffect(() => {
    localStorage.setItem('dapur_mama_history', JSON.stringify(history));
  }, [history]);

  // --- Handlers ---
  const handleLogout = () => {
    localStorage.removeItem('dapur_mama_auth');
    setCurrentUser(null);
  };

  const handleOpenProduct = (name: string, category: Category) => {
    setSelectedProduct({ name, category });
    const availableSizes = CATEGORY_CONFIG[category]?.sizes || ["1 Pcs"];
    setSelectedSize(availableSizes[0]);
    setSelectedQty(1);
  };

  const handleOpenAddMenu = (category: Category) => {
    setTargetAddCategory(category);
    setNewMenuName('');
    setIsAddMenuModalOpen(true);
  };

  const handleSaveNewMenu = () => {
    const trimmed = newMenuName.trim();
    if (!trimmed) {
      alert("Silakan masukkan nama menu terlebih dahulu.");
      return;
    }
    const currentList = menuItems[targetAddCategory] || [];
    if (currentList.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Menu "${trimmed}" sudah ada di kategori ${CATEGORY_CONFIG[targetAddCategory].label}.`);
      return;
    }
    setMenuItems(prev => ({
      ...prev,
      [targetAddCategory]: [...(prev[targetAddCategory] || []), trimmed]
    }));
    setNewMenuName('');
    setIsAddMenuModalOpen(false);
  };

  const handleDeleteMenuItem = (category: Category, itemName: string) => {
    if (window.confirm(`Hapus "${itemName}" dari daftar menu ${CATEGORY_CONFIG[category].label}?`)) {
      setMenuItems(prev => ({
        ...prev,
        [category]: (prev[category] || []).filter(item => item !== itemName)
      }));
      setCart(prev => prev.filter(cItem => !(cItem.name === itemName && cItem.category === category)));
    }
  };

  const handleOpenEditItem = (category: Category, itemName: string) => {
    setItemToEdit({
      category,
      oldName: itemName,
      newName: itemName
    });
    setIsEditMenuModalOpen(true);
  };

  const handleSaveEditItem = () => {
    if (!itemToEdit) return;
    const trimmed = itemToEdit.newName.trim();
    if (!trimmed) {
      alert("Nama menu tidak boleh kosong.");
      return;
    }
    setMenuItems(prev => {
      const list = prev[itemToEdit.category] || [];
      if (trimmed === itemToEdit.oldName) return prev;
      if (list.some(item => item.toLowerCase() === trimmed.toLowerCase() && item !== itemToEdit.oldName)) {
        alert(`Menu "${trimmed}" sudah ada di kategori ${CATEGORY_CONFIG[itemToEdit.category].label}.`);
        return prev;
      }
      return {
        ...prev,
        [itemToEdit.category]: list.map(item => item === itemToEdit.oldName ? trimmed : item)
      };
    });

    // Update jika item yang diedit sedang ada di keranjang
    setCart(prev => prev.map(cItem => {
      if (cItem.name === itemToEdit.oldName && cItem.category === itemToEdit.category) {
        return {
          ...cItem,
          id: `${trimmed}-${cItem.size}`,
          name: trimmed
        };
      }
      return cItem;
    }));

    setIsEditMenuModalOpen(false);
    setItemToEdit(null);
  };

  const handleDeleteItemFromEditModal = () => {
    if (!itemToEdit) return;
    if (window.confirm(`Yakin ingin menghapus "${itemToEdit.oldName}" dari daftar menu ${CATEGORY_CONFIG[itemToEdit.category].label}?`)) {
      setMenuItems(prev => ({
        ...prev,
        [itemToEdit.category]: (prev[itemToEdit.category] || []).filter(item => item !== itemToEdit.oldName)
      }));
      setCart(prev => prev.filter(cItem => !(cItem.name === itemToEdit.oldName && cItem.category === itemToEdit.category)));
      setIsEditMenuModalOpen(false);
      setItemToEdit(null);
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !selectedSize || selectedQty < 1) return;
    const newItemId = `${selectedProduct.name}-${selectedSize}`;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === newItemId);
      if (existing) {
        return prev.map(item => 
          item.id === newItemId ? { ...item, qty: item.qty + selectedQty } : item
        );
      }
      return [...prev, {
        id: newItemId,
        name: selectedProduct.name,
        category: selectedProduct.category,
        size: selectedSize,
        qty: selectedQty
      }];
    });

    setSelectedProduct(null);
  };

  const handleUpdateCartQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const handleGetContact = async () => {
    try {
      const nav = navigator as any;
      if ('contacts' in nav && 'ContactsManager' in window) {
        const contacts = await nav.contacts.select(['name'], { multiple: false });
        if (contacts && contacts.length > 0) {
          setCustomerName(contacts[0].name[0]);
        }
      } else {
        alert("Browser tidak mendukung fitur ambil kontak otomatis. Silakan ketik nama secara manual.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal mengambil kontak atau dibatalkan.");
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (!customerName.trim()) {
      alert("Silakan isi nama pemesan terlebih dahulu.");
      return;
    }

    const orderName = customerName.trim();
    let finalOrder: Order;

    const existingIdx = history.findIndex(o => o.customerName.toLowerCase() === orderName.toLowerCase());

    if (existingIdx >= 0) {
      // Merge into existing order
      const existingOrder = history[existingIdx];
      const mergedItems = [...existingOrder.items];

      cart.forEach(cartItem => {
        const itemIdx = mergedItems.findIndex(i => i.id === cartItem.id);
        if (itemIdx >= 0) {
          mergedItems[itemIdx] = {
            ...mergedItems[itemIdx],
            qty: mergedItems[itemIdx].qty + cartItem.qty
          };
        } else {
          mergedItems.push({ ...cartItem });
        }
      });

      finalOrder = {
        ...existingOrder,
        date: new Date().toLocaleString('id-ID'),
        customerLocation: selectedLocation || existingOrder.customerLocation,
        items: mergedItems,
        totalItems: mergedItems.reduce((sum, item) => sum + item.qty, 0)
      };

      setHistory(prev => {
        const updated = [...prev];
        updated.splice(existingIdx, 1);
        return [finalOrder, ...updated];
      });
    } else {
      // New order
      finalOrder = {
        id: `ORD-${Date.now()}`,
        date: new Date().toLocaleString('id-ID'),
        customerName: orderName,
        customerLocation: selectedLocation,
        items: [...cart],
        totalItems: cart.reduce((sum, item) => sum + item.qty, 0)
      };

      setHistory(prev => [finalOrder, ...prev]);
    }

    // Save to Supabase (Background)
    const saveToDb = async () => {
      try {
        const { error } = await supabase.from('cimpui_orders').upsert({
          id: finalOrder.id,
          date: finalOrder.date,
          customer_name: finalOrder.customerName,
          customer_location: finalOrder.customerLocation,
          total_items: finalOrder.totalItems,
          items: finalOrder.items
        });
        if (error) console.error("Supabase upsert error:", error);
      } catch (err) {
        console.error("Failed to save to supabase", err);
      }
    };
    saveToDb();

    setCart([]);
    setCustomerName('');
    setOrderSuccess(true);
    
    setTimeout(() => {
      setOrderSuccess(false);
      setActiveTab('HISTORY');
    }, 2000);
  };

  const handleEditOrder = (orderId: string) => {
    const orderToEdit = history.find(o => o.id === orderId);
    if (!orderToEdit) return;
    
    if (cart.length > 0) {
      if (!window.confirm("Ada pesanan yang belum disimpan di Keranjang bagian Menu. Yakin ingin menimpanya untuk mengedit riwayat ini?")) return;
    }

    setCustomerName(orderToEdit.customerName);
    if (orderToEdit.customerLocation) {
      setSelectedLocation(orderToEdit.customerLocation);
    }
    setCart([...orderToEdit.items]);
    setHistory(prev => prev.filter(o => o.id !== orderId));
    setActiveTab('MENU');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const removeFromDb = async () => {
      try {
        const { error } = await supabase.from('cimpui_orders').delete().eq('id', orderId);
        if (error) console.error("Supabase delete error:", error);
      } catch (err) {
        console.error("Failed to delete from supabase during edit", err);
      }
    };
    removeFromDb();
  };

  const handleResetAllOrders = async () => {
    if (resetCode.trim() !== 'dayatlagi') {
      setResetError("Kode verifikasi salah! Masukkan 'dayatlagi'");
      return;
    }

    setIsResetting(true);
    setResetError('');

    try {
      // Hapus seluruh transaksi di Supabase
      const { error } = await supabase
        .from('cimpui_orders')
        .delete()
        .neq('id', '___non_existent___');

      if (error) {
        console.error("Supabase reset error:", error);
      }

      // Bersihkan riwayat lokal
      setHistory([]);
      localStorage.removeItem('dapur_mama_history');
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
        setIsResetModalOpen(false);
        setResetCode('');
      }, 1500);
    } catch (err) {
      console.error("Gagal mereset transaksi:", err);
      setResetError("Terjadi kesalahan saat mereset data. Silakan coba lagi.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleAddNewLocation = () => {
    const trimmed = newLocationInput.trim();
    if (!trimmed) return;
    if (locations.some(l => l.toLowerCase() === trimmed.toLowerCase())) {
      alert("Wilayah ini sudah ada di daftar.");
      return;
    }
    setLocations(prev => [...prev, trimmed]);
    setSelectedLocation(trimmed);
    setNewLocationInput('');
  };

  const handleDeleteLocation = (locToDelete: string) => {
    if (locations.length <= 1) {
      alert("Harus menyisakan minimal 1 wilayah.");
      return;
    }
    setLocations(prev => prev.filter(l => l !== locToDelete));
    if (selectedLocation === locToDelete) {
      setSelectedLocation(locations.find(l => l !== locToDelete) || locations[0]);
    }
  };

  // If not authenticated, render LoginScreen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // --- Views ---
  const renderMenu = () => {
    if (orderSuccess) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300 bg-[#FDFBF7]">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2 font-serif">Pesanan Tersimpan!</h2>
          <p className="text-gray-500 text-sm">Pesanan telah berhasil dimasukkan ke riwayat.</p>
        </div>
      );
    }

    const items = menuItems[menuTab] || [];
    
    return (
      <div className="flex flex-col h-full bg-[#FDFBF7] animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white p-4 sm:p-5 shadow-xs border-b border-[#E0DCCF] sticky top-0 z-20 shrink-0 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
              Pesan Atas Nama
            </label>
            <div className="flex gap-3 items-center">
              <input 
                type="text" 
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Tulis nama pelanggan..." 
                className="flex-1 border-b border-[#E0DCCF] bg-transparent py-1.5 focus:outline-none focus:border-[#8A9A5B] font-serif font-bold text-base sm:text-lg text-[#4E4E4E]"
              />
              <button 
                onClick={handleGetContact}
                className="bg-[#F5F1E9] text-[#8A9A5B] p-2 rounded-full flex items-center justify-center hover:bg-[#EAE7DC] active:scale-95 transition-all shrink-0 cursor-pointer"
                title="Ambil dari Kontak HP"
              >
                <Contact size={19} />
              </button>
            </div>
          </div>

          {/* Wilayah / Lokasi Selector */}
          <div className="flex items-center gap-2 pt-1 border-t border-[#E0DCCF]/50">
            <MapPin size={15} className="text-[#C04000] shrink-0" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider shrink-0">
              Wilayah:
            </span>
            <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 py-0.5">
              {locations.map(loc => (
                <button
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    selectedLocation === loc
                      ? 'bg-[#C04000] text-white shadow-xs'
                      : 'bg-[#F5F1E9] text-gray-600 hover:bg-[#EAE7DC]'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="text-[11px] text-[#8A9A5B] hover:underline font-bold shrink-0 ml-1 cursor-pointer"
              title="Kelola Daftar Wilayah"
            >
              + Edit
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-28">
          {/* Category Tabs: Roti & Pizza, Bolu, Kue Kering, Gorengan */}
          <div className="flex px-4 py-3 gap-2 bg-[#FDFBF7] overflow-x-auto no-scrollbar border-b border-[#E0DCCF]/50">
            {CATEGORY_ORDER.map(cat => (
              <button 
                key={cat}
                onClick={() => setMenuTab(cat)}
                className={`px-4 py-2 rounded-full font-semibold text-xs whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  menuTab === cat 
                    ? 'bg-[#8A9A5B] text-white shadow-xs' 
                    : 'bg-[#EAE7DC] text-[#4E4E4E] hover:bg-[#dedad0]'
                }`}
              >
                {CATEGORY_CONFIG[cat].label}
              </button>
            ))}
          </div>

          {/* Subheader info & Tombol Tambah/Edit Menu Manual */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500 font-medium truncate">
              Daftar {CATEGORY_CONFIG[menuTab].label} ({items.length} item)
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsMenuEditMode(prev => !prev)}
                className={`text-xs flex items-center gap-1 font-semibold px-2.5 py-1.5 rounded-full transition-all border cursor-pointer ${
                  isMenuEditMode
                    ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-xs'
                    : 'bg-[#F5F1E9] text-[#4E4E4E] hover:bg-[#EAE7DC] border-[#E0DCCF]'
                }`}
                title="Aktifkan mode untuk mengedit atau menghapus item menu"
              >
                <Edit2 size={13} />
                <span>{isMenuEditMode ? 'Selesai Edit' : 'Edit Menu'}</span>
              </button>
              <button
                onClick={() => handleOpenAddMenu(menuTab)}
                className="text-xs flex items-center gap-1 text-[#8A9A5B] font-bold bg-[#F5F1E9] hover:bg-[#EAE7DC] active:scale-95 px-2.5 py-1.5 rounded-full transition-all border border-[#8A9A5B]/20 cursor-pointer"
                title="Tambah menu baru secara manual"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Tambah</span>
              </button>
            </div>
          </div>

          {/* Banner Mode Edit Aktif */}
          {isMenuEditMode && (
            <div className="mx-4 mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-medium">
                <Edit2 size={13} className="text-amber-600 shrink-0" />
                <span>Mode Edit: Klik nama untuk ubah atau ikon hapus.</span>
              </div>
              <button 
                onClick={() => setIsMenuEditMode(false)}
                className="text-xs font-bold text-amber-900 underline ml-2 shrink-0 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          <div className="px-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {items.map((item) => (
              <div 
                key={item} 
                onClick={() => {
                  if (isMenuEditMode) {
                    handleOpenEditItem(menuTab, item);
                    return;
                  }
                  if (!customerName.trim()) {
                    alert("Silakan tulis nama pelanggan terlebih dahulu sebelum menambahkan menu.");
                    return;
                  }
                  handleOpenProduct(item, menuTab);
                }}
                className={`bg-white px-3 py-2.5 rounded-xl shadow-xs border flex items-center justify-between active:scale-95 transition-transform cursor-pointer hover:shadow-md h-full group ${
                  isMenuEditMode ? 'border-amber-300 bg-amber-50/20' : 'border-[#E0DCCF]'
                }`}
              >
                <span className="font-serif font-bold text-[#4E4E4E] text-xs leading-snug line-clamp-2 pr-2 flex-1">{item}</span>
                {isMenuEditMode ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditItem(menuTab, item);
                      }}
                      className="p-1 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer"
                      title="Ubah nama menu"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMenuItem(menuTab, item);
                      }}
                      className="p-1 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors cursor-pointer"
                      title="Hapus menu"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#F5F1E9] text-[#8A9A5B] w-6 h-6 rounded-full flex items-center justify-center shrink-0 group-hover:bg-[#8A9A5B] group-hover:text-white transition-colors">
                    <Plus size={14} strokeWidth={2.5} />
                  </div>
                )}
              </div>
            ))}

            {/* Tombol Card Tambah Item Baru di dalam Grid */}
            <div 
              onClick={() => handleOpenAddMenu(menuTab)}
              className="bg-[#F5F1E9]/40 hover:bg-[#F5F1E9] border-2 border-dashed border-[#8A9A5B]/40 px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer h-full min-h-[46px]"
              title="Tambah Menu Manual"
            >
              <Plus size={15} className="text-[#8A9A5B]" />
              <span className="font-semibold text-xs text-[#8A9A5B]">+ Tambah Item</span>
            </div>
          </div>

          {cart.length > 0 && (
            <div className="p-4 mt-6 border-t border-dashed border-[#E0DCCF]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif font-bold text-lg text-[#4E4E4E] truncate">
                  Pesanan: {customerName}
                </h3>
                <span className="text-xs bg-orange-100 text-[#C04000] font-bold px-2.5 py-1 rounded-full border border-[#C04000]/20 flex items-center gap-1">
                  <MapPin size={12} />
                  <span>{selectedLocation}</span>
                </span>
              </div>

              <div className="bg-white rounded-2xl shadow-xs border border-[#E0DCCF] overflow-hidden mb-5">
                {cart.map((item, idx) => (
                  <div key={item.id} className={`p-3 sm:p-4 flex items-center gap-3 ${idx !== cart.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif font-bold text-[#4E4E4E] leading-tight text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-gray-400 font-medium">{item.size}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1 shrink-0">
                      <button onClick={() => handleUpdateCartQty(item.id, -1)} className="p-1 rounded-full bg-white shadow-xs text-gray-600 active:bg-gray-200 cursor-pointer">
                        {item.qty === 1 ? <Trash2 size={15} className="text-red-500" /> : <Minus size={15} />}
                      </button>
                      <span className="w-5 text-center font-bold text-xs text-gray-700">{item.qty}</span>
                      <button onClick={() => handleUpdateCartQty(item.id, 1)} className="p-1 rounded-full bg-white shadow-xs text-[#8A9A5B] active:bg-[#F5F1E9] cursor-pointer">
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleCheckout}
                className="w-full bg-[#8A9A5B] text-white font-bold py-3.5 rounded-2xl shadow-md hover:bg-[#7a8950] active:scale-95 transition-all text-sm tracking-wide cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                <span>Simpan Pesanan ({cart.reduce((s, i) => s + i.qty, 0)} Item)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRekap = () => {
    const rekapData: Record<string, Record<string, number>> = {};
    const rekapWilayah: Record<string, { totalOrders: number; totalItems: number; items: Record<string, number> }> = {};
    
    history.forEach(order => {
      const loc = order.customerLocation || "Batulicin";
      if (!rekapWilayah[loc]) {
        rekapWilayah[loc] = { totalOrders: 0, totalItems: 0, items: {} };
      }
      rekapWilayah[loc].totalOrders += 1;
      rekapWilayah[loc].totalItems += order.totalItems;

      order.items.forEach(item => {
        const key = `${item.name} (${item.size})`;
        if (!rekapData[item.category]) rekapData[item.category] = {};
        rekapData[item.category][key] = (rekapData[item.category][key] || 0) + item.qty;

        rekapWilayah[loc].items[key] = (rekapWilayah[loc].items[key] || 0) + item.qty;
      });
    });

    const categoriesToDisplay = rekapFilter === 'ALL' || rekapFilter === 'WILAYAH'
      ? CATEGORY_ORDER 
      : [rekapFilter];

    const totalOrdersCount = history.length;
    const totalItemsCount = history.reduce((sum, o) => sum + o.totalItems, 0);

    return (
      <div className="flex flex-col h-full bg-[#FDFBF7] pb-24 animate-in fade-in slide-in-from-right-4 duration-200">
        <div className="p-4 bg-white shadow-xs border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList className="text-[#8A9A5B]" /> Rekap Transaksi
            </h2>
            <p className="text-[11px] text-gray-500">
              Total {totalOrdersCount} pesanan • {totalItemsCount} item terjual
            </p>
          </div>
          <button
            onClick={() => {
              setResetCode('');
              setResetError('');
              setResetSuccess(false);
              setIsResetModalOpen(true);
            }}
            className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 transition-all border border-red-200 cursor-pointer"
            title="Reset Semua Transaksi"
          >
            <RotateCcw size={13} />
            <span>Reset Data</span>
          </button>
        </div>

        {/* Menu Pilihan Rekap: Semua, Wilayah, Kategori */}
        <div className="flex px-4 py-2.5 gap-2 bg-[#FDFBF7] overflow-x-auto no-scrollbar border-b border-[#E0DCCF]/50">
          <button
            onClick={() => setRekapFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              rekapFilter === 'ALL'
                ? 'bg-[#8A9A5B] text-white shadow-xs'
                : 'bg-[#EAE7DC] text-[#4E4E4E] hover:bg-[#dedad0]'
            }`}
          >
            Semua Rekap
          </button>
          <button
            onClick={() => setRekapFilter('WILAYAH')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              rekapFilter === 'WILAYAH'
                ? 'bg-[#C04000] text-white shadow-xs'
                : 'bg-[#EAE7DC] text-[#4E4E4E] hover:bg-[#dedad0]'
            }`}
          >
            <MapPin size={12} />
            <span>Rekap per Wilayah</span>
          </button>
          {CATEGORY_ORDER.map(cat => (
            <button
              key={cat}
              onClick={() => setRekapFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                rekapFilter === cat
                  ? 'bg-[#8A9A5B] text-white shadow-xs'
                  : 'bg-[#EAE7DC] text-[#4E4E4E] hover:bg-[#dedad0]'
              }`}
            >
              {CATEGORY_CONFIG[cat].rekapLabel}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-12 space-y-6">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-gray-400 p-8 text-center min-h-[50vh]">
              <ClipboardList size={64} className="mb-4 opacity-50" />
              <p className="text-lg font-serif">Belum ada data untuk direkap.</p>
              <p className="text-xs text-gray-400 mt-1">Buat pesanan pertama melalui tab Menu.</p>
            </div>
          ) : rekapFilter === 'WILAYAH' ? (
            /* Rekap Berdasarkan Wilayah */
            <div className="space-y-4">
              {Object.keys(rekapWilayah).length === 0 ? (
                <p className="text-sm text-gray-400 italic">Belum ada data wilayah.</p>
              ) : (
                Object.entries(rekapWilayah).sort().map(([wilayah, data]) => (
                  <div key={wilayah} className="bg-white rounded-2xl p-4 border border-[#E0DCCF] shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#C04000] flex items-center justify-center font-bold text-xs">
                          <MapPin size={16} />
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-sm text-gray-800">{wilayah}</h4>
                          <span className="text-[11px] text-gray-500">{data.totalOrders} Pemesan</span>
                        </div>
                      </div>
                      <span className="bg-[#8A9A5B] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xs">
                        {data.totalItems} Item
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {Object.entries(data.items).sort().map(([itemKey, qty]) => (
                        <div key={itemKey} className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-[#FDFBF7]">
                          <span className="text-gray-700 font-medium">{itemKey}</span>
                          <span className="font-bold text-gray-800">{qty} Pcs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Rekap per Kategori Produk */
            categoriesToDisplay.map(cat => (
              <div key={cat} className="space-y-3">
                <h3 className="font-serif font-bold text-base text-[#8A9A5B] bg-[#F5F1E9] px-4 py-2 rounded-lg inline-block shadow-xs border border-[#8A9A5B]/20">
                  {CATEGORY_CONFIG[cat].rekapLabel}
                </h3>
                {!rekapData[cat] || Object.keys(rekapData[cat]).length === 0 ? (
                  <p className="text-sm text-gray-400 italic px-2">Tidak ada pesanan untuk kategori ini.</p>
                ) : (
                  <div className="grid gap-2">
                    {Object.entries(rekapData[cat]).sort().map(([name, qty]) => (
                      <div key={name} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-xs transition-transform active:scale-[0.98]">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#8A9A5B]" />
                          <span className="text-gray-700 font-medium text-sm">{name}</span>
                        </div>
                        <div className="bg-[#8A9A5B] text-white font-bold px-3 py-1 rounded-full text-xs shadow-xs shadow-[#8A9A5B]/20">
                          {qty} Pcs
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    const filteredHistory = history.filter(order => 
      order.customerName.toLowerCase().includes(historySearch.toLowerCase()) ||
      (order.customerLocation && order.customerLocation.toLowerCase().includes(historySearch.toLowerCase()))
    );

    return (
      <div className="flex flex-col h-full bg-[#FDFBF7] pb-24 animate-in fade-in slide-in-from-right-4 duration-200">
        <div className="p-4 bg-white shadow-xs mb-3 flex flex-col gap-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <HistoryIcon className="text-[#8A9A5B]" /> Riwayat Transaksi
            </h2>
            <button
              onClick={() => {
                setResetCode('');
                setResetError('');
                setResetSuccess(false);
                setIsResetModalOpen(true);
              }}
              className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 transition-all border border-red-200 cursor-pointer"
              title="Reset Semua Transaksi"
            >
              <Trash2 size={13} />
              <span>Reset Semua</span>
            </button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari nama pemesan atau wilayah..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-[#E0DCCF] rounded-xl focus:outline-none focus:border-[#8A9A5B] bg-[#FDFBF7] text-sm text-gray-700 font-medium placeholder-gray-400"
            />
            {historySearch && (
              <button 
                onClick={() => setHistorySearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {history.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <HistoryIcon size={64} className="mb-4 opacity-50" />
            <p className="text-lg font-serif">Belum ada riwayat pesanan.</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <Search size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-serif">Pesanan tidak ditemukan.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 space-y-3.5">
            {filteredHistory.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 relative group">
                <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-2.5">
                  <div>
                    <h3 className="font-serif font-bold text-base sm:text-lg text-[#4E4E4E]">{order.customerName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400">{order.date}</span>
                      {order.customerLocation && (
                        <span className="text-[10px] bg-orange-50 text-[#C04000] font-semibold px-2 py-0.5 rounded-md border border-[#C04000]/20 flex items-center gap-0.5">
                          <MapPin size={10} />
                          <span>{order.customerLocation}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#F5F1E9] text-[#8A9A5B] text-[10px] uppercase font-bold px-2 py-1 rounded-md">
                      {order.totalItems} Item
                    </div>
                    <button 
                      onClick={() => handleEditOrder(order.id)}
                      className="p-1.5 bg-gray-100 text-gray-500 rounded-md hover:bg-[#8A9A5B] hover:text-white transition-colors cursor-pointer"
                      title="Edit Pesanan"
                    >
                      <Edit2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600 flex items-center gap-1 font-medium">
                        <ChevronRight size={13} className="text-[#8A9A5B]" />
                        {item.name} <span className="text-gray-400">({item.size})</span>
                      </span>
                      <span className="font-bold text-[#4E4E4E]">x{item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto h-[100dvh] bg-[#FDFBF7] flex flex-col relative sm:shadow-2xl sm:border-x border-[#E0DCCF] overflow-hidden font-sans">
      {/* PWA Install Banner */}
      <PWAInstallBanner />

      {/* Header */}
      <header className="bg-[#8A9A5B] text-white px-5 py-3.5 shadow-md flex justify-between items-center z-20 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold italic tracking-wide" style={{ fontFamily: "serif" }}>
            Dapur mama RaraLita
          </h1>
          <p className="text-[10px] opacity-90 uppercase tracking-widest mt-0.5">Cita Rasa Rumah di Setiap Gigitan</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tombol Instal Aplikasi di Header (Otomatis Sembunyi di Mode Standalone) */}
          {!isStandalone && (
            <button
              onClick={() => {
                const p = (window as any).__pwaDeferredPrompt;
                if (p) {
                  p.prompt().then((choice: any) => {
                    if (choice && choice.outcome === 'accepted') {
                      setIsStandalone(true);
                    }
                  });
                } else {
                  restorePWABanner();
                }
              }}
              className="bg-white/20 hover:bg-white/30 text-white active:scale-95 text-xs font-bold px-2.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer border border-white/25"
              title="Pasang / Instal Aplikasi"
            >
              <Download size={14} />
              <span className="text-[11px]">Instal</span>
            </button>
          )}

          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold block leading-tight">{currentUser.name}</span>
            <span className="text-[10px] text-white/80">@{currentUser.username}</span>
          </div>
          <button
            onClick={() => setActiveTab('PENGATURAN')}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'PENGATURAN'
                ? 'bg-white text-[#8A9A5B] shadow-sm'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            title="Pengaturan Admin"
          >
            <ShieldCheck size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'MENU' && renderMenu()}
        {activeTab === 'HISTORY' && renderHistory()}
        {activeTab === 'REKAP' && renderRekap()}
        {activeTab === 'PENGATURAN' && (
          <PengaturanAdmin
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenResetModal={() => {
              setResetCode('');
              setResetError('');
              setResetSuccess(false);
              setIsResetModalOpen(true);
            }}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
            totalLocations={locations.length}
          />
        )}
      </main>

      {/* Bottom Modal for Variant Selection */}
      {selectedProduct && (
        <>
          <div 
            className="absolute inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
            onClick={() => setSelectedProduct(null)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 animate-in slide-in-from-bottom-full duration-300 pb-safe">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {CATEGORY_CONFIG[selectedProduct.category].label}
                </span>
                <h3 className="font-bold text-lg sm:text-xl text-gray-800 font-serif">{selectedProduct.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="p-2 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 sm:p-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Pilih Ukuran</h4>
              <div className="flex flex-wrap gap-2 mb-5">
                {(CATEGORY_CONFIG[selectedProduct.category]?.sizes || ["1 Pcs"]).map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 border rounded-full font-medium transition-all text-xs sm:text-sm cursor-pointer ${
                      selectedSize === size 
                        ? 'border-[#8A9A5B] bg-[#8A9A5B] text-white shadow-xs' 
                        : 'border-[#E0DCCF] text-[#4E4E4E] hover:bg-[#F5F1E9]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Jumlah</h4>
              <div className="flex items-center gap-5 mb-6">
                <button 
                  onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))}
                  className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors cursor-pointer"
                >
                  <Minus size={22} />
                </button>
                <span className="text-2xl sm:text-3xl font-bold w-12 text-center text-gray-800">{selectedQty}</span>
                <button 
                  onClick={() => setSelectedQty(selectedQty + 1)}
                  className="w-11 h-11 rounded-2xl bg-[#F5F1E9] flex items-center justify-center text-[#8A9A5B] active:bg-[#EAE7DC] transition-colors cursor-pointer"
                >
                  <Plus size={22} />
                </button>
              </div>

              <button 
                onClick={handleAddToCart}
                className="w-full bg-[#C04000] hover:bg-[#a63700] text-white font-bold text-base py-3.5 rounded-2xl shadow-lg shadow-orange-900/20 active:scale-95 transition-all cursor-pointer"
              >
                Tambah ke Pesanan
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Edit / Ubah Nama Menu Item */}
      {isEditMenuModalOpen && itemToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsEditMenuModalOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-hidden z-10 animate-in zoom-in-95 duration-200 border border-[#E0DCCF]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                  <Edit2 size={16} />
                </div>
                <h3 className="font-serif font-bold text-lg text-gray-800">
                  Ubah Menu
                </h3>
              </div>
              <button 
                onClick={() => setIsEditMenuModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-xs text-gray-600 bg-[#F5F1E9] p-2.5 rounded-xl border border-[#E0DCCF]">
                Kategori: <strong>{CATEGORY_CONFIG[itemToEdit.category].label}</strong>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1.5">
                  Nama Menu
                </label>
                <input
                  type="text"
                  value={itemToEdit.newName}
                  onChange={(e) => setItemToEdit({ ...itemToEdit, newName: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEditItem();
                  }}
                  autoFocus
                  placeholder="Ketik nama menu..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0DCCF] focus:outline-none focus:border-[#8A9A5B] bg-[#FDFBF7] text-sm font-semibold text-gray-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDeleteItemFromEditModal}
                  className="py-2.5 px-3 rounded-xl border border-red-200 bg-red-50 text-red-600 font-semibold text-xs hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Hapus menu ini"
                >
                  <Trash2 size={14} />
                  <span>Hapus</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditMenuModalOpen(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-[#E0DCCF] text-gray-600 font-semibold text-xs hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditItem}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#8A9A5B] text-white font-semibold text-xs hover:bg-[#7a8950] active:scale-95 transition-all shadow-md shadow-[#8A9A5B]/20 cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Menu Manual */}
      {isAddMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsAddMenuModalOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-hidden z-10 animate-in zoom-in-95 duration-200 border border-[#E0DCCF] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="font-serif font-bold text-lg text-gray-800">
                Tambah Menu Manual
              </h3>
              <button 
                onClick={() => setIsAddMenuModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              {/* Pilihan Kategori */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1.5">
                  Pilih Kategori Menu
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORY_ORDER.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTargetAddCategory(cat)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                        targetAddCategory === cat
                          ? 'border-[#8A9A5B] bg-[#8A9A5B] text-white shadow-xs'
                          : 'border-[#E0DCCF] text-gray-700 bg-[#FDFBF7] hover:bg-[#F5F1E9]'
                      }`}
                    >
                      {CATEGORY_CONFIG[cat].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Nama Menu */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1.5">
                  Nama Menu Baru
                </label>
                <input
                  type="text"
                  value={newMenuName}
                  onChange={(e) => setNewMenuName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNewMenu();
                  }}
                  placeholder="Contoh: Roti Coklat Keju, Bolu Tape..."
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0DCCF] focus:outline-none focus:border-[#8A9A5B] bg-[#FDFBF7] text-sm font-semibold text-gray-800"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveNewMenu}
                className="w-full py-3 px-4 rounded-xl bg-[#8A9A5B] text-white font-semibold text-sm hover:bg-[#7a8950] active:scale-95 transition-all shadow-md shadow-[#8A9A5B]/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Simpan Menu ke {CATEGORY_CONFIG[targetAddCategory].label}</span>
              </button>

              {/* Daftar item yang sudah ada di kategori ini */}
              <div className="pt-2 border-t border-[#E0DCCF]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                    Daftar {CATEGORY_CONFIG[targetAddCategory].label}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {(menuItems[targetAddCategory] || []).length} item
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {(menuItems[targetAddCategory] || []).map(item => (
                    <div 
                      key={item}
                      className="flex items-center justify-between bg-[#FDFBF7] border border-[#E0DCCF] px-3 py-1.5 rounded-lg text-xs"
                    >
                      <span className="font-medium text-gray-700 flex-1 truncate pr-2">{item}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddMenuModalOpen(false);
                            handleOpenEditItem(targetAddCategory, item);
                          }}
                          className="text-gray-500 hover:text-[#8A9A5B] p-1 rounded-md transition-colors cursor-pointer"
                          title={`Ubah nama ${item}`}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMenuItem(targetAddCategory, item)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
                          title={`Hapus ${item}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kelola Wilayah Pemesan */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsLocationModalOpen(false)}
          />
          <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#E0DCCF] z-10 animate-in zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#C04000] flex items-center justify-center">
                  <MapPin size={16} />
                </div>
                <h3 className="font-serif font-bold text-base text-gray-800">
                  Kelola Wilayah Pemesan
                </h3>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full bg-gray-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3 shrink-0">
              Daftar wilayah ini akan muncul sebagai opsi saat mencatat pesanan pelanggan.
            </p>

            {/* Input Tambah Wilayah */}
            <div className="flex gap-2 mb-3 shrink-0">
              <input
                type="text"
                value={newLocationInput}
                onChange={e => setNewLocationInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddNewLocation();
                }}
                placeholder="Nama wilayah baru..."
                className="flex-1 px-3 py-2 bg-[#FDFBF7] border border-[#E0DCCF] rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#8A9A5B]"
              />
              <button
                onClick={handleAddNewLocation}
                className="px-3.5 py-2 bg-[#8A9A5B] hover:bg-[#7a8950] active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Tambah
              </button>
            </div>

            {/* List Wilayah */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {locations.map(loc => (
                <div 
                  key={loc}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    selectedLocation === loc
                      ? 'border-[#C04000] bg-orange-50/50 text-[#C04000]'
                      : 'border-[#E0DCCF] bg-[#FDFBF7] text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className={selectedLocation === loc ? 'text-[#C04000]' : 'text-gray-400'} />
                    <span>{loc}</span>
                    {selectedLocation === loc && (
                      <span className="text-[10px] bg-orange-200/80 text-orange-900 px-1.5 py-0.2 rounded font-bold">
                        Aktif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {selectedLocation !== loc && (
                      <button
                        onClick={() => setSelectedLocation(loc)}
                        className="text-[11px] text-[#8A9A5B] hover:underline font-bold px-1.5 py-0.5 cursor-pointer"
                      >
                        Pilih
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteLocation(loc)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                      title={`Hapus ${loc}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsLocationModalOpen(false)}
              className="w-full mt-3 py-2.5 bg-[#8A9A5B] text-white font-semibold text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* Modal Reset Semua Transaksi */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => {
              if (!isResetting) setIsResetModalOpen(false);
            }}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-hidden z-10 animate-in zoom-in-95 duration-200 border border-[#E0DCCF]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 text-red-600 font-serif font-bold text-lg">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <span>Reset Transaksi</span>
              </div>
              <button 
                disabled={isResetting}
                onClick={() => setIsResetModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {resetSuccess ? (
              <div className="py-6 flex flex-col items-center justify-center text-center animate-in zoom-in duration-200">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="font-bold text-gray-800 text-lg">Berhasil Direset!</h3>
                <p className="text-sm text-gray-500 mt-1">Semua data transaksi telah dihapus bersih.</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-600 leading-relaxed mb-4 bg-red-50 p-3 rounded-xl border border-red-100">
                  <strong>Peringatan:</strong> Seluruh riwayat transaksi dan rekap akan dihapus permanen dari aplikasi dan database Supabase.
                </p>

                <div className="mb-4">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1.5">
                    Masukkan Kode Verifikasi
                  </label>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => {
                      setResetCode(e.target.value);
                      if (resetError) setResetError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleResetAllOrders();
                    }}
                    placeholder="Ketik 'dayatlagi'..."
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0DCCF] focus:outline-none focus:border-red-500 bg-[#FDFBF7] text-sm font-mono tracking-wider font-semibold text-gray-800"
                  />
                  {resetError && (
                    <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                      <span>•</span> {resetError}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isResetting}
                    onClick={() => setIsResetModalOpen(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-[#E0DCCF] text-gray-600 font-semibold text-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isResetting || !resetCode.trim()}
                    onClick={handleResetAllOrders}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isResetting ? (
                      <span>Mereset...</span>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        <span>Hapus Semua</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-[#E0DCCF] px-4 py-2.5 shrink-0 flex justify-around items-center pb-safe text-[10px] font-medium relative z-30 shadow-lg">
        <button 
          onClick={() => setActiveTab('MENU')} 
          className={`flex flex-col items-center gap-1 w-14 transition-colors cursor-pointer ${activeTab === 'MENU' ? 'text-[#8A9A5B] font-bold' : 'text-gray-400 hover:text-[#4E4E4E]'}`}
        >
          <Store size={22} strokeWidth={activeTab === 'MENU' ? 2.5 : 2} />
          <span>Menu</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('HISTORY')} 
          className={`flex flex-col items-center gap-1 w-14 transition-colors cursor-pointer ${activeTab === 'HISTORY' ? 'text-[#8A9A5B] font-bold' : 'text-gray-400 hover:text-[#4E4E4E]'}`}
        >
          <HistoryIcon size={22} strokeWidth={activeTab === 'HISTORY' ? 2.5 : 2} />
          <span>Riwayat</span>
        </button>

        <button 
          onClick={() => setActiveTab('REKAP')} 
          className={`flex flex-col items-center gap-1 w-14 transition-colors cursor-pointer ${activeTab === 'REKAP' ? 'text-[#8A9A5B] font-bold' : 'text-gray-400 hover:text-[#4E4E4E]'}`}
        >
          <ClipboardList size={22} strokeWidth={activeTab === 'REKAP' ? 2.5 : 2} />
          <span>Rekap</span>
        </button>

        <button 
          onClick={() => setActiveTab('PENGATURAN')} 
          className={`flex flex-col items-center gap-1 w-14 transition-colors cursor-pointer ${activeTab === 'PENGATURAN' ? 'text-[#8A9A5B] font-bold' : 'text-gray-400 hover:text-[#4E4E4E]'}`}
        >
          <ShieldCheck size={22} strokeWidth={activeTab === 'PENGATURAN' ? 2.5 : 2} />
          <span>Admin</span>
        </button>
      </nav>

      {/* CSS safe area utilities padding for modern mobile browsers */}
      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>
    </div>
  );
}
