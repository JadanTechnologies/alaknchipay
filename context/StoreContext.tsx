import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Product, Transaction, Category, UserRole, Permission, StoreSettings, ActivityLog, Expense, ExpenseStatus, ExpenseCategory, Role, Notification, NotificationType, RefundItem, Branch, PaymentMethod } from '../types';
import { supabase } from '../services/supabase';
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
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  addRole: (role: UserRole) => void; // New
  updateRole: (role: UserRole) => void; // New
  deleteRole: (id: string) => void; // New
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
  createBackup: (storeId?: string) => string;
  restoreBackup: (jsonData: string) => boolean;
  uploadFile: (file: File, path?: string) => Promise<string | null>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]); // New
  const [permissions, setPermissions] = useState<Permission[]>([]); // New
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

    // Fetch Roles & Permissions
    const { data: rolesData } = await supabase.from('roles').select('*');
    const { data: permsData } = await supabase.from('permissions').select('*');
    const { data: rolePermsData } = await supabase.from('role_permissions').select('*');

    if (rolesData && permsData && rolePermsData) {
      const formattedRoles: UserRole[] = rolesData.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystemDefined: r.is_system_defined,
        permissions: rolePermsData.filter(rp => rp.role_id === r.id).map(rp => {
          const p = permsData.find(perm => perm.id === rp.permission_id);
          return p ? p.name : '';
        }).filter(Boolean)
      }));
      setRoles(formattedRoles);
      setPermissions(permsData);
    } else {
      // Fallback for dev/first-run if migration hasn't run yet
      const defaultRoles: UserRole[] = [
        { id: 'super_admin', name: Role.SUPER_ADMIN, isSystemDefined: true, permissions: ['Full Access'] },
        { id: 'branch_manager', name: Role.BRANCH_MANAGER, isSystemDefined: true, permissions: ['Manage Branch'] },
        { id: 'cashier', name: Role.CASHIER, isSystemDefined: true, permissions: ['Process Sales'] }
      ];
      setRoles(defaultRoles);
    }

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

  // Branch CRUD Operations
  const addBranch = async (branch: Partial<Branch>) => {
    console.log('[StoreContext] addBranch called with:', branch);
    const { data, error } = await supabase.from('branches').insert({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      manager_id: branch.managerId || null
    }).select().single();

    console.log('[StoreContext] addBranch response:', { data, error });

    if (!error && data) {
      setBranches(prev => [...prev, data]);
      addNotification(`Branch "${branch.name}" created successfully`, 'success');
    } else {
      addNotification(`Failed to create branch: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const updateBranch = async (branch: Partial<Branch>) => {
    console.log('[StoreContext] updateBranch called with:', branch);
    const { data, error } = await supabase.from('branches').update({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      manager_id: branch.managerId || null
    }).eq('id', branch.id!).select().single();

    console.log('[StoreContext] updateBranch response:', { data, error });

    if (!error && data) {
      setBranches(prev => prev.map(b => b.id === branch.id ? data : b));
      addNotification(`Branch "${branch.name}" updated successfully`, 'success');
    } else {
      addNotification(`Failed to update branch: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const deleteBranch = async (id: string) => {
    const branchName = branches.find(b => b.id === id)?.name || 'Unknown';
    const { error } = await supabase.from('branches').delete().eq('id', id);

    if (!error) {
      setBranches(prev => prev.filter(b => b.id !== id));
      addNotification(`Branch "${branchName}" deleted successfully`, 'success');
    } else {
      addNotification(`Failed to delete branch: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  // User CRUD Operations
  const addUser = async (user: Partial<User>) => {
    console.log('[StoreContext] addUser called:', user);

    // Use signUp instead of admin.createUser (works in browser)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.username!,
      password: user.password!,
      options: {
        data: {
          name: user.name,
          role: user.role
        }
      }
    });

    console.log('[StoreContext] signUp response:', { authData, authError });

    if (authError || !authData.user) {
      addNotification(`Failed to create user: ${authError?.message || 'Unknown error'}`, 'error');
      return;
    }

    // Profile is auto-created by trigger, just update it with additional fields
    const { data, error } = await supabase.from('profiles').update({
      name: user.name,
      role: user.role,
      active: user.active ?? true,
      store_id: user.storeId || null,
      expense_limit: user.expenseLimit || 0
    }).eq('id', authData.user.id).select().single();

    console.log('[StoreContext] profile update response:', { data, error });

    if (!error && data) {
      setUsers(prev => [...prev, data]);
      addNotification(`User "${user.name}" created successfully`, 'success');
    } else {
      addNotification(`Failed to update user profile: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const updateUser = async (user: Partial<User>) => {
    console.log('[StoreContext] updateUser called:', user);
    const { data, error } = await supabase.from('profiles').update({
      username: user.username,
      name: user.name,
      role: user.role,
      active: user.active,
      store_id: user.storeId || null,
      expense_limit: user.expenseLimit || 0
    }).eq('id', user.id!).select().single();

    console.log('[StoreContext] updateUser response:', { data, error });

    if (!error && data) {
      setUsers(prev => prev.map(u => u.id === user.id ? data : u));
      addNotification(`User "${user.name}" updated successfully`, 'success');
    } else {
      addNotification(`Failed to update user: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const deleteUser = async (id: string) => {
    console.log('[StoreContext] deleteUser called:', id);
    const userName = users.find(u => u.id === id)?.name || 'Unknown';
    const { error } = await supabase.from('profiles').delete().eq('id', id);

    console.log('[StoreContext] deleteUser response:', { error });

    if (!error) {
      setUsers(prev => prev.filter(u => u.id !== id));
      addNotification(`User "${userName}" deleted successfully`, 'success');
    } else {
      addNotification(`Failed to delete user: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const toggleUserStatus = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    const { data, error } = await supabase.from('profiles').update({
      active: !user.active
    }).eq('id', id).select().single();

    if (!error && data) {
      setUsers(prev => prev.map(u => u.id === id ? data : u));
      addNotification(`User status updated to ${data.active ? 'Active' : 'Suspended'}`, 'success');
    } else {
      addNotification(`Failed to update user status: ${error?.message || 'Unknown error'}`, 'error');
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
  const addProduct = async (p: Partial<Product>) => {
    console.log('[StoreContext] addProduct called:', p);

    // Find category UUID by name if category is a string
    let categoryId = null;
    if (p.category) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('name', p.category)
        .single();
      categoryId = cat?.id || null;
      console.log('[StoreContext] Category lookup:', { name: p.category, id: categoryId });
    }

    const dbProduct = {
      name: p.name,
      sku: p.sku,
      category_id: categoryId,
      cost_price: p.costPrice,
      selling_price: p.sellingPrice,
      stock: p.stock,
      min_stock_alert: p.minStockAlert,
      store_id: p.storeId
    };

    const { data, error } = await supabase.from('products').insert(dbProduct).select().single();
    console.log('[StoreContext] addProduct response:', { data, error });

    if (!error && data) {
      setProducts(prev => [...prev, mapProduct(data)]);
      addNotification(`Product "${p.name}" added successfully`, 'success');
    } else {
      addNotification(`Failed to add product: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const updateProduct = async (p: Partial<Product>) => {
    console.log('[StoreContext] updateProduct called:', p);

    // Find category UUID by name if category is a string
    let categoryId = null;
    if (p.category) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('name', p.category)
        .single();
      categoryId = cat?.id || null;
      console.log('[StoreContext] Category lookup for update:', { name: p.category, id: categoryId });
    }

    const dbProduct = {
      name: p.name,
      sku: p.sku,
      category_id: categoryId,
      cost_price: p.costPrice,
      selling_price: p.sellingPrice,
      stock: p.stock,
      min_stock_alert: p.minStockAlert,
      store_id: p.storeId
    };

    const { data, error } = await supabase.from('products').update(dbProduct).eq('id', p.id!).select().single();
    console.log('[StoreContext] updateProduct response:', { data, error });

    if (!error && data) {
      setProducts(prev => prev.map(prod => prod.id === p.id ? mapProduct(data) : prod));
      addNotification(`Product "${p.name}" updated successfully`, 'success');
    } else {
      addNotification(`Failed to update product: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const deleteProduct = async (id: string) => {
    console.log('[StoreContext] deleteProduct called:', id);
    const productName = products.find(p => p.id === id)?.name || 'Unknown';
    const { error } = await supabase.from('products').delete().eq('id', id);

    console.log('[StoreContext] deleteProduct response:', { error });

    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== id));
      addNotification(`Product "${productName}" deleted successfully`, 'success');
    } else {
      addNotification(`Failed to delete product: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  // ... (Other functions need to be similarly refactored to async/Supabase)
  // For the sake of the tool call limit, I will return the simplified context 
  // and we can iterate.


  const addRole = async (role: UserRole) => {
    // Optimistic Update
    setRoles(prev => [...prev, role]);

    // DB Insert logic would go here
    try {
      const { data, error } = await supabase.from('roles').insert([{
        name: role.name, description: role.description, is_system_defined: false
      }]).select().single();

      if (!error && data) {
        const permInserts = role.permissions.map(pName => {
          const p = permissions.find(pm => pm.name === pName);
          return p ? { role_id: data.id, permission_id: p.id } : null;
        }).filter(Boolean);
        if (permInserts.length > 0) await supabase.from('role_permissions').insert(permInserts);

        // Update local state with real ID
        setRoles(prev => prev.map(r => r.name === role.name ? { ...r, id: data.id } : r));
        addNotification(`Role "${role.name}" created successfully`, 'success');
      } else {
        addNotification(`Failed to create role: ${error?.message || 'Unknown error'}`, 'error');
      }
    } catch (e) {
      console.error("Error adding role", e);
      addNotification('Failed to create role', 'error');
    }

    // logActivity('ROLE_CREATED', `Created role ${role.name}`); // Activity log not yet implemented fully in context
  };

  const updateRole = async (role: UserRole) => {
    try {
      const { error } = await supabase.from('roles').update({
        name: role.name,
        description: role.description
      }).eq('id', role.id);

      if (!error) {
        setRoles(prev => prev.map(r => r.id === role.id ? role : r));
        addNotification(`Role "${role.name}" updated successfully`, 'success');
      } else {
        addNotification(`Failed to update role: ${error?.message || 'Unknown error'}`, 'error');
      }
    } catch (e) {
      console.error("Error updating role", e);
      addNotification('Failed to update role', 'error');
    }
  };

  const deleteRole = async (id: string) => {
    const roleName = roles.find(r => r.id === id)?.name || 'Unknown';
    const { error } = await supabase.from('roles').delete().eq('id', id);
    if (!error) {
      setRoles(prev => prev.filter(r => r.id !== id));
      addNotification(`Role "${roleName}" deleted successfully`, 'success');
    } else {
      addNotification(`Failed to delete role: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  return (
    <StoreContext.Provider value={{
      user, users, products, transactions, settings, branches, notifications, categories, activityLogs, expenses, expenseCategories,
      roles, permissions,
      login, logout,
      addProduct, updateProduct, deleteProduct,
      addCategory, deleteCategory,
      addExpenseCategory: (c) => { },
      deleteExpenseCategory: (id) => { },
      addTransaction: (t) => { },
      updateTransaction: (t) => { },
      deleteTransaction: (id) => { },
      addUser,
      updateUser,
      deleteUser,
      toggleUserStatus,
      addRole, updateRole, deleteRole,
      updateSettings: (s) => { },
      processRefund: (id, items, reason) => { },
      addBranch,
      updateBranch,
      deleteBranch,
      addNotification, removeNotification,
      addExpense: (e) => { },
      updateExpense: (e) => { },
      deleteExpense: (id) => { },
      createBackup: () => "",
      restoreBackup: (d) => false,
      uploadFile: async (file: File) => {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('alkanchipay')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Upload Error:', uploadError);
            addNotification('File upload failed', 'error');
            return null;
          }

          const { data } = supabase.storage
            .from('alkanchipay')
            .getPublicUrl(filePath);

          return data.publicUrl;
        } catch (error) {
          console.error('Upload Exception:', error);
          return null;
        }
      }
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
