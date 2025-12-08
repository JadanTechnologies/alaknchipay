
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Product, Transaction, StoreSettings, Role, RefundItem, RefundLog, TransactionStatus, Branch, Notification, NotificationType, Category, PaymentMethod, ActivityLog, Expense, ExpenseStatus } from '../types';
import { storage } from '../services/storage';
import { nanoid } from 'nanoid';

interface StoreContextType {
  user: User | null;
  users: User[];
  products: Product[];
  transactions: Transaction[];
  settings: StoreSettings;
  branches: Branch[];
  categories: Category[];
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
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
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
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(storage.getSettings());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load data on mount
  useEffect(() => {
    setUsers(storage.getUsers());
    setProducts(storage.getProducts());
    setTransactions(storage.getTransactions());
    setBranches(storage.getBranches());
    setCategories(storage.getCategories());
    setActivityLogs(storage.getLogs());
    setExpenses(storage.getExpenses());
    const savedUser = localStorage.getItem('alkanchi_currentUser');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // Persistence effects
  useEffect(() => storage.saveUsers(users), [users]);
  useEffect(() => storage.saveProducts(products), [products]);
  useEffect(() => storage.saveTransactions(transactions), [transactions]);
  useEffect(() => storage.saveSettings(settings), [settings]);
  useEffect(() => storage.saveBranches(branches), [branches]);
  useEffect(() => storage.saveCategories(categories), [categories]);
  useEffect(() => storage.saveLogs(activityLogs), [activityLogs]);
  useEffect(() => storage.saveExpenses(expenses), [expenses]);
  useEffect(() => {
    if (user) localStorage.setItem('alkanchi_currentUser', JSON.stringify(user));
    else localStorage.removeItem('alkanchi_currentUser');
  }, [user]);

  // Activity Logger
  const logSystemAction = (action: string, details: string) => {
    if (!user) return;
    const log: ActivityLog = {
      id: nanoid(),
      action,
      details,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      timestamp: new Date().toISOString()
    };
    setActivityLogs(prev => [log, ...prev]);
  };

  // Notification Logic
  const addNotification = (message: string, type: NotificationType) => {
    const id = nanoid();
    setNotifications(prev => [...prev, { id, message, type }]);
    const duration = (type === 'warning' || type === 'error') ? 6000 : 3000;
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const login = (username: string) => {
    const foundUser = users.find(u => u.username === username && u.active);
    if (foundUser) {
      setUser(foundUser);
      addNotification(`Welcome back, ${foundUser.name}`, 'success');
      return true;
    }
    return false;
  };

  const logout = () => {
    addNotification('Logged out successfully', 'info');
    setUser(null);
  };

  const addCategory = (name: string) => {
    const newCat = { id: nanoid(), name };
    setCategories([...categories, newCat]);
    addNotification(`Category "${name}" created`, 'success');
    logSystemAction('CATEGORY_CREATED', `Created category: ${name}`);
  };

  const deleteCategory = (id: string) => {
    const cat = categories.find(c => c.id === id);
    setCategories(categories.filter(c => c.id !== id));
    addNotification('Category deleted', 'info');
    logSystemAction('CATEGORY_DELETED', `Deleted category: ${cat?.name || id}`);
  };

  const addProduct = (p: Product) => {
    const pWithDate = { ...p, updatedAt: new Date().toISOString() };
    setProducts([...products, pWithDate]);
    addNotification(`Product "${p.name}" added successfully`, 'success');
    logSystemAction('PRODUCT_CREATED', `Added product: ${p.name} (${p.sku})`);
  };

  const updateProduct = (p: Product) => {
    const pWithDate = { ...p, updatedAt: new Date().toISOString() };
    setProducts(products.map(prod => prod.id === p.id ? pWithDate : prod));
    if (p.stock <= p.minStockAlert) {
        addNotification(`Product "${p.name}" updated. Warning: Low Stock Level!`, 'warning');
    } else {
        addNotification(`Product "${p.name}" updated successfully`, 'success');
    }
    logSystemAction('PRODUCT_UPDATED', `Updated product: ${p.name} (${p.sku})`);
  };

  const deleteProduct = (id: string) => {
    const prod = products.find(p => p.id === id);
    setProducts(products.filter(p => p.id !== id));
    addNotification('Product deleted from inventory', 'info');
    logSystemAction('PRODUCT_DELETED', `Deleted product: ${prod?.name || id}`);
  };

  const addTransaction = (t: Transaction) => {
    setTransactions(prev => [t, ...prev]);
    
    // Only deduct stock if it's NOT a HELD transaction
    if (t.status !== TransactionStatus.HELD) {
        const lowStockAlerts: string[] = [];
        const newProducts = products.map(p => {
          const soldItem = t.items.find(i => i.id === p.id);
          if (soldItem) {
            const newStock = p.stock - soldItem.quantity;
            if (newStock <= p.minStockAlert) {
                lowStockAlerts.push(p.name);
            }
            return { ...p, stock: newStock, updatedAt: new Date().toISOString() };
          }
          return p;
        });
        setProducts(newProducts);
        
        if (lowStockAlerts.length > 0) {
            const itemNames = lowStockAlerts.join(', ');
            addNotification(`Low Stock Warning: ${itemNames} fell below threshold!`, 'warning');
        }
        addNotification('Transaction completed successfully', 'success');
    } else {
        addNotification('Invoice held successfully', 'info');
    }
  };

  const updateTransaction = (t: Transaction) => {
      setTransactions(prev => prev.map(tr => tr.id === t.id ? t : tr));
      addNotification('Transaction updated successfully', 'success');
      logSystemAction('TRANSACTION_UPDATED', `Updated transaction ${t.id} - Status: ${t.status}, Paid: ${t.amountPaid}`);
  }
  
  const deleteTransaction = (id: string) => {
      setTransactions(prev => prev.filter(t => t.id !== id));
      addNotification('Transaction removed', 'info');
      logSystemAction('TRANSACTION_DELETED', `Deleted transaction ${id}`);
  }

  const processRefund = (transactionId: string, refundItems: RefundItem[], reason: string, condition?: string) => {
    if (!user) return;

    const transactionIndex = transactions.findIndex(t => t.id === transactionId);
    if (transactionIndex === -1) {
        addNotification('Transaction not found', 'error');
        return;
    }
    const transaction = transactions[transactionIndex];

    let refundAmount = 0;
    
    refundItems.forEach(ri => {
      const originalItem = transaction.items.find(i => i.id === ri.itemId);
      if (originalItem) {
        const itemTotal = originalItem.sellingPrice * ri.quantity;
        refundAmount += itemTotal;
      }
    });

    const refundLog: RefundLog = {
      id: nanoid(),
      date: new Date().toISOString(),
      reason,
      condition,
      amount: refundAmount,
      items: refundItems,
      processedBy: user.name
    };

    const updatedRefunds = [...(transaction.refunds || []), refundLog];
    const totalRefundedSoFar = updatedRefunds.reduce((sum, r) => sum + r.amount, 0);
    
    let newStatus = transaction.status;
    if (Math.abs(totalRefundedSoFar - transaction.total) < 0.01) {
      newStatus = TransactionStatus.REFUNDED;
    } else if (totalRefundedSoFar > 0) {
      newStatus = TransactionStatus.PARTIAL;
    }

    const updatedTransaction = {
      ...transaction,
      refunds: updatedRefunds,
      status: newStatus
    };

    const newTransactions = [...transactions];
    newTransactions[transactionIndex] = updatedTransaction;
    setTransactions(newTransactions);

    // Restock Inventory if condition allows (e.g., not damaged)
    if (condition === 'Good' || condition === 'Resellable') {
      const newProducts = products.map(p => {
        const returnedItem = refundItems.find(ri => ri.itemId === p.id);
        if (returnedItem) {
          return { ...p, stock: p.stock + returnedItem.quantity, updatedAt: new Date().toISOString() };
        }
        return p;
      });
      setProducts(newProducts);
      addNotification(`Return processed. Inventory restocked for ${refundItems.length} item(s).`, 'success');
    } else {
      addNotification(`Return processed. Items marked as ${condition} (Not Restocked).`, 'info');
    }
    
    logSystemAction('REFUND_PROCESSED', `Processed refund for Tx ${transactionId}. Amount: ${refundAmount}. Reason: ${reason}`);
  };

  const addUser = (u: User) => {
    setUsers(prev => [...prev, u]);
    addNotification(`User account "${u.username}" created successfully`, 'success');
    logSystemAction('USER_CREATED', `Created user: ${u.username} (${u.role})`);
  };

  const updateUser = (u: User) => {
    setUsers(users.map(usr => usr.id === u.id ? u : usr));
    addNotification(`User account "${u.username}" updated`, 'success');
    logSystemAction('USER_UPDATED', `Updated user: ${u.username}`);
  };

  const deleteUser = (id: string) => {
    const usr = users.find(u => u.id === id);
    setUsers(users.filter(u => u.id !== id));
    addNotification('User removed from system', 'warning');
    logSystemAction('USER_DELETED', `Deleted user: ${usr?.username || id}`);
  };

  const updateSettings = (s: StoreSettings) => {
    setSettings(s);
    addNotification('System settings saved successfully', 'success');
    logSystemAction('SETTINGS_UPDATED', 'Global settings updated');
  };

  const addBranch = (b: Branch) => {
    setBranches([...branches, b]);
    addNotification(`New branch "${b.name}" added to platform`, 'success');
    logSystemAction('BRANCH_CREATED', `Created branch: ${b.name}`);
  };

  const updateBranch = (b: Branch) => {
    setBranches(branches.map(br => br.id === b.id ? b : br));
    addNotification(`Branch "${b.name}" details updated`, 'success');
    logSystemAction('BRANCH_UPDATED', `Updated branch: ${b.name}`);
  };

  const deleteBranch = (id: string) => {
    const br = branches.find(b => b.id === id);
    setBranches(branches.filter(b => b.id !== id));
    addNotification('Branch removed permanently', 'warning');
    logSystemAction('BRANCH_DELETED', `Deleted branch: ${br?.name || id}`);
  };

  const addExpense = (e: Expense) => {
    setExpenses(prev => [e, ...prev]);
    addNotification('Expense request submitted', 'success');
    logSystemAction('EXPENSE_CREATED', `Expense created: ${e.description} for ${e.amount}`);
  };

  const updateExpense = (e: Expense) => {
    setExpenses(prev => prev.map(ex => ex.id === e.id ? e : ex));
    if (e.status === ExpenseStatus.APPROVED) {
        addNotification('Expense approved', 'success');
    } else if (e.status === ExpenseStatus.REJECTED) {
        addNotification('Expense rejected', 'info');
    }
    logSystemAction('EXPENSE_UPDATED', `Expense ${e.id} status updated to ${e.status}`);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    addNotification('Expense deleted', 'info');
  };

  return (
    <StoreContext.Provider value={{
      user, users, products, transactions, settings, branches, notifications, categories, activityLogs, expenses,
      login, logout,
      addProduct, updateProduct, deleteProduct,
      addCategory, deleteCategory,
      addTransaction, updateTransaction, deleteTransaction,
      addUser, updateUser, deleteUser,
      updateSettings,
      processRefund,
      addBranch, updateBranch, deleteBranch,
      addNotification, removeNotification,
      addExpense, updateExpense, deleteExpense
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
