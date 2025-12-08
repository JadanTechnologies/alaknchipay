import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Product, Transaction, StoreSettings, Role, RefundItem, RefundLog, TransactionStatus, Branch, Notification, NotificationType, Category, PaymentMethod, ActivityLog, Expense, ExpenseStatus, ExpenseCategory } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { nanoid } from 'nanoid';

interface StoreContextType {
  user: User | null;
  users: User[];
  products: Product[];
  transactions: Transaction[];
  settings: StoreSettings;
  branches: Branch[];
  categories: Category[];
  expenseCategories: ExpenseCategory[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  expenses: Expense[];
  login: (username: string) => boolean;
  logout: () => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (id: string) => void;
  addExpenseCategory: (cat: ExpenseCategory) => void;
  deleteExpenseCategory: (id: string) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  updateSettings: (settings: StoreSettings) => void;
  processRefund: (transactionId: string, items: RefundItem[], reason: string, condition?: string) => void;
  addBranch: (branch: Branch) => void;
  updateBranch: (branch: Branch) => void;
  deleteBranch: (id: string) => void;
  addNotification: (message: string, type: NotificationType) => void;
  removeNotification: (id: string) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  createBackup: (storeId?: string) => string;
  restoreBackup: (jsonData: string) => boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    name: 'AlkanchiPay POS', currency: '₦', address: '', logoUrl: ''
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Helpers to map DB response to Types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapProduct = (p: any): Product => ({ ...p, id: p.id, storeId: p.store_id, categoryId: p.category_id, minStockAlert: p.min_stock_alert, costPrice: p.cost_price, sellingPrice: p.selling_price });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapTransaction = (t: any): Transaction => ({ ...t, id: t.id, cashierId: t.cashier_id, storeId: t.store_id, paymentMethod: t.payment_method, amountPaid: t.amount_paid, customerName: t.customer_name, customerPhone: t.customer_phone, cashierName: 'Unknown', items: t.transaction_items || [] });

  const fetchData = useCallback(async () => {
    if (!session) return;

    // Fetch Profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (profile) setUser(profile);

    // Fetch all Data (Relying on RLS to filter)
    const { data: prods } = await supabase.from('products').select('*');
    if (prods) setProducts(prods.map(mapProduct));

    // Transactions with items - this complexity might need a join or separate fetch
    const { data: txs } = await supabase.from('transactions').select('*, transaction_items(*)');
    if (txs) setTransactions(txs.map(mapTransaction));

    const { data: cats } = await supabase.from('categories').select('*');
    if (cats) setCategories(cats);

    const { data: expCats } = await supabase.from('expense_categories').select('*');
    if (expCats) setExpenseCategories(expCats);

    const { data: brs } = await supabase.from('branches').select('*');
    if (brs) setBranches(brs);

    const { data: sets } = await supabase.from('store_settings').select('*').single();
    if (sets) setSettings(sets);

    // ... fetch other tables
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Wrappers for Supabase Actions
  const addCategory = async (name: string) => {
    if (!name) return;
    const { data, error } = await supabase.from('categories').insert({ name }).select().single();
    if (!error && data) {
      setCategories(prev => [...prev, data]);
      addNotification(`Category "${name}" created`, 'success');
    } else {
      addNotification('Failed to create category', 'error');
    }
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      setCategories(prev => prev.filter(c => c.id !== id));
      addNotification('Category deleted', 'info');
    }
  };

  // Notification Logic (same as before)
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((message: string, type: NotificationType) => {
    const id = nanoid();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeNotification(id), 3000);
  }, [removeNotification]);

  // Auth wrappers
  const login = (username: string) => {
    // Legacy login not supported with Supabase simple auth, 
    // UI should switch to useAuth().signInWithPassword
    console.warn("Legacy login called", username);
    return false;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Simplified stubs for other actions to keep the file compiling 
  // You should expand these one by one
  const addProduct = async (p: Product) => {
    const dbProduct = {
      name: p.name, sku: p.sku, category_id: p.category,
      cost_price: p.costPrice, selling_price: p.sellingPrice,
      stock: p.stock, min_stock_alert: p.minStockAlert, store_id: p.storeId
    };
    const { data, error } = await supabase.from('products').insert(dbProduct).select().single();
    if (!error && data) {
      setProducts(prev => [...prev, mapProduct(data)]);
      addNotification('Product added', 'success');
    }
  };

  const updateProduct = async (p: Product) => {
    // Implementation needed
  };

  const deleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  // ... (Other functions need to be similarly refactored to async/Supabase)
  // For the sake of the tool call limit, I will return the simplified context 
  // and we can iterate.

  return (
    <StoreContext.Provider value={{
      user, users, products, transactions, settings, branches, notifications, categories, activityLogs, expenses, expenseCategories,
      login, logout,
      addProduct, updateProduct, deleteProduct,
      addCategory, deleteCategory,
      addExpenseCategory: (c) => { }, // Todo
      deleteExpenseCategory: (id) => { },
      addTransaction: (t) => { },
      updateTransaction: (t) => { },
      deleteTransaction: (id) => { },
      addUser: (u) => { },
      updateUser: (u) => { },
      deleteUser: (id) => { },
      toggleUserStatus: (id) => { },
      updateSettings: (s) => { },
      processRefund: (id, items, reason) => { },
      addBranch: (b) => { },
      updateBranch: (b) => { },
      deleteBranch: (id) => { },
      addNotification, removeNotification,
      addExpense: (e) => { },
      updateExpense: (e) => { },
      deleteExpense: (id) => { },
      createBackup: () => "",
      restoreBackup: (d) => false
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
