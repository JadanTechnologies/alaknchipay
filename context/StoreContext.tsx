import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Product, Transaction, Category, UserRole, Permission, StoreSettings, ActivityLog, Expense, ExpenseStatus, ExpenseCategory, Role, Notification, NotificationType, RefundItem, Branch, PaymentMethod, Customer, PurchaseOrder } from '../types';
import * as LocalStorage from '../services/localStorage';
import { useAuth } from './AuthContext';
import { nanoid } from 'nanoid';

interface StoreContextType {
  user: User | null;
  users: User[];
  roles: UserRole[]; // New dynamic roles
  permissions: Permission[]; // System permissions
  setUser: (user: User | null) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  updateUserPassword: (userId: string, newPassword: string) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  addRole: (role: UserRole) => void; // New
  updateRole: (role: UserRole) => void; // New
  deleteRole: (id: string) => void; // New
  products: Product[];
  transactions: Transaction[];
  customers: Customer[];
  deletedTransactions: Transaction[];
  purchaseOrders: PurchaseOrder[];
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
  getDeletedTransactions: () => Transaction[];
  restoreTransaction: (id: string) => void;
  purgeTransaction: (id: string) => void;
  updateSettings: (settings: StoreSettings) => void;
  processRefund: (transactionId: string, items: RefundItem[], reason: string, condition?: string) => void;
  addBranch: (branch: Partial<Branch>) => void;
  updateBranch: (branch: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  addNotification: (message: string, type: NotificationType) => void;
  removeNotification: (id: string) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  addCustomer: (c: Partial<Customer>) => Customer;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => void;
  addPurchaseOrder: (order: Omit<PurchaseOrder, 'id'>) => void;
  updatePurchaseOrder: (order: PurchaseOrder) => void;
  deletePurchaseOrder: (id: string) => void;
  createBackup: (storeId?: string) => string;
  restoreBackup: (jsonData: string) => boolean;
  uploadFile: (file: File, path?: string) => Promise<string | null>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deletedTransactions, setDeletedTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    name: 'AlkanchiPay POS',
    currency: '₦',
    address: '',
    logoUrl: ''
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      // Load current user if logged in
      if (authUser) {
        const currentUser = LocalStorage.Users.getById(authUser.userId);
        if (currentUser) {
          setUser(currentUser);
        }
      }

      // Load all data
      setUsers(LocalStorage.Users.getAll());
      setRoles(LocalStorage.Roles.getAll());
      const perms = localStorage.getItem('alkanchipay_permissions');
      setPermissions(perms ? JSON.parse(perms) : []);
      setProducts(LocalStorage.Products.getAll());
      setTransactions(LocalStorage.Transactions.getAll());
      setDeletedTransactions(LocalStorage.Transactions.getDeletedAll());
      setCustomers(LocalStorage.Customers.getAll());
      setPurchaseOrders(LocalStorage.PurchaseOrders.getAll());
      setSettings(LocalStorage.Settings.get());
      setBranches(LocalStorage.Branches.getAll());
      setCategories(LocalStorage.Categories.getAll());
      const expCats = localStorage.getItem('alkanchipay_expense_categories');
      setExpenseCategories(expCats ? JSON.parse(expCats) : []);
      setExpenses(LocalStorage.Expenses.getAll());
      setActivityLogs(LocalStorage.ActivityLogs.getAll());
    };

    loadData();
  }, [authUser]);

  // Notification Logic
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  

  const addNotification = useCallback((message: string, type: NotificationType) => {
    const id = nanoid();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeNotification(id), 3000);
  }, [removeNotification]);

  // Wrappers for Local Storage Actions
  const addCategory = (name: string) => {
    if (!name) return;
    const newCategory = LocalStorage.Categories.create(name);
    setCategories(prev => [...prev, newCategory]);
    addNotification(`Category "${name}" created`, 'success');
  };

  const deleteCategory = (id: string) => {
    if (LocalStorage.Categories.delete(id)) {
      setCategories(prev => prev.filter(c => c.id !== id));
      addNotification('Category deleted', 'info');
    } else {
      addNotification('Failed to delete category', 'error');
    }
  };

  // Customer CRUD Operations
  const addCustomer = (c: Partial<Customer>) => {
    const newCustomer = LocalStorage.Customers.create({
      name: c.name || '',
      phone: c.phone,
      email: c.email,
      storeId: c.storeId
    });
    setCustomers(prev => [...prev, newCustomer]);
    addNotification(`Customer "${newCustomer.name}" added`, 'success');
    return newCustomer;
  };

  const updateCustomer = (c: Customer) => {
    const updated = LocalStorage.Customers.update(c.id, c);
    if (updated) {
      setCustomers(prev => prev.map(ct => ct.id === c.id ? updated : ct));
      addNotification(`Customer "${c.name}" updated`, 'success');
    } else {
      addNotification('Failed to update customer', 'error');
    }
  };

  const deleteCustomer = (id: string) => {
    if (LocalStorage.Customers.delete(id)) {
      setCustomers(prev => prev.filter(c => c.id !== id));
      addNotification('Customer deleted', 'info');
    } else {
      addNotification('Failed to delete customer', 'error');
    }
  };

  // Branch CRUD Operations
  const addBranch = (branch: Partial<Branch>) => {
    const newBranch = LocalStorage.Branches.create({
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
      managerId: branch.managerId
    });

    setBranches(prev => [...prev, newBranch]);
    addNotification(`Branch "${branch.name}" created successfully`, 'success');
  };

  const updateBranch = (branch: Partial<Branch>) => {
    if (!branch.id) return;
    const updated = LocalStorage.Branches.update(branch.id, branch);
    if (updated) {
      setBranches(prev => prev.map(b => b.id === branch.id ? updated : b));
      addNotification(`Branch "${branch.name}" updated successfully`, 'success');
    } else {
      addNotification('Failed to update branch', 'error');
    }
  };

  const deleteBranch = (id: string) => {
    const branchName = branches.find(b => b.id === id)?.name || 'Unknown';
    if (LocalStorage.Branches.delete(id)) {
      setBranches(prev => prev.filter(b => b.id !== id));
      addNotification(`Branch "${branchName}" deleted successfully`, 'success');
    } else {
      addNotification('Failed to delete branch', 'error');
    }
  };

  // User CRUD Operations
  const addUser = (userData: Partial<User>) => {
    const newUser = LocalStorage.Users.create({
      name: userData.name || '',
      username: userData.username || '',
      password: userData.password || '',
      role: userData.role || 'CASHIER',
      active: userData.active ?? true,
      storeId: userData.storeId,
      expenseLimit: userData.expenseLimit || 0
    });

    setUsers(prev => [...prev, newUser]);
    addNotification(`User "${userData.name}" created successfully`, 'success');
  };

  const updateUser = (userData: User) => {
    const updated = LocalStorage.Users.update(userData.id, userData);
    if (updated) {
      setUsers(prev => prev.map(u => u.id === userData.id ? updated : u));
      addNotification(`User "${userData.name}" updated successfully`, 'success');
    } else {
      addNotification('Failed to update user', 'error');
    }
  };

  const deleteUser = (id: string) => {
    const userName = users.find(u => u.id === id)?.name || 'Unknown';
    if (LocalStorage.Users.delete(id)) {
      setUsers(prev => prev.filter(u => u.id !== id));
      addNotification(`User "${userName}" deleted successfully`, 'success');
    } else {
      addNotification('Failed to delete user', 'error');
    }
  };

  const toggleUserStatus = (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    const updated = LocalStorage.Users.update(id, { active: !user.active });
    if (updated) {
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
      addNotification(`User status updated to ${updated.active ? 'Active' : 'Suspended'}`, 'success');
    } else {
      addNotification('Failed to update user status', 'error');
    }
  };

  const updateUserPassword = (userId: string, newPassword: string) => {
    const success = LocalStorage.Users.updatePassword(userId, newPassword);
    if (success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword } : u));
      addNotification('User password updated successfully', 'success');
    } else {
      addNotification('Failed to update user password', 'error');
    }
  };

  // Auth wrappers
  const login = (username: string) => {
    console.warn("Legacy login called", username);
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  // Product CRUD Operations
  const addProduct = (p: Partial<Product>) => {
    const newProduct = LocalStorage.Products.create({
      sku: p.sku || '',
      name: p.name || '',
      category: p.category || '',
      costPrice: p.costPrice || 0,
      sellingPrice: p.sellingPrice || 0,
      stock: p.stock || 0,
      minStockAlert: p.minStockAlert || 0,
      storeId: p.storeId
    });

    setProducts(prev => [...prev, newProduct]);
    addNotification(`Product "${p.name}" added successfully`, 'success');
  };

  const updateProduct = (p: Product) => {
    const updated = LocalStorage.Products.update(p.id, p);
    if (updated) {
      setProducts(prev => prev.map(prod => prod.id === p.id ? updated : prod));
      addNotification(`Product "${p.name}" updated successfully`, 'success');
    } else {
      addNotification('Failed to update product', 'error');
    }
  };

  const deleteProduct = (id: string) => {
    const productName = products.find(p => p.id === id)?.name || 'Unknown';
    if (LocalStorage.Products.delete(id)) {
      setProducts(prev => prev.filter(p => p.id !== id));
      addNotification(`Product "${productName}" deleted successfully`, 'success');
    } else {
      addNotification('Failed to delete product', 'error');
    }
  };

  // Transaction CRUD Operations
  const addTransaction = (transaction: Transaction) => {
    const newTransaction = LocalStorage.Transactions.create(transaction);
    setTransactions(prev => [...prev, newTransaction]);
    addNotification('Transaction recorded successfully', 'success');
  };

  const updateTransaction = (transaction: Transaction) => {
    const updated = LocalStorage.Transactions.update(transaction.id, transaction);
    if (updated) {
      setTransactions(prev => prev.map(t => t.id === transaction.id ? updated : t));
      addNotification('Transaction updated successfully', 'success');
    } else {
      addNotification('Failed to update transaction', 'error');
    }
  };

  const deleteTransaction = (id: string) => {
    // Log for debugging
    console.log('Delete transaction called for:', id, 'User role:', authUser?.role || user?.role);
    
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'];
    const role = authUser?.role || user?.role;
    
    if (!role || !allowedRoles.includes(role)) {
      addNotification('You do not have permission to delete transactions', 'error');
      return;
    }

    const success = LocalStorage.Transactions.softDelete(id, authUser?.username || user?.username || 'system');
    if (success) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      const deleted = LocalStorage.Transactions.getDeletedAll();
      setDeletedTransactions(deleted);
      addNotification('Transaction moved to recycle bin', 'success');
    } else {
      addNotification('Failed to delete transaction', 'error');
    }
  };

  const getDeletedTransactions = (): Transaction[] => {
    const deleted = LocalStorage.Transactions.getDeletedAll();
    setDeletedTransactions(deleted);
    return deleted;
  };

  const restoreTransaction = (id: string) => {
    const success = LocalStorage.Transactions.restore(id);
    if (success) {
      // refresh lists
      setTransactions(LocalStorage.Transactions.getAll());
      setDeletedTransactions(LocalStorage.Transactions.getDeletedAll());
      addNotification('Transaction restored from recycle bin', 'success');
    } else {
      addNotification('Failed to restore transaction', 'error');
    }
  };

  const purgeTransaction = (id: string) => {
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'];
    const role = authUser?.role || user?.role;
    
    if (!role || !allowedRoles.includes(role)) {
      addNotification('You do not have permission to permanently delete transactions', 'error');
      return;
    }

    const success = LocalStorage.Transactions.purge(id);
    if (success) {
      setDeletedTransactions(prev => prev.filter(t => t.id !== id));
      addNotification('Transaction permanently deleted', 'success');
    } else {
      addNotification('Failed to permanently delete transaction', 'error');
    }
  };

  // Expense CRUD Operations
  const addExpense = (expense: Expense) => {
    const newExpense = LocalStorage.Expenses.create(expense);
    setExpenses(prev => [...prev, newExpense]);
    addNotification('Expense added successfully', 'success');
  };

  const updateExpense = (expense: Expense) => {
    const updated = LocalStorage.Expenses.update(expense.id, expense);
    if (updated) {
      setExpenses(prev => prev.map(e => e.id === expense.id ? updated : e));
      addNotification('Expense updated successfully', 'success');
    } else {
      addNotification('Failed to update expense', 'error');
    }
  };

  const deleteExpense = (id: string) => {
    if (LocalStorage.Expenses.delete(id)) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      addNotification('Expense deleted successfully', 'success');
    } else {
      addNotification('Failed to delete expense', 'error');
    }
  };

  // Expense Category Operations
  const addExpenseCategory = (cat: ExpenseCategory) => {
    const newCat = { ...cat, id: nanoid() };
    const expCats = localStorage.getItem('alkanchipay_expense_categories');
    const cats = expCats ? JSON.parse(expCats) : [];
    localStorage.setItem('alkanchipay_expense_categories', JSON.stringify([...cats, newCat]));
    setExpenseCategories(prev => [...prev, newCat]);
    addNotification(`Expense category "${cat.name}" created`, 'success');
  };

  const deleteExpenseCategory = (id: string) => {
    const expCats = localStorage.getItem('alkanchipay_expense_categories');
    const cats = expCats ? JSON.parse(expCats) : [];
    const filtered = cats.filter((c: ExpenseCategory) => c.id !== id);
    localStorage.setItem('alkanchipay_expense_categories', JSON.stringify(filtered));
    setExpenseCategories(prev => prev.filter(c => c.id !== id));
    addNotification('Expense category deleted', 'info');
  };

  // Role CRUD Operations
  const addRole = (role: UserRole) => {
    const newRole = LocalStorage.Roles.create({
      name: role.name,
      description: role.description,
      isSystemDefined: false,
      permissions: role.permissions
    });

    setRoles(prev => [...prev, newRole]);
    addNotification(`Role "${role.name}" created successfully`, 'success');
  };

  const updateRole = (role: UserRole) => {
    const updated = LocalStorage.Roles.update(role.id, role);
    if (updated) {
      setRoles(prev => prev.map(r => r.id === role.id ? updated : r));
      addNotification(`Role "${role.name}" updated successfully`, 'success');
    } else {
      addNotification('Failed to update role', 'error');
    }
  };

  const deleteRole = (id: string) => {
    const roleName = roles.find(r => r.id === id)?.name || 'Unknown';
    if (LocalStorage.Roles.delete(id)) {
      setRoles(prev => prev.filter(r => r.id !== id));
      addNotification(`Role "${roleName}" deleted successfully`, 'success');
    } else {
      addNotification('Failed to delete role', 'error');
    }
  };

  // Settings
  const updateSettings = (newSettings: StoreSettings) => {
    LocalStorage.Settings.update(newSettings);
    setSettings(newSettings);
    addNotification('Settings updated successfully', 'success');
  };

  // Process Refund
  const processRefund = (transactionId: string, items: RefundItem[], reason: string, condition?: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) {
      addNotification('Transaction not found', 'error');
      return;
    }

    const refundLog = {
      id: nanoid(),
      date: new Date().toISOString(),
      reason,
      condition,
      amount: items.reduce((sum, item) => {
        const cartItem = transaction.items.find(ci => ci.id === item.itemId);
        return sum + (cartItem ? cartItem.sellingPrice * item.quantity : 0);
      }, 0),
      items,
      processedBy: authUser?.username || 'Unknown'
    };

    const updatedTransaction = {
      ...transaction,
      refunds: [...(transaction.refunds || []), refundLog],
      status: 'REFUNDED' as any
    };

    LocalStorage.Transactions.update(transactionId, updatedTransaction);
    setTransactions(prev => prev.map(t => t.id === transactionId ? updatedTransaction : t));
    addNotification('Refund processed successfully', 'success');
  };

  // Backup/Restore
  const createBackup = (): string => {
    return LocalStorage.Backup.create();
  };

  const restoreBackup = (jsonData: string): boolean => {
    const success = LocalStorage.Backup.restore(jsonData);
    if (success) {
      setUsers(LocalStorage.Users.getAll());
      setRoles(LocalStorage.Roles.getAll());
      setProducts(LocalStorage.Products.getAll());
      setTransactions(LocalStorage.Transactions.getAll());
      setDeletedTransactions(LocalStorage.Transactions.getDeletedAll());
      setSettings(LocalStorage.Settings.get());
      setBranches(LocalStorage.Branches.getAll());
      setCategories(LocalStorage.Categories.getAll());
      setExpenses(LocalStorage.Expenses.getAll());
      addNotification('Backup restored successfully', 'success');
    } else {
      addNotification('Failed to restore backup', 'error');
    }
    return success;
  };

  // File upload - convert to base64 for localStorage
  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Upload Exception:', error);
      addNotification('File upload failed', 'error');
      return null;
    }
  };

  // Purchase Orders
  const addPurchaseOrder = (order: Omit<PurchaseOrder, 'id'>) => {
    const newOrder = LocalStorage.PurchaseOrders.create(order);
    setPurchaseOrders(prev => [...prev, newOrder]);
    addNotification('Purchase order created successfully', 'success');
  };

  const updatePurchaseOrder = (order: PurchaseOrder) => {
    const updated = LocalStorage.PurchaseOrders.update(order.id, order);
    if (updated) {
      setPurchaseOrders(prev => prev.map(p => p.id === order.id ? order : p));
      addNotification('Purchase order updated successfully', 'success');
    }
  };

  const deletePurchaseOrder = (id: string) => {
    if (LocalStorage.PurchaseOrders.delete(id)) {
      setPurchaseOrders(prev => prev.filter(p => p.id !== id));
      addNotification('Purchase order deleted successfully', 'success');
    }
  };

  return (
    <StoreContext.Provider value={{
      user,
      users,
      roles,
      permissions,
      setUser,
      addUser,
      updateUser,
      updateUserPassword,
      deleteUser,
      toggleUserStatus,
      addRole,
      updateRole,
      deleteRole,
      products,
      transactions,
      settings,
      branches,
      categories,
      expenseCategories,
      notifications,
      activityLogs,
      expenses,
      purchaseOrders,
      login,
      logout,
      addProduct,
      updateProduct,
      deleteProduct,
      customers,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addCategory,
      deleteCategory,
      addExpenseCategory,
      deleteExpenseCategory,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      deletedTransactions,
      getDeletedTransactions,
      restoreTransaction,
      purgeTransaction,
      updateSettings,
      processRefund,
      addBranch,
      updateBranch,
      deleteBranch,
      addNotification,
      removeNotification,
      addExpense,
      updateExpense,
      deleteExpense,
      addPurchaseOrder,
      updatePurchaseOrder,
      deletePurchaseOrder,
      createBackup,
      restoreBackup,
      uploadFile
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
