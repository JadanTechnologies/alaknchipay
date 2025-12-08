
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER'
}

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  POS = 'POS',
  WALLET = 'WALLET',
  CREDIT = 'CREDIT',
  DEPOSIT = 'DEPOSIT',
  SPLIT = 'SPLIT'
}

export enum TransactionStatus {
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  REFUNDED = 'REFUNDED',
  PENDING = 'PENDING',
  HELD = 'HELD'
}

export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  managerId?: string; // ID of the Admin/User managing this branch
}

export interface User {
  id: string;
  name: string;
  role: Role;
  username: string;
  password?: string; // In a real app, this would be hashed
  active: boolean;
  storeId?: string; // Links to Branch ID
}

export interface Category {
  id: string;
  name: string;
  storeId?: string; 
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStockAlert: number;
  expiryDate?: string;
  storeId?: string;
  updatedAt?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface RefundItem {
  itemId: string;
  quantity: number;
}

export interface RefundLog {
  id: string;
  date: string;
  reason: string;
  condition?: string; // e.g., Resellable, Damaged
  amount: number;
  items: RefundItem[];
  processedBy: string;
}

export interface PaymentPart {
  method: PaymentMethod;
  amount: number;
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  cashierId: string;
  cashierName: string;
  storeId?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  paymentMethod: PaymentMethod; // Primary method or SPLIT
  payments: PaymentPart[]; // Detailed breakdown
  status: TransactionStatus;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  refunds?: RefundLog[];
  dueDate?: string; // For credit/partial sales
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  status: ExpenseStatus;
  requestedBy: string; // User ID
  requestedByName: string;
  storeId?: string;
  date: string;
  approvedBy?: string; // User ID of admin who approved
}

export interface StoreSettings {
  name: string;
  currency: string;
  address: string;
  phone?: string;
}

export interface AnalyticsData {
  totalRevenue: number;
  totalTransactions: number;
  lowStockCount: number;
  topSellingProduct: string;
}

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

export interface ActivityLog {
  id: string;
  action: string; // e.g., "USER_CREATED", "SETTINGS_UPDATED"
  details: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
}
