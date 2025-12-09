
// Role is now a string to support dynamic roles, but we keep the enum values as constants/defaults
export enum RoleType { // Renamed to avoid conflict if we use 'Role' as interface
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'BRANCH_MANAGER', // Renamed from ADMIN to align with new system
  CASHIER = 'CASHIER'
}

// Deprecate Role enum usage in favor of string, but keep for backward compat in some places temporarily
export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN', // Keeping 'ADMIN' string for existing data compatibility until migrated
  BRANCH_MANAGER: 'BRANCH_MANAGER',
  CASHIER: 'CASHIER'
};

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

export interface UserRole {
  id: string;
  name: string;
  description?: string;
  isSystemDefined: boolean;
  permissions: string[]; // List of permission names
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

export interface AccessRules {
  allowedIPs?: string;
  allowedDevices?: string;
  allowedRegions?: string;
  allowedOS?: string;
}

export interface User {
  id: string;
  name: string;
  role: string; // Changed from enum to string for dynamic roles
  username: string;
  password?: string; // In a real app, this would be hashed
  active: boolean;
  storeId?: string; // Links to Branch ID
  expenseLimit?: number; // Maximum amount they can request
  accessRules?: AccessRules;
}

export interface Category {
  id: string;
  name: string;
  storeId?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
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
  categoryId?: string;
  categoryName?: string;
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
  logoUrl?: string;
  security?: AccessRules;
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
