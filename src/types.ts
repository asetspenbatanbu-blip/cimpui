export type Category = 'ROTI_PIZZA' | 'BOLU' | 'KUE' | 'GORENGAN';
export type AppTab = 'MENU' | 'HISTORY' | 'REKAP' | 'PENGATURAN';
export type RekapFilter = 'ALL' | 'NAMA' | 'WILAYAH' | Category;
export type OrderStatus = 'PROSES' | 'SELESAI';

export interface CartItem {
  id: string;
  name: string;
  category: Category;
  size: string;
  qty: number;
}

export interface Order {
  id: string;
  date: string;
  customerName: string;
  customerLocation: string;
  adminUsername?: string;
  status?: OrderStatus;
  items: CartItem[];
  totalItems: number;
}

export interface AdminUser {
  username: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  password?: string;
  createdAt?: string;
}
