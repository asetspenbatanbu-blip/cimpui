export type Category = 'ROTI_PIZZA' | 'BOLU' | 'KUE' | 'GORENGAN';
export type AppTab = 'MENU' | 'HISTORY' | 'REKAP' | 'PENGATURAN';
export type RekapFilter = 'ALL' | 'WILAYAH' | Category;

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
