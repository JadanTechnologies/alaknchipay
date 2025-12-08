
import { User, Product, Transaction, Role, StoreSettings, Branch, Category, ActivityLog, Expense, ExpenseCategory } from '../types';

const DEFAULT_BRANCHES: Branch[] = [
  { id: 'store1', name: 'Lagos Island Branch', address: '123 Marina, Lagos', phone: '080-1234-5678' },
  { id: 'store2', name: 'Abuja Central Branch', address: '456 Wuse II, Abuja', phone: '080-8765-4321' },
];

// Initial Seed Data
const DEFAULT_USERS: User[] = [
  { id: 'u1', name: 'Super Admin', username: 'super', role: Role.SUPER_ADMIN, active: true },
  { id: 'u2', name: 'Musa Yaradua', username: 'admin', role: Role.ADMIN, active: true, storeId: 'store1', expenseLimit: 50000 },
  { id: 'u3', name: 'Nneka Okeke', username: 'cashier', role: Role.CASHIER, active: true, storeId: 'store1', expenseLimit: 10000 },
  { id: 'u4', name: 'Emeka Obi', username: 'manager2', role: Role.ADMIN, active: true, storeId: 'store2', expenseLimit: 50000 },
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat1', name: 'Electronics' },
  { id: 'cat2', name: 'Accessories' },
  { id: 'cat3', name: 'Groceries' },
  { id: 'cat4', name: 'Clothing' },
];

const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'expcat1', name: 'Utilities', description: 'Electricity, Water, Internet' },
  { id: 'expcat2', name: 'Supplies', description: 'Office supplies, cleaning materials' },
  { id: 'expcat3', name: 'Maintenance', description: 'Repairs and equipment servicing' },
  { id: 'expcat4', name: 'Transportation', description: 'Fuel, logistics, travel' },
  { id: 'expcat5', name: 'Miscellaneous', description: 'Other expenses' },
];

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', sku: 'SKU001', name: 'Wireless Mouse', category: 'Electronics', costPrice: 5000, sellingPrice: 8500, stock: 45, minStockAlert: 10, storeId: 'store1', updatedAt: new Date().toISOString() },
  { id: 'p2', sku: 'SKU002', name: 'Mechanical Keyboard', category: 'Electronics', costPrice: 15000, sellingPrice: 28000, stock: 12, minStockAlert: 5, storeId: 'store1', updatedAt: new Date().toISOString() },
  { id: 'p3', sku: 'SKU003', name: 'USB-C Cable', category: 'Accessories', costPrice: 1500, sellingPrice: 3500, stock: 100, minStockAlert: 20, storeId: 'store1', updatedAt: new Date().toISOString() },
  { id: 'p4', sku: 'SKU004', name: 'Monitor 27"', category: 'Electronics', costPrice: 85000, sellingPrice: 120000, stock: 3, minStockAlert: 5, storeId: 'store1', updatedAt: new Date().toISOString() },
  { id: 'p5', sku: 'SKU005', name: 'Laptop Stand', category: 'Accessories', costPrice: 6000, sellingPrice: 12500, stock: 25, minStockAlert: 5, storeId: 'store2', updatedAt: new Date().toISOString() },
];

const DEFAULT_SETTINGS: StoreSettings = {
  name: 'AlkanchiPay POS',
  currency: '₦',
  address: 'Headquarters, Lagos, Nigeria'
};

const KEYS = {
  USERS: 'alkanchi_users',
  PRODUCTS: 'alkanchi_products',
  TRANSACTIONS: 'alkanchi_transactions',
  SETTINGS: 'alkanchi_settings',
  BRANCHES: 'alkanchi_branches',
  CATEGORIES: 'alkanchi_categories',
  EXPENSE_CATEGORIES: 'alkanchi_expense_categories',
  LOGS: 'alkanchi_logs',
  EXPENSES: 'alkanchi_expenses'
};

export const storage = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(KEYS.USERS);
    return data ? JSON.parse(data) : DEFAULT_USERS;
  },
  saveUsers: (users: User[]) => localStorage.setItem(KEYS.USERS, JSON.stringify(users)),

  getProducts: (): Product[] => {
    const data = localStorage.getItem(KEYS.PRODUCTS);
    return data ? JSON.parse(data) : DEFAULT_PRODUCTS;
  },
  saveProducts: (products: Product[]) => localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products)),

  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },
  saveTransactions: (txs: Transaction[]) => localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs)),

  getSettings: (): StoreSettings => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  },
  saveSettings: (settings: StoreSettings) => localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings)),
  
  getBranches: (): Branch[] => {
    const data = localStorage.getItem(KEYS.BRANCHES);
    return data ? JSON.parse(data) : DEFAULT_BRANCHES;
  },
  saveBranches: (branches: Branch[]) => localStorage.setItem(KEYS.BRANCHES, JSON.stringify(branches)),

  getCategories: (): Category[] => {
    const data = localStorage.getItem(KEYS.CATEGORIES);
    return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
  },
  saveCategories: (categories: Category[]) => localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories)),

  getExpenseCategories: (): ExpenseCategory[] => {
    const data = localStorage.getItem(KEYS.EXPENSE_CATEGORIES);
    return data ? JSON.parse(data) : DEFAULT_EXPENSE_CATEGORIES;
  },
  saveExpenseCategories: (categories: ExpenseCategory[]) => localStorage.setItem(KEYS.EXPENSE_CATEGORIES, JSON.stringify(categories)),

  getLogs: (): ActivityLog[] => {
    const data = localStorage.getItem(KEYS.LOGS);
    return data ? JSON.parse(data) : [];
  },
  saveLogs: (logs: ActivityLog[]) => localStorage.setItem(KEYS.LOGS, JSON.stringify(logs)),

  getExpenses: (): Expense[] => {
    const data = localStorage.getItem(KEYS.EXPENSES);
    return data ? JSON.parse(data) : [];
  },
  saveExpenses: (expenses: Expense[]) => localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses)),

  reset: () => {
    localStorage.clear();
    window.location.reload();
  }
};
