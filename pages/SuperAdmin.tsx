
import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Icons } from '../components/ui/Icons';
import { User, Role, Branch, PaymentMethod, TransactionStatus, Product, Expense, ExpenseStatus, ExpenseCategory } from '../types';
import { nanoid } from 'nanoid';
import { HeaderTools } from '../components/ui/HeaderTools';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const SuperAdmin = () => {
  const { 
    users, products, transactions, 
    addUser, updateUser, deleteUser, toggleUserStatus,
    settings, updateSettings, logout, 
    branches, addBranch, updateBranch, deleteBranch,
    addProduct, updateProduct, deleteProduct,
    categories, addCategory, deleteCategory, user,
    activityLogs, expenses, updateExpense, deleteExpense,
    expenseCategories, addExpenseCategory, deleteExpenseCategory,
    createBackup, restoreBackup, addNotification
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
  const [newCategoryName, setNewCategoryName] = useState('');

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
  const [filterStartDate, setFilterStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterCashier, setFilterCashier] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryBranchFilter, setInventoryBranchFilter] = useState('');
  const [expenseFilterStatus, setExpenseFilterStatus] = useState<string>('ALL');

  // Backup Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived Data
  const totalRevenue = transactions.reduce((acc, t) => acc + t.total, 0);

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
  
  // Backup Handlers
  const handleBackup = () => {
      const json = createBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `alkanchipay_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      addNotification('Full system backup downloaded', 'success');
  };

  const handleRestoreClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          const content = ev.target?.result as string;
          if(content) restoreBackup(content);
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset
  };

  const handleGenerateBranchFinancials = (branch: Branch, mode: 'pdf' | 'print') => {
      const start = new Date(filterStartDate).getTime();
      const end = new Date(filterEndDate).getTime() + 86400000;
      
      const bTransactions = transactions.filter(t => {
          const d = new Date(t.date).getTime();
          return t.storeId === branch.id && d >= start && d <= end;
      });
      
      const bExpenses = expenses.filter(e => {
          const d = new Date(e.date).getTime();
          return e.storeId === branch.id && e.status === ExpenseStatus.APPROVED && d >= start && d <= end;
      });

      const revenue = bTransactions.reduce((sum, t) => sum + t.total, 0);
      const totalExpenses = bExpenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = revenue - totalExpenses;

      // Prepare Data
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text(settings.name, 14, 15);
      doc.setFontSize(14); doc.text(`Financial Report: ${branch.name}`, 14, 22);
      doc.setFontSize(10); doc.text(`Period: ${filterStartDate} to ${filterEndDate}`, 14, 28);
      doc.text(`Generated by: ${user?.name} on ${new Date().toLocaleString()}`, 14, 33);

      autoTable(doc, {
          head: [['Metric', 'Amount']],
          body: [
              ['Total Revenue (Sales)', `${settings.currency}${revenue.toFixed(2)}`],
              ['Total Operational Expenses', `${settings.currency}${totalExpenses.toFixed(2)}`],
              ['Net Profit', `${settings.currency}${netProfit.toFixed(2)}`]
          ],
          startY: 40,
          theme: 'grid',
          headStyles: { fillColor: [40, 40, 40] }
      });

      // Expense Breakdown
      const expenseBreakdown = bExpenses.reduce((acc: any, e) => {
          acc[e.categoryName || 'General'] = (acc[e.categoryName || 'General'] || 0) + e.amount;
          return acc;
      }, {});

      if (Object.keys(expenseBreakdown).length > 0) {
          doc.text("Expense Breakdown", 14, (doc as any).lastAutoTable.finalY + 10);
          autoTable(doc, {
              head: [['Category', 'Amount']],
              body: Object.entries(expenseBreakdown).map(([k, v]: any) => [k, `${settings.currency}${v.toFixed(2)}`]),
              startY: (doc as any).lastAutoTable.finalY + 15,
              theme: 'grid'
          });
      }

      if (mode === 'pdf') {
          doc.save(`Financials_${branch.name}_${filterStartDate}.pdf`);
      } else {
          doc.autoPrint();
          window.open(doc.output('bloburl'), '_blank');
      }
  };

  const handleUpdateSettings = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      updateSettings({ 
          ...settings,
          name: formData.get('name') as string, 
          currency: formData.get('currency') as string, 
          address: formData.get('address') as string,
          logoUrl: formData.get('logoUrl') as string
      });
  };

  const handleUpdateSecurity = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      updateSettings({
          ...settings,
          security: {
              allowedIPs: formData.get('allowedIPs') as string,
              allowedDevices: formData.get('allowedDevices') as string,
              allowedRegions: formData.get('allowedRegions') as string
          }
      });
  };

  // Handlers for Forms...
  const handleSaveUser = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const userData: User = {
          id: editingUser ? editingUser.id : nanoid(),
          name: formData.get('name') as string,
          username: formData.get('username') as string,
          password: formData.get('password') as string,
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
  
  const handleUpdateProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    updateUser({ ...user, name: formData.get('name') as string, username: formData.get('username') as string });
    setIsEditingProfile(false);
  };
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
                            <th className="p-4">Role</th>
                            <th className="p-4">Branch</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-gray-200">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-gray-700/50">
                                <td className="p-4 font-bold text-white">{u.name} <br/><span className="text-gray-500 font-normal">@{u.username}</span></td>
                                <td className="p-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-xs">{u.role}</span></td>
                                <td className="p-4 text-blue-400">{branches.find(b => b.id === u.storeId)?.name || 'Global'}</td>
                                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.active ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{u.active ? 'Active' : 'Suspended'}</span></td>
                                <td className="p-4 text-right flex justify-end gap-3 items-center">
                                    <button onClick={()=>toggleUserStatus(u.id)} title={u.active ? "Suspend User" : "Activate User"} className={`${u.active ? 'text-orange-400 hover:text-orange-300' : 'text-green-400 hover:text-green-300'}`}>
                                        {u.active ? <Icons.Lock size={18}/> : <Icons.Unlock size={18}/>}
                                    </button>
                                    <button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="text-blue-400 hover:text-blue-300">Edit</button>
                                    <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          )}

          {activeTab === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
                      <h2 className="text-xl font-bold text-white mb-6">Global Platform Settings</h2>
                      <form onSubmit={handleUpdateSettings} className="space-y-6">
                          <div className="group relative">
                              <label className="block text-sm font-bold text-gray-400 mb-1">Platform Name</label>
                              <input name="name" defaultValue={settings.name} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded focus:border-blue-500 outline-none" required />
                          </div>
                          <div className="group relative">
                              <label className="block text-sm font-bold text-gray-400 mb-1">Currency Symbol</label>
                              <input name="currency" defaultValue={settings.currency} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded focus:border-blue-500 outline-none" required />
                          </div>
                          <div className="group relative">
                              <label className="block text-sm font-bold text-gray-400 mb-1">HQ Address</label>
                              <input name="address" defaultValue={settings.address} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded focus:border-blue-500 outline-none" required />
                          </div>
                          <div className="group relative">
                              <label className="block text-sm font-bold text-gray-400 mb-1">Logo URL</label>
                              <input name="logoUrl" defaultValue={settings.logoUrl} placeholder="https://example.com/logo.png" className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded focus:border-blue-500 outline-none" />
                          </div>
                          <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition">Save Global Settings</button>
                      </form>
                  </div>

                  <div className="space-y-6">
                      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
                          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Icons.DownloadCloud className="text-blue-400"/> Data Backup & Restore</h2>
                          <div className="p-4 bg-gray-900 border border-gray-600 rounded-lg mb-4 text-sm text-gray-300">
                              <p className="mb-2"><strong className="text-white">Full Backup:</strong> Exports all users, transactions, inventory, and settings to a JSON file.</p>
                              <p><strong className="text-white">Restore:</strong> Overwrites current system data with the backup file. Irreversible.</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <button onClick={handleBackup} className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"><Icons.Download size={20}/> Download Backup</button>
                              <button onClick={handleRestoreClick} className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"><Icons.Upload size={20}/> Restore Data</button>
                              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                          </div>
                      </div>

                       {/* Access Restriction */}
                      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
                          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Icons.Shield className="text-green-400"/> Security & Access Control</h2>
                          <form onSubmit={handleUpdateSecurity} className="space-y-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-2"><Icons.Globe size={14}/> Allowed IP Addresses (CSV)</label>
                                  <textarea name="allowedIPs" defaultValue={settings.security?.allowedIPs} placeholder="192.168.1.1, 10.0.0.5..." className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded h-20 text-sm"></textarea>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                       <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-2"><Icons.Monitor size={14}/> Device Restrictions</label>
                                       <input name="allowedDevices" defaultValue={settings.security?.allowedDevices} placeholder="Device IDs..." className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm"/>
                                  </div>
                                  <div>
                                       <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-2"><Icons.MapPin size={14}/> Allowed Regions</label>
                                       <input name="allowedRegions" defaultValue={settings.security?.allowedRegions} placeholder="Lagos, Abuja..." className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm"/>
                                  </div>
                              </div>
                              <button className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition text-sm">Save Security Rules</button>
                          </form>
                      </div>
                  </div>
              </div>
          )}

          {/* ... (Modal Logic Preserved) ... */}
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
                              <select name="role" defaultValue={editingUser?.role || Role.CASHIER} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded"><option value={Role.ADMIN}>Admin</option><option value={Role.CASHIER}>Cashier</option></select>
                              <select name="storeId" defaultValue={editingUser?.storeId || ''} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded"><option value="">No Branch (Global)</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                          </div>
                          <div><label className="block text-xs font-bold text-gray-400 mb-1">Expense Limit ({settings.currency})</label><input type="number" name="expenseLimit" defaultValue={editingUser?.expenseLimit} placeholder="0.00" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" /></div>
                          {editingUser && (<div className="flex items-center gap-2"><input type="checkbox" name="status" defaultChecked={editingUser.active} value="active" /><label className="text-gray-300 text-sm">Active Account</label></div>)}
                          <div className="flex gap-2 pt-2"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button><button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">Save</button></div>
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
                          <div><label className="block text-xs font-bold text-gray-400 mb-1">Branch Manager</label><select name="managerId" defaultValue={editingBranch?.managerId || ''} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded"><option value="">Select Manager</option>{potentialManagers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.username})</option>)}</select></div>
                          <div className="flex gap-2"><button type="button" onClick={() => setIsBranchModalOpen(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button><button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">Save</button></div>
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
                          <select name="category" defaultValue={editingProduct?.category || 'General'} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded"><option value="General">General</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                          <input type="number" name="costPrice" defaultValue={editingProduct?.costPrice} placeholder="Cost Price" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required step="0.01" />
                          <input type="number" name="sellingPrice" defaultValue={editingProduct?.sellingPrice} placeholder="Selling Price" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required step="0.01" />
                          <input type="number" name="stock" defaultValue={editingProduct?.stock} placeholder="Initial Stock" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                          <input type="number" name="minStockAlert" defaultValue={editingProduct?.minStockAlert || 5} placeholder="Low Stock Alert" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                          <select name="storeId" defaultValue={editingProduct?.storeId || ''} className="col-span-2 w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required><option value="">Select Branch</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                          <div className="col-span-2 flex gap-2 mt-4"><button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button><button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">Save Product</button></div>
                      </form>
                  </div>
              </div>
          )}
          
    </div>
  );
};
