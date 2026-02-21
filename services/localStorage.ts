// Local Storage Service for AlkanchiPay
import { User, Product, Transaction, Category, UserRole, Permission, StoreSettings, ActivityLog, Expense, ExpenseCategory, Branch, Notification, Customer, PurchaseOrder, ProductTransfer } from '../types';
import { nanoid } from 'nanoid';

const STORAGE_KEYS = {
  USERS: 'alkanchipay_users',
  CURRENT_USER: 'alkanchipay_current_user',
  PRODUCTS: 'alkanchipay_products',
  TRANSACTIONS: 'alkanchipay_transactions',
  DELETED_TRANSACTIONS: 'alkanchipay_deleted_transactions',
  CATEGORIES: 'alkanchipay_categories',
  EXPENSE_CATEGORIES: 'alkanchipay_expense_categories',
  BRANCHES: 'alkanchipay_branches',
  SETTINGS: 'alkanchipay_settings',
  CUSTOMERS: 'alkanchipay_customers',
  DELETED_CUSTOMERS: 'alkanchipay_deleted_customers',
  ROLES: 'alkanchipay_roles',
  PERMISSIONS: 'alkanchipay_permissions',
  EXPENSES: 'alkanchipay_expenses',
  ACTIVITY_LOGS: 'alkanchipay_activity_logs',
  PURCHASE_ORDERS: 'alkanchipay_purchase_orders',
  PRODUCT_TRANSFERS: 'alkanchipay_product_transfers'
};

// Helper functions
const getItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading from localStorage: ${key}`, e);
    return defaultValue;
  }
};

const setItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing to localStorage: ${key}`, e);
  }
};

// Initialize default data if not present
export const initializeLocalStorage = (): void => {
  // Initialize users - SUPER ADMIN AND DEMO CASHIER
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const defaultUsers: User[] = [
      {
        id: 'super_admin_1',
        name: 'Super Admin',
        username: 'salmanu@alkanchipay.com',
        password: 'Salmanu@2025',
        role: 'SUPER_ADMIN',
        active: true,
        storeId: undefined,
        expenseLimit: 0
      },
      {
        id: 'cashier_demo_1',
        name: 'Demo Cashier',
        username: 'cashier@alkanchipay.com',
        password: 'Cashier@2025',
        role: 'CASHIER',
        active: true,
        storeId: undefined,
        expenseLimit: 0
      }
    ];
    setItem(STORAGE_KEYS.USERS, defaultUsers);
  }

  // Initialize default roles and permissions
  if (!localStorage.getItem(STORAGE_KEYS.ROLES)) {
    const defaultRoles: UserRole[] = [
      {
        id: 'role_super_admin',
        name: 'SUPER_ADMIN',
        description: 'Full system access',
        isSystemDefined: true,
        permissions: ['Full Access']
      },
      {
        id: 'role_branch_manager',
        name: 'BRANCH_MANAGER',
        description: 'Manage branch operations',
        isSystemDefined: true,
        permissions: ['Manage Branch', 'Process Sales', 'View Reports']
      },
      {
        id: 'role_cashier',
        name: 'CASHIER',
        description: 'Process sales transactions',
        isSystemDefined: true,
        permissions: ['Process Sales']
      }
    ];
    setItem(STORAGE_KEYS.ROLES, defaultRoles);
  }

  // Initialize permissions
  if (!localStorage.getItem(STORAGE_KEYS.PERMISSIONS)) {
    const defaultPermissions: Permission[] = [
      { id: 'perm_full_access', name: 'Full Access', description: 'Full system access', module: 'System' },
      { id: 'perm_manage_branch', name: 'Manage Branch', description: 'Manage branch', module: 'Branch' },
      { id: 'perm_process_sales', name: 'Process Sales', description: 'Process sales', module: 'Sales' },
      { id: 'perm_view_reports', name: 'View Reports', description: 'View reports', module: 'Reports' }
    ];
    setItem(STORAGE_KEYS.PERMISSIONS, defaultPermissions);
  }

  // Initialize branches - START EMPTY
  if (!localStorage.getItem(STORAGE_KEYS.BRANCHES)) {
    setItem(STORAGE_KEYS.BRANCHES, []);
  }

  // Initialize settings
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    const defaultSettings: StoreSettings = {
      name: 'AlkanchiPay POS',
      currency: '₦',
      address: '123 Business Street, Lagos',
      phone: '+234 800 000 0000',
      logoUrl: ''
    };
    setItem(STORAGE_KEYS.SETTINGS, defaultSettings);
  }

  // Initialize categories - START EMPTY
  if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
    setItem(STORAGE_KEYS.CATEGORIES, []);
  }

  // Initialize expense categories - START EMPTY
  if (!localStorage.getItem(STORAGE_KEYS.EXPENSE_CATEGORIES)) {
    setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, []);
  }

  // Initialize products, transactions, expenses, etc. as empty arrays
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    setItem(STORAGE_KEYS.PRODUCTS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
    setItem(STORAGE_KEYS.TRANSACTIONS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    setItem(STORAGE_KEYS.CUSTOMERS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.DELETED_CUSTOMERS)) {
    setItem(STORAGE_KEYS.DELETED_CUSTOMERS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.DELETED_TRANSACTIONS)) {
    setItem(STORAGE_KEYS.DELETED_TRANSACTIONS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
    setItem(STORAGE_KEYS.EXPENSES, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS)) {
    setItem(STORAGE_KEYS.ACTIVITY_LOGS, []);
  }

  // Initialize purchase orders
  if (!localStorage.getItem(STORAGE_KEYS.PURCHASE_ORDERS)) {
    setItem(STORAGE_KEYS.PURCHASE_ORDERS, []);
  }
};

// User Operations
export const Users = {
  getAll: (): User[] => getItem(STORAGE_KEYS.USERS, []),
  
  getById: (id: string): User | null => {
    const users = getItem(STORAGE_KEYS.USERS, []);
    return users.find(u => u.id === id) || null;
  },

  getByUsername: (username: string): User | null => {
    const users = getItem(STORAGE_KEYS.USERS, []);
    return users.find(u => u.username === username) || null;
  },

  isUsernameUnique: (username: string, excludeId?: string): boolean => {
    const users = getItem(STORAGE_KEYS.USERS, []);
    const existing = users.find(u => u.username === username);
    return !existing || (excludeId && existing.id === excludeId);
  },

  create: (user: Omit<User, 'id'>): User => {
    const newUser = { ...user, id: nanoid() };
    const users = getItem(STORAGE_KEYS.USERS, []);
    setItem(STORAGE_KEYS.USERS, [...users, newUser]);
    return newUser;
  },

  update: (id: string, updates: Partial<User>): User | null => {
    const users = getItem(STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    const updated = { ...users[index], ...updates };
    users[index] = updated;
    setItem(STORAGE_KEYS.USERS, users);
    return updated;
  },

  delete: (id: string): boolean => {
    const users = getItem(STORAGE_KEYS.USERS, []);
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return false;
    setItem(STORAGE_KEYS.USERS, filtered);
    return true;
  },

  authenticate: (username: string, password: string): User | null => {
    const users = getItem(STORAGE_KEYS.USERS, []);
    return users.find(u => u.username === username && u.password === password) || null;
  },

  updatePassword: (id: string, newPassword: string): boolean => {
    const users = getItem(STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return false;

    users[index].password = newPassword;
    setItem(STORAGE_KEYS.USERS, users);
    return true;
  }
};

// Product Operations
export const Products = {
  getAll: (): Product[] => getItem(STORAGE_KEYS.PRODUCTS, []),

  getById: (id: string): Product | null => {
    const products = getItem(STORAGE_KEYS.PRODUCTS, []);
    return products.find(p => p.id === id) || null;
  },

  create: (product: Omit<Product, 'id'>): Product => {
    const newProduct = { ...product, id: nanoid() };
    const products = getItem(STORAGE_KEYS.PRODUCTS, []);
    setItem(STORAGE_KEYS.PRODUCTS, [...products, newProduct]);
    return newProduct;
  },

  update: (id: string, updates: Partial<Product>): Product | null => {
    const products = getItem(STORAGE_KEYS.PRODUCTS, []);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    const updated = { ...products[index], ...updates, updatedAt: new Date().toISOString() };
    products[index] = updated;
    setItem(STORAGE_KEYS.PRODUCTS, products);
    return updated;
  },

  delete: (id: string): boolean => {
    const products = getItem(STORAGE_KEYS.PRODUCTS, []);
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return false;
    setItem(STORAGE_KEYS.PRODUCTS, filtered);
    return true;
  }
};

// Transaction Operations
export const Transactions = {
  // Returns transactions; by default excludes soft-deleted items
  getAll: (includeDeleted = false): Transaction[] => {
    const transactions = getItem(STORAGE_KEYS.TRANSACTIONS, []);
    if (includeDeleted) return transactions;
    return transactions.filter((t: any) => !t.isDeleted);
  },

  getDeletedAll: (): Transaction[] => getItem(STORAGE_KEYS.DELETED_TRANSACTIONS, []),

  getById: (id: string, includeDeleted = false): Transaction | null => {
    const transactions = getItem(STORAGE_KEYS.TRANSACTIONS, []);
    const found = transactions.find((t: any) => t.id === id);
    if (found) {
      if (!includeDeleted && found.isDeleted) return null;
      return found;
    }
    // also check deleted store if asked
    if (includeDeleted) {
      const deleted = getItem(STORAGE_KEYS.DELETED_TRANSACTIONS, []);
      return deleted.find((t: any) => t.id === id) || null;
    }
    return null;
  },

  create: (transaction: Omit<Transaction, 'id'>): Transaction => {
    const newTransaction = { ...transaction, id: nanoid(), isDeleted: false };
    const transactions = getItem(STORAGE_KEYS.TRANSACTIONS, []);
    setItem(STORAGE_KEYS.TRANSACTIONS, [...transactions, newTransaction]);
    return newTransaction;
  },

  update: (id: string, updates: Partial<Transaction>): Transaction | null => {
    const transactions = getItem(STORAGE_KEYS.TRANSACTIONS, []);
    const index = transactions.findIndex((t: any) => t.id === id);
    if (index === -1) return null;
    
    const updated = { ...transactions[index], ...updates };
    transactions[index] = updated;
    setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
    return updated;
  },

  // Soft-delete: mark as deleted and move to deleted store for recycle bin
  softDelete: (id: string, deletedBy?: string): boolean => {
    const transactions = getItem(STORAGE_KEYS.TRANSACTIONS, []);
    const index = transactions.findIndex((t: any) => t.id === id);
    if (index === -1) return false;

    const toDelete = { ...transactions[index], isDeleted: true, deletedAt: new Date().toISOString(), deletedBy: deletedBy || 'system' };

    // Remove from main store
    const remaining = transactions.filter((t: any) => t.id !== id);
    setItem(STORAGE_KEYS.TRANSACTIONS, remaining);

    // Add to deleted store
    const deleted = getItem(STORAGE_KEYS.DELETED_TRANSACTIONS, []);
    setItem(STORAGE_KEYS.DELETED_TRANSACTIONS, [...deleted, toDelete]);
    return true;
  },

  restore: (id: string): boolean => {
    const deleted = getItem(STORAGE_KEYS.DELETED_TRANSACTIONS, []);
    const index = deleted.findIndex((t: any) => t.id === id);
    if (index === -1) return false;

    const item = { ...deleted[index] };
    // remove deletion metadata
    delete item.isDeleted;
    delete item.deletedAt;
    delete item.deletedBy;

    const remainingDeleted = deleted.filter((t: any) => t.id !== id);
    setItem(STORAGE_KEYS.DELETED_TRANSACTIONS, remainingDeleted);

    const transactions = getItem(STORAGE_KEYS.TRANSACTIONS, []);
    setItem(STORAGE_KEYS.TRANSACTIONS, [...transactions, item]);
    return true;
  },

  // Permanently remove from deleted store
  purge: (id: string): boolean => {
    const deleted = getItem(STORAGE_KEYS.DELETED_TRANSACTIONS, []);
    const filtered = deleted.filter((t: any) => t.id !== id);
    if (filtered.length === deleted.length) return false;
    setItem(STORAGE_KEYS.DELETED_TRANSACTIONS, filtered);
    return true;
  }
};

// Category Operations
export const Categories = {
  getAll: (): Category[] => getItem(STORAGE_KEYS.CATEGORIES, []),

  create: (name: string, storeId?: string): Category => {
    const newCategory = { id: nanoid(), name, storeId };
    const categories = getItem(STORAGE_KEYS.CATEGORIES, []);
    setItem(STORAGE_KEYS.CATEGORIES, [...categories, newCategory]);
    return newCategory;
  },

  delete: (id: string): boolean => {
    const categories = getItem(STORAGE_KEYS.CATEGORIES, []);
    const filtered = categories.filter(c => c.id !== id);
    if (filtered.length === categories.length) return false;
    setItem(STORAGE_KEYS.CATEGORIES, filtered);
    return true;
  }
};

// Branch Operations
export const Branches = {
  getAll: (): Branch[] => getItem(STORAGE_KEYS.BRANCHES, []),

  getById: (id: string): Branch | null => {
    const branches = getItem(STORAGE_KEYS.BRANCHES, []);
    return branches.find(b => b.id === id) || null;
  },

  create: (branch: Omit<Branch, 'id'>): Branch => {
    const newBranch = { ...branch, id: nanoid() };
    const branches = getItem(STORAGE_KEYS.BRANCHES, []);
    setItem(STORAGE_KEYS.BRANCHES, [...branches, newBranch]);
    return newBranch;
  },

  update: (id: string, updates: Partial<Branch>): Branch | null => {
    const branches = getItem(STORAGE_KEYS.BRANCHES, []);
    const index = branches.findIndex(b => b.id === id);
    if (index === -1) return null;
    
    const updated = { ...branches[index], ...updates };
    branches[index] = updated;
    setItem(STORAGE_KEYS.BRANCHES, branches);
    return updated;
  },

  delete: (id: string): boolean => {
    const branches = getItem(STORAGE_KEYS.BRANCHES, []);
    const filtered = branches.filter(b => b.id !== id);
    if (filtered.length === branches.length) return false;
    setItem(STORAGE_KEYS.BRANCHES, filtered);
    return true;
  }
};

// Expense Operations
// Customer Operations
export const Customers = {
  getAll: (storeId?: string): Customer[] => {
    const customers = getItem(STORAGE_KEYS.CUSTOMERS, []);
    return storeId ? customers.filter((c: any) => c.storeId === storeId) : customers;
  },

  getById: (id: string): Customer | null => {
    const customers = getItem(STORAGE_KEYS.CUSTOMERS, []);
    return customers.find((c: any) => c.id === id) || null;
  },

  create: (customer: Omit<Customer, 'id'>): Customer => {
    const newCustomer = { ...customer, id: nanoid() };
    const customers = getItem(STORAGE_KEYS.CUSTOMERS, []);
    setItem(STORAGE_KEYS.CUSTOMERS, [...customers, newCustomer]);
    return newCustomer;
  },

  update: (id: string, updates: Partial<Customer>): Customer | null => {
    const customers = getItem(STORAGE_KEYS.CUSTOMERS, []);
    const idx = customers.findIndex((c: any) => c.id === id);
    if (idx === -1) return null;
    const updated = { ...customers[idx], ...updates };
    customers[idx] = updated;
    setItem(STORAGE_KEYS.CUSTOMERS, customers);
    return updated;
  },

  delete: (id: string): boolean => {
    const customers = getItem(STORAGE_KEYS.CUSTOMERS, []);
    const filtered = customers.filter((c: any) => c.id !== id);
    if (filtered.length === customers.length) return false;
    setItem(STORAGE_KEYS.CUSTOMERS, filtered);
    return true;
  }
};

export const Expenses = {
  getAll: (): Expense[] => getItem(STORAGE_KEYS.EXPENSES, []),

  create: (expense: Omit<Expense, 'id'>): Expense => {
    const newExpense = { ...expense, id: nanoid() };
    const expenses = getItem(STORAGE_KEYS.EXPENSES, []);
    setItem(STORAGE_KEYS.EXPENSES, [...expenses, newExpense]);
    return newExpense;
  },

  update: (id: string, updates: Partial<Expense>): Expense | null => {
    const expenses = getItem(STORAGE_KEYS.EXPENSES, []);
    const index = expenses.findIndex(e => e.id === id);
    if (index === -1) return null;
    
    const updated = { ...expenses[index], ...updates };
    expenses[index] = updated;
    setItem(STORAGE_KEYS.EXPENSES, expenses);
    return updated;
  },

  delete: (id: string): boolean => {
    const expenses = getItem(STORAGE_KEYS.EXPENSES, []);
    const filtered = expenses.filter(e => e.id !== id);
    if (filtered.length === expenses.length) return false;
    setItem(STORAGE_KEYS.EXPENSES, filtered);
    return true;
  }
};

// Role Operations
export const Roles = {
  getAll: (): UserRole[] => getItem(STORAGE_KEYS.ROLES, []),

  create: (role: Omit<UserRole, 'id'>): UserRole => {
    const newRole = { ...role, id: nanoid() };
    const roles = getItem(STORAGE_KEYS.ROLES, []);
    setItem(STORAGE_KEYS.ROLES, [...roles, newRole]);
    return newRole;
  },

  update: (id: string, updates: Partial<UserRole>): UserRole | null => {
    const roles = getItem(STORAGE_KEYS.ROLES, []);
    const index = roles.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    const updated = { ...roles[index], ...updates };
    roles[index] = updated;
    setItem(STORAGE_KEYS.ROLES, roles);
    return updated;
  },

  delete: (id: string): boolean => {
    const roles = getItem(STORAGE_KEYS.ROLES, []);
    const filtered = roles.filter(r => r.id !== id);
    if (filtered.length === roles.length) return false;
    setItem(STORAGE_KEYS.ROLES, filtered);
    return true;
  }
};

// Settings Operations
export const Settings = {
  get: (): StoreSettings => getItem(STORAGE_KEYS.SETTINGS, {
    name: 'AlkanchiPay POS',
    currency: '₦',
    address: '',
    logoUrl: ''
  }),

  update: (settings: StoreSettings): void => {
    setItem(STORAGE_KEYS.SETTINGS, settings);
  }
};

// Activity Log Operations
export const ActivityLogs = {
  getAll: (): ActivityLog[] => getItem(STORAGE_KEYS.ACTIVITY_LOGS, []),

  add: (log: Omit<ActivityLog, 'id'>): ActivityLog => {
    const newLog = { ...log, id: nanoid() };
    const logs = getItem(STORAGE_KEYS.ACTIVITY_LOGS, []);
    setItem(STORAGE_KEYS.ACTIVITY_LOGS, [...logs, newLog]);
    return newLog;
  }
};

// Purchase Orders Operations
export const PurchaseOrders = {
  getAll: (): PurchaseOrder[] => getItem(STORAGE_KEYS.PURCHASE_ORDERS, []),

  getById: (id: string): PurchaseOrder | null => {
    const orders = getItem(STORAGE_KEYS.PURCHASE_ORDERS, []);
    return orders.find(o => o.id === id) || null;
  },

  create: (order: Omit<PurchaseOrder, 'id'>): PurchaseOrder => {
    const newOrder = { ...order, id: nanoid() };
    const orders = getItem(STORAGE_KEYS.PURCHASE_ORDERS, []);
    setItem(STORAGE_KEYS.PURCHASE_ORDERS, [...orders, newOrder]);
    return newOrder;
  },

  update: (id: string, updates: Partial<PurchaseOrder>): PurchaseOrder | null => {
    const orders = getItem(STORAGE_KEYS.PURCHASE_ORDERS, []);
    const index = orders.findIndex(o => o.id === id);
    if (index === -1) return null;

    const updated = { ...orders[index], ...updates };
    orders[index] = updated;
    setItem(STORAGE_KEYS.PURCHASE_ORDERS, orders);
    return updated;
  },

  delete: (id: string): boolean => {
    const orders = getItem(STORAGE_KEYS.PURCHASE_ORDERS, []);
    const filtered = orders.filter(o => o.id !== id);
    if (filtered.length === orders.length) return false;
    setItem(STORAGE_KEYS.PURCHASE_ORDERS, filtered);
    return true;
  }
};

// Product Transfers
export const ProductTransfers = {
  getAll: (): ProductTransfer[] => getItem(STORAGE_KEYS.PRODUCT_TRANSFERS, []),
  
  getById: (id: string): ProductTransfer | undefined => {
    const transfers = ProductTransfers.getAll();
    return transfers.find(t => t.id === id);
  },

  getByBranch: (branchId: string): ProductTransfer[] => {
    const transfers = ProductTransfers.getAll();
    return transfers.filter(t => t.toBranchId === branchId);
  },

  getPendingByBranch: (branchId: string): ProductTransfer[] => {
    const transfers = ProductTransfers.getAll();
    return transfers.filter(t => t.toBranchId === branchId && t.status === 'PENDING');
  },

  add: (transfer: ProductTransfer): void => {
    const transfers = ProductTransfers.getAll();
    transfers.push(transfer);
    setItem(STORAGE_KEYS.PRODUCT_TRANSFERS, transfers);
  },

  update: (transfer: ProductTransfer): void => {
    const transfers = ProductTransfers.getAll();
    const index = transfers.findIndex(t => t.id === transfer.id);
    if (index !== -1) {
      transfers[index] = transfer;
      setItem(STORAGE_KEYS.PRODUCT_TRANSFERS, transfers);
    }
  },

  delete: (id: string): void => {
    const transfers = ProductTransfers.getAll();
    const filtered = transfers.filter(t => t.id !== id);
    setItem(STORAGE_KEYS.PRODUCT_TRANSFERS, filtered);
  }
};

// Backup/Restore
export const Backup = {
  create: (): string => {
    const backup = {
      timestamp: new Date().toISOString(),
      data: {
        users: Users.getAll(),
        products: Products.getAll(),
        transactions: Transactions.getAll(true),
        deletedTransactions: getItem(STORAGE_KEYS.DELETED_TRANSACTIONS, []),
        categories: Categories.getAll(),
        branches: Branches.getAll(),
        expenses: Expenses.getAll(),
        roles: Roles.getAll(),
        settings: Settings.get(),
        customers: getItem(STORAGE_KEYS.CUSTOMERS, []),
        activityLogs: ActivityLogs.getAll(),
        purchaseOrders: PurchaseOrders.getAll(),
        productTransfers: ProductTransfers.getAll()
      }
    };
    return JSON.stringify(backup);
  },

  restore: (jsonData: string): boolean => {
    try {
      const backup = JSON.parse(jsonData);
      if (!backup.data) return false;

      setItem(STORAGE_KEYS.USERS, backup.data.users || []);
      setItem(STORAGE_KEYS.PRODUCTS, backup.data.products || []);
      setItem(STORAGE_KEYS.TRANSACTIONS, backup.data.transactions || []);
      setItem(STORAGE_KEYS.DELETED_TRANSACTIONS, backup.data.deletedTransactions || []);
      setItem(STORAGE_KEYS.CATEGORIES, backup.data.categories || []);
      setItem(STORAGE_KEYS.BRANCHES, backup.data.branches || []);
      setItem(STORAGE_KEYS.EXPENSES, backup.data.expenses || []);
      setItem(STORAGE_KEYS.ROLES, backup.data.roles || []);
      setItem(STORAGE_KEYS.SETTINGS, backup.data.settings || {});
      setItem(STORAGE_KEYS.ACTIVITY_LOGS, backup.data.activityLogs || []);
      setItem(STORAGE_KEYS.CUSTOMERS, backup.data.customers || []);
      setItem(STORAGE_KEYS.PURCHASE_ORDERS, backup.data.purchaseOrders || []);
      setItem(STORAGE_KEYS.PRODUCT_TRANSFERS, backup.data.productTransfers || []);

      return true;
    } catch (e) {
      console.error('Error restoring backup', e);
      return false;
    }
  }
};
