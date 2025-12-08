
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Icons } from '../components/ui/Icons';
import { User, Role, Branch, PaymentMethod, TransactionStatus, Product, Expense, ExpenseStatus, ExpenseCategory } from '../types';
import { nanoid } from 'nanoid';
import { HeaderTools } from '../components/ui/HeaderTools';

export const SuperAdmin = () => {
  const { 
    users, products, transactions, 
    addUser, updateUser, deleteUser, 
    settings, updateSettings, logout, 
    branches, addBranch, updateBranch, deleteBranch,
    addProduct, updateProduct, deleteProduct,
    categories, addCategory, deleteCategory, user,
    activityLogs, expenses, updateExpense, deleteExpense,
    expenseCategories, addExpenseCategory, deleteExpenseCategory
  } = useStore();
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCategorySidebar, setShowCategorySidebar] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Expense Management State
  const [expenseSubTab, setExpenseSubTab] = useState<'requests' | 'categories' | 'summary'>('requests');
  const [newExpCatName, setNewExpCatName] = useState('');
  const [newExpCatDesc, setNewExpCatDesc] = useState('');

  // Branch Inventory Details Modal
  const [selectedBranchForDetails, setSelectedBranchForDetails] = useState<Branch | null>(null);

  // View & Nav State
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'branches' | 'transactions' | 'settings' | 'inventory' | 'profile' | 'activity' | 'expenses'>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCashier, setFilterCashier] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryBranchFilter, setInventoryBranchFilter] = useState('');
  const [expenseFilterStatus, setExpenseFilterStatus] = useState<string>('ALL');

  // Derived Data
  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.date).getTime();
    const start = filterStartDate ? new Date(filterStartDate).getTime() : 0;
    const end = filterEndDate ? new Date(filterEndDate).getTime() + 86400000 : Infinity;
    return tDate >= start && tDate <= end && (!filterCashier || t.cashierId === filterCashier);
  });

  const recentGlobalTransactions = [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  const recentSystemActivities = [...activityLogs].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  const filteredInventory = products.filter(p => {
    const search = inventorySearch.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search);
    const matchesBranch = inventoryBranchFilter ? p.storeId === inventoryBranchFilter : true;
    return matchesSearch && matchesBranch;
  });

  const filteredExpenses = expenses.filter(e => {
      const matchStatus = expenseFilterStatus === 'ALL' || e.status === expenseFilterStatus;
      return matchStatus;
  });

  const getBranchMetrics = (branchId: string) => {
      const branchProducts = products.filter(p => p.storeId === branchId);
      const totalCost = branchProducts.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);
      const totalSales = branchProducts.reduce((sum, p) => sum + (p.sellingPrice * p.stock), 0);
      const totalItems = branchProducts.length;
      return { totalCost, totalSales, totalItems };
  };

  const branchFinancials = branches.map(b => {
      const bTxs = transactions.filter(t => t.storeId === b.id);
      const bExps = expenses.filter(e => e.storeId === b.id && e.status === ExpenseStatus.APPROVED);
      const revenue = bTxs.reduce((sum, t) => sum + t.total, 0);
      const totalExpenses = bExps.reduce((sum, e) => sum + e.amount, 0);
      return { branch: b, revenue, totalExpenses, profit: revenue - totalExpenses };
  });

  const branchDetailsProducts = selectedBranchForDetails 
    ? products.filter(p => p.storeId === selectedBranchForDetails.id) 
    : [];

  const handleExportPlatformData = () => {
    const headers = ['Transaction ID', 'Date', 'Store/Cashier', 'Items Count', 'Payment Method', 'Status', 'Total Amount'];
    const rows = filteredTransactions.map(t => [
      t.id, new Date(t.date).toLocaleString(), t.cashierName, t.items.length, t.paymentMethod, t.status, t.total.toFixed(2)
    ]);
    downloadCSV([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `platform_data.csv`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
  };

  // Handlers
  const handleSaveUser = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const userData: User = {
          id: editingUser ? editingUser.id : nanoid(),
          name: formData.get('name') as string,
          username: formData.get('username') as string,
          password: formData.get('password') as string, // Added password field
          role: formData.get('role') as Role,
          active: formData.get('status') === 'active',
          storeId: formData.get('storeId') as string,
          expenseLimit: parseFloat(formData.get('expenseLimit') as string) || 0
      };
      if (editingUser) updateUser(userData); else addUser(userData);
      setIsModalOpen(false); setEditingUser(null);
  };
  const handleSaveBranch = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const branchData: Branch = {
          id: editingBranch ? editingBranch.id : nanoid(),
          name: formData.get('name') as string,
          address: formData.get('address') as string,
          phone: formData.get('phone') as string,
          managerId: formData.get('managerId') as string
      };
      if (editingBranch) updateBranch(branchData); else addBranch(branchData);
      setIsBranchModalOpen(false); setEditingBranch(null);
  };
  const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const productData: Product = {
          id: editingProduct ? editingProduct.id : nanoid(),
          sku: formData.get('sku') as string,
          name: formData.get('name') as string,
          category: formData.get('category') as string,
          costPrice: parseFloat(formData.get('costPrice') as string),
          sellingPrice: parseFloat(formData.get('sellingPrice') as string),
          stock: parseInt(formData.get('stock') as string),
          minStockAlert: parseInt(formData.get('minStockAlert') as string),
          storeId: formData.get('storeId') as string
      };
      if (editingProduct) updateProduct(productData); else addProduct(productData);
      setIsProductModalOpen(false); setEditingProduct(null);
  };
  const handleUpdateSettings = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      updateSettings({ name: formData.get('name') as string, currency: formData.get('currency') as string, address: formData.get('address') as string });
  };
  const handleUpdateProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    updateUser({ ...user, name: formData.get('name') as string, username: formData.get('username') as string });
    setIsEditingProfile(false);
  };
  const [newCategoryName, setNewCategoryName] = useState('');
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if(newCategoryName.trim()) { addCategory(newCategoryName.trim()); setNewCategoryName(''); }
  };
  const handleAddExpenseCategory = (e: React.FormEvent) => {
      e.preventDefault();
      if(newExpCatName.trim()) {
          addExpenseCategory({ id: nanoid(), name: newExpCatName, description: newExpCatDesc });
          setNewExpCatName(''); setNewExpCatDesc('');
      }
  };

  const potentialManagers = users.filter(u => u.role === Role.ADMIN || u.role === Role.SUPER_ADMIN);
  const totalRevenue = transactions.reduce((acc, t) => acc + t.total, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex font-sans">
      {/* Sidebar */}
      <aside className={`bg-gray-800 border-r border-gray-700 flex flex-col fixed h-full z-20 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
             {!isSidebarCollapsed && <h1 className="text-xl font-bold text-white flex items-center gap-2 truncate"><Icons.Settings className="text-red-500" /> AlkanchiPay</h1>}
             {isSidebarCollapsed && <Icons.Settings className="text-red-500 mx-auto" />}
             <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-gray-400 hover:text-white">
                 {isSidebarCollapsed ? <Icons.ChevronRight size={20} /> : <Icons.ChevronLeft size={20} />}
             </button>
          </div>
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {[
                { id: 'overview', icon: Icons.Dashboard, label: 'Overview' },
                { id: 'branches', icon: Icons.Store, label: 'Branches' },
                { id: 'users', icon: Icons.Users, label: 'Users' },
                { id: 'inventory', icon: Icons.Inventory, label: 'Global Inventory' },
                { id: 'transactions', icon: Icons.Receipt, label: 'Transactions' },
                { id: 'expenses', icon: Icons.Expenses, label: 'Expenses' },
                { id: 'activity', icon: Icons.Activity, label: 'Activity Logs' },
                { id: 'settings', icon: Icons.Settings, label: 'Settings' },
                { id: 'profile', icon: Icons.User, label: 'My Profile' },
              ].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${activeTab === item.id ? 'bg-red-600 text-white' : 'hover:bg-gray-700 text-gray-300'} ${isSidebarCollapsed ? 'justify-center' : ''}`} title={item.label}>
                  <item.icon size={20} />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </button>
              ))}
          </nav>
          <div className="p-4 border-t border-gray-700">
             <button onClick={logout} className={`flex items-center gap-2 text-gray-400 hover:text-white transition w-full px-2 py-2 rounded hover:bg-gray-700 ${isSidebarCollapsed ? 'justify-center' : ''}`}><Icons.Logout size={18} />{!isSidebarCollapsed && "Sign Out"}</button>
          </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 overflow-auto bg-gray-900 p-8 transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
          <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1 capitalize">{activeTab.replace(/([A-Z])/g, ' $1')}</h2>
                <p className="text-gray-400 text-sm">Super Admin Control Panel</p>
              </div>
              <div className="flex items-center gap-4">
                  <HeaderTools />
                  {(activeTab === 'overview' || activeTab === 'transactions') && (
                    <button onClick={handleExportPlatformData} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition">
                      <Icons.Download size={16} /> Export Data
                    </button>
                  )}
              </div>
          </header>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
              <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                          <p className="text-gray-400 text-sm mb-1 font-bold">Platform Revenue</p>
                          <h3 className="text-3xl font-extrabold text-white">{settings.currency}{totalRevenue.toLocaleString()}</h3>
                      </div>
                      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                          <p className="text-gray-400 text-sm mb-1 font-bold">Active Branches</p>
                          <h3 className="text-3xl font-extrabold text-blue-400">{branches.length}</h3>
                      </div>
                      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                          <p className="text-gray-400 text-sm mb-1 font-bold">Total Transactions</p>
                          <h3 className="text-3xl font-extrabold text-white">{transactions.length}</h3>
                      </div>
                      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                          <p className="text-gray-400 text-sm mb-1 font-bold">Pending Expenses</p>
                          <h3 className="text-3xl font-extrabold text-orange-400">{expenses.filter(e => e.status === ExpenseStatus.PENDING).length}</h3>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       {/* Recent Global Transactions */}
                       <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
                          <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                            <h3 className="font-bold text-lg text-white flex items-center gap-2"><Icons.History className="text-blue-400"/> Recent Sales (All Branches)</h3>
                            <button onClick={()=>setActiveTab('transactions')} className="text-xs font-bold text-blue-400 hover:text-white">View All</button>
                          </div>
                          <div className="overflow-x-auto max-h-[400px]">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-gray-900/50 text-gray-400 font-bold sticky top-0">
                                <tr>
                                  <th className="p-3">Branch</th>
                                  <th className="p-3">Cashier</th>
                                  <th className="p-3 text-right">Amount</th>
                                  <th className="p-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-700">
                                {recentGlobalTransactions.map(t => (
                                  <tr key={t.id} className="hover:bg-gray-700/50">
                                    <td className="p-3 font-medium text-white">{branches.find(b => b.id === t.storeId)?.name || 'Unknown'}</td>
                                    <td className="p-3 text-gray-400 text-xs">{t.cashierName} <br/><span className="text-[10px]">{new Date(t.date).toLocaleTimeString()}</span></td>
                                    <td className="p-3 text-right font-bold text-green-400">{settings.currency}{t.total.toFixed(2)}</td>
                                    <td className="p-3 text-center"><span className="bg-gray-700 text-xs px-2 py-0.5 rounded text-gray-300">{t.status}</span></td>
                                  </tr>
                                ))}
                                {recentGlobalTransactions.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">No transactions found.</td></tr>}
                              </tbody>
                            </table>
                          </div>
                       </div>

                       {/* System Alerts & Activity Feed */}
                       <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
                          <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                             <h3 className="font-bold text-lg text-white flex items-center gap-2"><Icons.Bell className="text-orange-400"/> System Alerts & Activities</h3>
                             <button onClick={()=>setActiveTab('activity')} className="text-xs font-bold text-blue-400 hover:text-white">View Logs</button>
                          </div>
                          <div className="overflow-y-auto max-h-[400px] p-0">
                             {recentSystemActivities.map(log => (
                               <div key={log.id} className="p-4 border-b border-gray-700 hover:bg-gray-700/30 transition flex gap-3">
                                  <div className={`mt-1 p-2 rounded-full h-fit ${log.action.includes('CREATED') ? 'bg-green-900/50 text-green-400' : log.action.includes('DELETED') ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'}`}>
                                     {log.action.includes('USER') ? <Icons.User size={16}/> : <Icons.Activity size={16}/>}
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-gray-200">{log.action.replace(/_/g, ' ')}</p>
                                     <p className="text-xs text-gray-400 mb-1">{log.details}</p>
                                     <p className="text-[10px] text-gray-500 font-mono">{new Date(log.timestamp).toLocaleString()} by {log.userName}</p>
                                  </div>
                               </div>
                             ))}
                             {recentSystemActivities.length === 0 && <p className="p-6 text-center text-gray-500">No system activity logged yet.</p>}
                          </div>
                       </div>
                   </div>
              </div>
          )}

          {/* BRANCHES TAB */}
          {activeTab === 'branches' && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">Branch Locations & Valuation</h2>
                    <button onClick={() => { setEditingBranch(null); setIsBranchModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-bold"><Icons.Add size={16} /> Add Branch</button>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold">
                        <tr>
                            <th className="p-4">Branch Name</th>
                            <th className="p-4 text-center">Total Products</th>
                            <th className="p-4 text-right">Inventory Cost</th>
                            <th className="p-4 text-right">Inventory Sales</th>
                            <th className="p-4">Manager</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-gray-200">
                        {branches.map(b => {
                            const metrics = getBranchMetrics(b.id);
                            return (
                                <tr key={b.id} className="hover:bg-gray-700/50 transition cursor-pointer group" onClick={() => setSelectedBranchForDetails(b)}>
                                    <td className="p-4 font-bold text-white flex items-center gap-2 group-hover:text-blue-400">
                                        <Icons.Store size={16}/> {b.name}
                                    </td>
                                    <td className="p-4 text-center">{metrics.totalItems}</td>
                                    <td className="p-4 text-right text-gray-300">{settings.currency}{metrics.totalCost.toLocaleString()}</td>
                                    <td className="p-4 text-right font-bold text-green-400">{settings.currency}{metrics.totalSales.toLocaleString()}</td>
                                    <td className="p-4 text-blue-400 font-medium">{users.find(u => u.id === b.managerId)?.name || 'Unassigned'}</td>
                                    <td className="p-4 text-right flex justify-end gap-3" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => { setEditingBranch(b); setIsBranchModalOpen(true); }} className="text-blue-400 hover:text-blue-300 font-medium">Edit</button>
                                        <button onClick={() => deleteBranch(b.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={18} /></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
              </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">User Management</h2>
                    <button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-bold"><Icons.Add size={16} /> Add User</button>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Username</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Branch</th>
                            <th className="p-4 text-center">Expense Limit</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-gray-200">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-gray-700/50">
                                <td className="p-4 font-bold text-white">{u.name}</td>
                                <td className="p-4 text-gray-400">{u.username}</td>
                                <td className="p-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-xs">{u.role}</span></td>
                                <td className="p-4 text-blue-400">{branches.find(b => b.id === u.storeId)?.name || 'Global'}</td>
                                <td className="p-4 text-center">{u.expenseLimit ? `${settings.currency}${u.expenseLimit}` : 'None'}</td>
                                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.active ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{u.active ? 'Active' : 'Inactive'}</span></td>
                                <td className="p-4 text-right flex justify-end gap-3">
                                    <button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="text-blue-400 hover:text-blue-300">Edit</button>
                                    <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
              <div className="flex gap-6 h-full">
                  <div className={`${showCategorySidebar ? 'w-64' : 'w-0 hidden'} bg-gray-800 rounded-xl border border-gray-700 p-4 transition-all duration-300`}>
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-white">Categories</h3>
                          <button onClick={()=>setShowCategorySidebar(false)} className="text-gray-400"><Icons.Close size={16}/></button>
                      </div>
                      <div className="space-y-2 mb-4 max-h-[60vh] overflow-y-auto">
                          {categories.map(c => (
                              <div key={c.id} className="flex justify-between items-center bg-gray-700 p-2 rounded text-sm text-gray-200">
                                  <span>{c.name}</span>
                                  <button onClick={()=>deleteCategory(c.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={14}/></button>
                              </div>
                          ))}
                      </div>
                      <form onSubmit={handleAddCategory} className="flex gap-2">
                          <input className="w-full bg-gray-700 border-none rounded text-sm p-2 text-white placeholder-gray-400" placeholder="New Category" value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)} />
                          <button className="bg-green-600 text-white p-2 rounded hover:bg-green-500"><Icons.Plus size={16}/></button>
                      </form>
                  </div>
                  
                  <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 flex flex-col overflow-hidden">
                       <div className="p-4 border-b border-gray-700 flex gap-4 items-center">
                           {!showCategorySidebar && <button onClick={()=>setShowCategorySidebar(true)} className="bg-gray-700 p-2 rounded text-white"><Icons.Menu size={20}/></button>}
                           <div className="relative flex-1">
                               <Icons.Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                               <input type="text" placeholder="Search Global Inventory..." className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} />
                           </div>
                           <select className="bg-gray-900 border border-gray-600 text-white p-2 rounded-lg" value={inventoryBranchFilter} onChange={e => setInventoryBranchFilter(e.target.value)}>
                               <option value="">All Branches</option>
                               {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                           </select>
                           <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Icons.Add size={18} /> Add Product</button>
                       </div>
                       <div className="flex-1 overflow-auto">
                           <table className="w-full text-left text-sm">
                               <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold sticky top-0">
                                   <tr>
                                       <th className="p-4">Product</th>
                                       <th className="p-4">SKU</th>
                                       <th className="p-4">Branch</th>
                                       <th className="p-4 text-right">Cost</th>
                                       <th className="p-4 text-right">Price</th>
                                       <th className="p-4 text-center">Stock</th>
                                       <th className="p-4 text-right">Actions</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-700 text-gray-200">
                                   {filteredInventory.map(p => (
                                       <tr key={p.id} className="hover:bg-gray-700/50">
                                           <td className="p-4 font-bold text-white">{p.name}</td>
                                           <td className="p-4 text-gray-400 font-mono text-xs">{p.sku}</td>
                                           <td className="p-4 text-blue-300">{branches.find(b => b.id === p.storeId)?.name}</td>
                                           <td className="p-4 text-right">{settings.currency}{p.costPrice.toFixed(2)}</td>
                                           <td className="p-4 text-right text-green-400">{settings.currency}{p.sellingPrice.toFixed(2)}</td>
                                           <td className="p-4 text-center"><span className={`px-2 py-0.5 rounded text-xs font-bold ${p.stock < p.minStockAlert ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>{p.stock}</span></td>
                                           <td className="p-4 text-right flex justify-end gap-3">
                                               <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="text-blue-400 hover:text-blue-300">Edit</button>
                                               <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={18} /></button>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                  </div>
              </div>
          )}

          {/* ACTIVITY LOGS TAB */}
          {activeTab === 'activity' && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="p-6 border-b border-gray-700"><h2 className="text-lg font-bold text-white">System Activity Logs</h2></div>
                  <div className="max-h-[70vh] overflow-y-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold sticky top-0">
                              <tr>
                                  <th className="p-4">Time</th>
                                  <th className="p-4">User</th>
                                  <th className="p-4">Action</th>
                                  <th className="p-4">Details</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700 text-gray-300">
                              {activityLogs.map(log => (
                                  <tr key={log.id} className="hover:bg-gray-700/50">
                                      <td className="p-4 text-gray-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                      <td className="p-4 font-bold text-white">{log.userName} <span className="text-xs text-gray-500 font-normal">({log.userRole})</span></td>
                                      <td className="p-4"><span className="bg-gray-700 px-2 py-1 rounded text-xs font-mono">{log.action}</span></td>
                                      <td className="p-4 text-gray-300">{log.details}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === 'transactions' && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden p-6">
                   <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
                        <input type="date" className="bg-gray-700 border border-gray-600 text-white p-2 rounded text-sm" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                        <input type="date" className="bg-gray-700 border border-gray-600 text-white p-2 rounded text-sm" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                        <select className="bg-gray-700 border border-gray-600 text-white p-2 rounded text-sm" value={filterCashier} onChange={e => setFilterCashier(e.target.value)}><option value="">All Users</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                   </div>
                   <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Branch</th>
                                    <th className="p-4">Cashier</th>
                                    <th className="p-4">Total</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700 text-gray-200">
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-700/50">
                                        <td className="p-4 text-gray-400">{new Date(t.date).toLocaleString()}</td>
                                        <td className="p-4 text-blue-400">{branches.find(b => b.id === t.storeId)?.name}</td>
                                        <td className="p-4">{t.cashierName}</td>
                                        <td className="p-4 font-bold text-green-400">{settings.currency}{t.total.toFixed(2)}</td>
                                        <td className="p-4"><span className="bg-gray-700 px-2 py-1 rounded text-xs">{t.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                   </div>
              </div>
          )}

          {/* EXPENSES TAB */}
          {activeTab === 'expenses' && (
              <div className="space-y-6">
                  {/* Expense Nav */}
                  <div className="flex gap-4 border-b border-gray-700 pb-2">
                      <button onClick={() => setExpenseSubTab('requests')} className={`px-4 py-2 font-bold ${expenseSubTab === 'requests' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}>Requests</button>
                      <button onClick={() => setExpenseSubTab('categories')} className={`px-4 py-2 font-bold ${expenseSubTab === 'categories' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}>Categories</button>
                      <button onClick={() => setExpenseSubTab('summary')} className={`px-4 py-2 font-bold ${expenseSubTab === 'summary' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}>Financial Summary</button>
                  </div>

                  {expenseSubTab === 'requests' && (
                      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                          <div className="p-6 border-b border-gray-700 flex flex-col md:flex-row justify-between gap-4">
                              <h2 className="text-lg font-bold text-white">Global Expense Requests</h2>
                              <div className="flex gap-2">
                                  <select className="bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" value={expenseFilterStatus} onChange={e => setExpenseFilterStatus(e.target.value)}>
                                      <option value="ALL">All Status</option>
                                      <option value={ExpenseStatus.PENDING}>Pending</option>
                                      <option value={ExpenseStatus.APPROVED}>Approved</option>
                                      <option value={ExpenseStatus.REJECTED}>Rejected</option>
                                  </select>
                              </div>
                          </div>
                          <table className="w-full text-left text-sm">
                              <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold">
                                  <tr>
                                      <th className="p-4">Date</th>
                                      <th className="p-4">Description</th>
                                      <th className="p-4">Category</th>
                                      <th className="p-4">Branch</th>
                                      <th className="p-4">Amount</th>
                                      <th className="p-4">Requested By</th>
                                      <th className="p-4">Status</th>
                                      <th className="p-4 text-right">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-700 text-gray-200">
                                  {filteredExpenses.map(exp => (
                                      <tr key={exp.id} className="hover:bg-gray-700/50">
                                          <td className="p-4 text-gray-400">{new Date(exp.date).toLocaleDateString()}</td>
                                          <td className="p-4 font-bold text-white">{exp.description}</td>
                                          <td className="p-4 text-gray-400">{exp.categoryName || 'General'}</td>
                                          <td className="p-4 text-blue-300">{branches.find(b => b.id === exp.storeId)?.name || 'N/A'}</td>
                                          <td className="p-4 font-bold">{settings.currency}{exp.amount.toFixed(2)}</td>
                                          <td className="p-4">{exp.requestedByName}</td>
                                          <td className="p-4">
                                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                  exp.status === ExpenseStatus.APPROVED ? 'bg-green-900/50 text-green-400' :
                                                  exp.status === ExpenseStatus.REJECTED ? 'bg-red-900/50 text-red-400' :
                                                  'bg-orange-900/50 text-orange-400'
                                              }`}>{exp.status}</span>
                                          </td>
                                          <td className="p-4 text-right">
                                              {exp.status === ExpenseStatus.PENDING && (
                                                  <div className="flex justify-end gap-2">
                                                      <button onClick={() => updateExpense({ ...exp, status: ExpenseStatus.APPROVED })} className="text-green-500 hover:text-green-400" title="Approve"><Icons.CheckSquare size={18}/></button>
                                                      <button onClick={() => updateExpense({ ...exp, status: ExpenseStatus.REJECTED })} className="text-red-500 hover:text-red-400" title="Reject"><Icons.XSquare size={18}/></button>
                                                  </div>
                                              )}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}

                  {expenseSubTab === 'categories' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 h-fit">
                              <h3 className="font-bold text-lg text-white mb-4">Add Expense Category</h3>
                              <form onSubmit={handleAddExpenseCategory} className="space-y-4">
                                  <div>
                                      <label className="block text-sm font-bold text-gray-400 mb-1">Category Name</label>
                                      <input className="w-full bg-gray-900 border border-gray-600 rounded text-white p-2" value={newExpCatName} onChange={e => setNewExpCatName(e.target.value)} required />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-gray-400 mb-1">Description (Optional)</label>
                                      <textarea className="w-full bg-gray-900 border border-gray-600 rounded text-white p-2" value={newExpCatDesc} onChange={e => setNewExpCatDesc(e.target.value)} rows={3} />
                                  </div>
                                  <button className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-500">Create Category</button>
                              </form>
                          </div>
                          <div className="md:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
                              <h3 className="font-bold text-lg text-white mb-4">Manage Categories</h3>
                              <div className="space-y-3">
                                  {expenseCategories.map(cat => (
                                      <div key={cat.id} className="flex justify-between items-center bg-gray-700 p-4 rounded-lg border border-gray-600">
                                          <div>
                                              <p className="font-bold text-white">{cat.name}</p>
                                              <p className="text-sm text-gray-400">{cat.description}</p>
                                          </div>
                                          <button onClick={() => deleteExpenseCategory(cat.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={20}/></button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}

                  {expenseSubTab === 'summary' && (
                      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                          <div className="p-6 border-b border-gray-700"><h2 className="text-lg font-bold text-white">Branch Financial Summary</h2></div>
                          <table className="w-full text-left text-sm">
                              <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold">
                                  <tr>
                                      <th className="p-4">Branch Name</th>
                                      <th className="p-4 text-right">Total Revenue</th>
                                      <th className="p-4 text-right">Total Expenses (Approved)</th>
                                      <th className="p-4 text-right">Net Profit</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-700 text-gray-200">
                                  {branchFinancials.map((f, i) => (
                                      <tr key={i} className="hover:bg-gray-700/50">
                                          <td className="p-4 font-bold text-white flex items-center gap-2"><Icons.Store size={16}/> {f.branch.name}</td>
                                          <td className="p-4 text-right text-green-400 font-bold">{settings.currency}{f.revenue.toFixed(2)}</td>
                                          <td className="p-4 text-right text-red-400 font-bold">{settings.currency}{f.totalExpenses.toFixed(2)}</td>
                                          <td className="p-4 text-right font-extrabold text-blue-400">{settings.currency}{f.profit.toFixed(2)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}
              </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto bg-gray-800 rounded-xl border border-gray-700 p-8">
                  <h2 className="text-xl font-bold text-white mb-6">Global Platform Settings</h2>
                  <form onSubmit={handleUpdateSettings} className="space-y-6">
                      <div className="group relative">
                          <label className="block text-sm font-bold text-gray-400 mb-1">Platform Name <Icons.Help size={14} className="inline ml-1 text-gray-500 cursor-help" /></label>
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs p-2 rounded w-64 z-10">The main name displayed on the login screen and receipts.</div>
                          <input name="name" defaultValue={settings.name} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded focus:border-blue-500 outline-none" required />
                      </div>
                      <div className="group relative">
                          <label className="block text-sm font-bold text-gray-400 mb-1">Currency Symbol <Icons.Help size={14} className="inline ml-1 text-gray-500 cursor-help" /></label>
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs p-2 rounded w-64 z-10">The currency symbol used across the platform (e.g., ₦, $, €).</div>
                          <input name="currency" defaultValue={settings.currency} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded focus:border-blue-500 outline-none" required />
                      </div>
                      <div className="group relative">
                          <label className="block text-sm font-bold text-gray-400 mb-1">HQ Address <Icons.Help size={14} className="inline ml-1 text-gray-500 cursor-help" /></label>
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs p-2 rounded w-64 z-10">The main headquarters address displayed on reports.</div>
                          <input name="address" defaultValue={settings.address} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded focus:border-blue-500 outline-none" required />
                      </div>
                      <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition">Save Global Settings</button>
                  </form>
              </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
              <div className="max-w-xl mx-auto bg-gray-800 rounded-xl border border-gray-700 p-8">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-700">
                      <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-gray-400">
                          <Icons.User size={40}/>
                      </div>
                      <div>
                          <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
                          <p className="text-gray-400 capitalize">{user?.role} - Super Admin</p>
                      </div>
                      <button onClick={()=>setIsEditingProfile(!isEditingProfile)} className="ml-auto text-blue-400 hover:text-blue-300 font-bold text-sm">
                          {isEditingProfile ? 'Cancel' : 'Edit Profile'}
                      </button>
                  </div>
                  
                  {isEditingProfile ? (
                      <form onSubmit={handleUpdateProfile} className="space-y-4">
                          <div>
                              <label className="block text-sm font-bold text-gray-400 mb-1">Full Name</label>
                              <input name="name" defaultValue={user?.name} className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-white" required />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-400 mb-1">Username</label>
                              <input name="username" defaultValue={user?.username} className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-white" required />
                          </div>
                          <button className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-500">Save Changes</button>
                      </form>
                  ) : (
                      <div className="space-y-4">
                          <div className="flex justify-between p-3 bg-gray-900 rounded border border-gray-700">
                              <span className="text-gray-400 font-medium">Username</span>
                              <span className="font-bold text-white">{user?.username}</span>
                          </div>
                          <div className="flex justify-between p-3 bg-gray-900 rounded border border-gray-700">
                              <span className="text-gray-400 font-medium">Account Status</span>
                              <span className="font-bold text-green-500 flex items-center gap-1"><Icons.Check size={14}/> Active</span>
                          </div>
                      </div>
                  )}
              </div>
          )}
      </main>

      {/* Branch Details Modal */}
      {selectedBranchForDetails && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-600">
                  <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-bold text-white">{selectedBranchForDetails.name} Inventory</h3>
                        <p className="text-gray-400 text-sm">Detailed Product List</p>
                      </div>
                      <button onClick={() => setSelectedBranchForDetails(null)} className="text-gray-400 hover:text-white"><Icons.Close size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-auto p-6">
                      <table className="w-full text-left text-sm text-gray-200">
                          <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold sticky top-0">
                              <tr>
                                  <th className="p-3">Product Name</th>
                                  <th className="p-3">SKU</th>
                                  <th className="p-3 text-right">Cost Price</th>
                                  <th className="p-3 text-right">Selling Price</th>
                                  <th className="p-3 text-center">Stock</th>
                                  <th className="p-3">Last Updated</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                              {branchDetailsProducts.map(p => (
                                  <tr key={p.id} className="hover:bg-gray-700/50">
                                      <td className="p-3 font-bold text-white">{p.name}</td>
                                      <td className="p-3 font-mono text-gray-400 text-xs">{p.sku}</td>
                                      <td className="p-3 text-right">{settings.currency}{p.costPrice.toFixed(2)}</td>
                                      <td className="p-3 text-right text-green-400">{settings.currency}{p.sellingPrice.toFixed(2)}</td>
                                      <td className="p-3 text-center">
                                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.stock < p.minStockAlert ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>{p.stock}</span>
                                      </td>
                                      <td className="p-3 text-gray-400 text-xs">{p.updatedAt ? new Date(p.updatedAt).toLocaleString() : 'N/A'}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
                  <div className="p-6 border-t border-gray-700 bg-gray-800 rounded-b-xl flex justify-end">
                      <button onClick={() => setSelectedBranchForDetails(null)} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold">Close Details</button>
                  </div>
              </div>
          </div>
      )}

      {/* User Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-8 rounded-xl w-[400px] border border-gray-700">
                  <h2 className="text-xl font-bold text-white mb-4">{editingUser ? 'Edit User' : 'Add New User'}</h2>
                  <form onSubmit={handleSaveUser} className="space-y-4">
                      <input name="name" defaultValue={editingUser?.name} placeholder="Full Name" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                      <input name="username" defaultValue={editingUser?.username} placeholder="Username" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                      {!editingUser && <input name="password" type="password" placeholder="Password" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />}
                      <div className="grid grid-cols-2 gap-2">
                          <select name="role" defaultValue={editingUser?.role || Role.CASHIER} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded">
                              <option value={Role.ADMIN}>Admin</option>
                              <option value={Role.CASHIER}>Cashier</option>
                          </select>
                          <select name="storeId" defaultValue={editingUser?.storeId || ''} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded">
                              <option value="">No Branch (Global)</option>
                              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-400 mb-1">Expense Limit ({settings.currency})</label>
                          <input type="number" name="expenseLimit" defaultValue={editingUser?.expenseLimit} placeholder="0.00" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" />
                      </div>
                      {editingUser && (
                          <div className="flex items-center gap-2">
                              <input type="checkbox" name="status" defaultChecked={editingUser.active} value="active" />
                              <label className="text-gray-300 text-sm">Active Account</label>
                          </div>
                      )}
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button>
                          <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">Save</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Branch Modal */}
      {isBranchModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-8 rounded-xl w-96 border border-gray-700">
                  <h2 className="text-xl font-bold text-white mb-4">{editingBranch ? 'Edit Branch' : 'Add New Branch'}</h2>
                  <form onSubmit={handleSaveBranch} className="space-y-4">
                      <input name="name" defaultValue={editingBranch?.name} placeholder="Branch Name" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                      <input name="address" defaultValue={editingBranch?.address} placeholder="Address" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                      <input name="phone" defaultValue={editingBranch?.phone} placeholder="Phone" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" />
                      <div>
                          <label className="block text-xs font-bold text-gray-400 mb-1">Branch Manager</label>
                          <select name="managerId" defaultValue={editingBranch?.managerId || ''} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded">
                              <option value="">Select Manager</option>
                              {potentialManagers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.username})</option>)}
                          </select>
                      </div>
                      <div className="flex gap-2">
                          <button type="button" onClick={() => setIsBranchModalOpen(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button>
                          <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">Save</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Product Modal */}
      {isProductModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-8 rounded-xl w-[500px] border border-gray-700">
                  <h2 className="text-xl font-bold text-white mb-4">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                  <form onSubmit={handleSaveProduct} className="grid grid-cols-2 gap-4">
                      <input name="name" defaultValue={editingProduct?.name} placeholder="Product Name" className="col-span-2 w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                      <input name="sku" defaultValue={editingProduct?.sku} placeholder="SKU Code" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                      <select name="category" defaultValue={editingProduct?.category || 'General'} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded">
                          <option value="General">General</option>
                          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                      <input type="number" name="costPrice" defaultValue={editingProduct?.costPrice} placeholder="Cost Price" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required step="0.01" />
                      <input type="number" name="sellingPrice" defaultValue={editingProduct?.sellingPrice} placeholder="Selling Price" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required step="0.01" />
                      <input type="number" name="stock" defaultValue={editingProduct?.stock} placeholder="Initial Stock" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                      <input type="number" name="minStockAlert" defaultValue={editingProduct?.minStockAlert || 5} placeholder="Low Stock Alert" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                      <select name="storeId" defaultValue={editingProduct?.storeId || ''} className="col-span-2 w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required>
                          <option value="">Select Branch</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <div className="col-span-2 flex gap-2 mt-4">
                          <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button>
                          <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">Save Product</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
