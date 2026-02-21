
import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Icons } from '../components/ui/Icons';
import { User, Role, Branch, PaymentMethod, TransactionStatus, Product, Expense, ExpenseStatus, ExpenseCategory, UserRole, Permission, PurchaseOrder, PurchaseOrderStatus, ProductTransfer, ProductTransferStatus, Category, ProductType } from '../types';
import { nanoid } from 'nanoid';
import { HeaderTools } from '../components/ui/HeaderTools';
import { PurchaseOrderForm } from '../components/ui/PurchaseOrderForm';
import { PurchaseOrderReport } from '../components/ui/PurchaseOrderReport';
import { ProductTransferForm } from '../components/ui/ProductTransferForm';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const SuperAdmin = () => {
    const {
        users, products, transactions,
        addUser, updateUser, deleteUser, toggleUserStatus,
        settings, updateSettings, logout,
        branches, addBranch, updateBranch, deleteBranch,
        addProduct, updateProduct, deleteProduct,
        categories, addCategory, updateCategory, deleteCategory,
        productTypes, addProductType, updateProductType, deleteProductType,
        user,
        activityLogs, expenses, updateExpense, deleteExpense,
        expenseCategories, addExpenseCategory, deleteExpenseCategory,
        createBackup, restoreBackup, addNotification,
        roles, permissions, addRole, updateRole, deleteRole,
        updateUserPassword,
        purchaseOrders, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
        productTransfers, addProductTransfer, updateProductTransfer, deleteProductTransfer,
        deletedTransactions, getDeletedTransactions, restoreTransaction, purgeTransaction, deleteTransaction
    } = useStore();

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordChangeUserId, setPasswordChangeUserId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showCategorySidebar, setShowCategorySidebar] = useState(true);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isProductTypeModalOpen, setIsProductTypeModalOpen] = useState(false);
    const [editingProductType, setEditingProductType] = useState<ProductType | null>(null);
    const [inventorySubTab, setInventorySubTab] = useState<'products' | 'categories' | 'types'>('products');

    // Expense Management State
    const [expenseSubTab, setExpenseSubTab] = useState<'requests' | 'categories' | 'summary'>('requests');
    const [newExpCatName, setNewExpCatName] = useState('');
    const [newExpCatDesc, setNewExpCatDesc] = useState('');

    // Roles Modal
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<UserRole | null>(null);

    // Branch Inventory Details Modal
    const [selectedBranchForDetails, setSelectedBranchForDetails] = useState<Branch | null>(null);

    // Purchase Orders Modal
    const [isPurchaseOrderModalOpen, setIsPurchaseOrderModalOpen] = useState(false);
    const [editingPurchaseOrder, setEditingPurchaseOrder] = useState<PurchaseOrder | null>(null);
    const [purchaseOrderFilterStatus, setPurchaseOrderFilterStatus] = useState<string>('ALL');
    const [selectedPurchaseOrderForReport, setSelectedPurchaseOrderForReport] = useState<PurchaseOrder | null>(null);

    // Product Transfer Modal
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferFilterStatus, setTransferFilterStatus] = useState<string>('ALL');

    // View & Nav State
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'branches' | 'transactions' | 'settings' | 'inventory' | 'profile' | 'activity' | 'expenses' | 'purchases' | 'transfers' | 'roles' | 'recycleBin'>('overview');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Filters
    const [filterStartDate, setFilterStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterCashier, setFilterCashier] = useState('');
    const [inventorySearch, setInventorySearch] = useState('');
    const [inventoryBranchFilter, setInventoryBranchFilter] = useState('');
    const [expenseFilterStatus, setExpenseFilterStatus] = useState<string>('ALL');
    const [userSearch, setUserSearch] = useState('');
    const [branchSearch, setBranchSearch] = useState('');
    const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());

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

    const recentGlobalTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
    const recentSystemActivities = [...activityLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

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

    const filteredPurchaseOrders = purchaseOrders.filter(po => {
        const matchStatus = purchaseOrderFilterStatus === 'ALL' || po.status === purchaseOrderFilterStatus;
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
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            if (content) restoreBackup(content);
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
        
        const name = (formData.get('name') as string)?.trim();
        const username = (formData.get('username') as string)?.trim();
        const password = formData.get('password') as string;
        const role = formData.get('role') as string;
        const storeId = (formData.get('storeId') as string) || undefined;
        const expenseLimitStr = formData.get('expenseLimit') as string;
        
        // Validation
        if (!name) {
            addNotification('Name is required', 'error');
            return;
        }
        if (!username) {
            addNotification('Username is required', 'error');
            return;
        }
        if (!editingUser && (!password || password.length < 6)) {
            addNotification('Password must be at least 6 characters', 'error');
            return;
        }
        if (!role) {
            addNotification('Role is required', 'error');
            return;
        }
        
        const userData: Partial<User> = editingUser ? {
            id: editingUser.id,
            name,
            username,
            password: editingUser.password, // Keep existing password on edit
            role,
            active: formData.get('status') === 'active' || editingUser.active,
            storeId,
            expenseLimit: expenseLimitStr ? parseFloat(expenseLimitStr) : 0
        } : {
            name,
            username,
            password,
            role,
            active: true,
            storeId,
            expenseLimit: expenseLimitStr ? parseFloat(expenseLimitStr) : 0
        };
        
        if (editingUser) updateUser(userData as User); else addUser(userData);
        setIsModalOpen(false); setEditingUser(null);
    };

    const handleChangePassword = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addNotification('Passwords do not match', 'error');
            return;
        }
        if (newPassword.length < 6) {
            addNotification('Password must be at least 6 characters', 'error');
            return;
        }
        if (passwordChangeUserId) {
            updateUserPassword(passwordChangeUserId, newPassword);
            setIsPasswordModalOpen(false);
            setPasswordChangeUserId(null);
            setNewPassword('');
            setConfirmPassword('');
        }
    };
    const handleSaveBranch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const branchData: Partial<Branch> = editingBranch ? {
            id: editingBranch.id,
            name: formData.get('name') as string,
            address: formData.get('address') as string,
            phone: formData.get('phone') as string
        } : {
            // Don't send ID for new branches - let Supabase auto-generate
            name: formData.get('name') as string,
            address: formData.get('address') as string,
            phone: formData.get('phone') as string
        };
        if (editingBranch) updateBranch(branchData); else addBranch(branchData);
        setIsBranchModalOpen(false); setEditingBranch(null);
    };
    const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const productData: Partial<Product> = editingProduct ? {
            id: editingProduct.id,
            sku: formData.get('sku') as string,
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            category: formData.get('category') as string,
            costPrice: parseFloat(formData.get('costPrice') as string),
            sellingPrice: parseFloat(formData.get('sellingPrice') as string),
            stock: parseInt(formData.get('stock') as string),
            minStockAlert: parseInt(formData.get('minStockAlert') as string),
            storeId: formData.get('storeId') as string
        } : {
            // Don't send ID for new products - let Supabase auto-generate
            sku: formData.get('sku') as string,
            name: formData.get('name') as string,
            description: formData.get('description') as string,
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

    // Purchase Order Handlers
    const handleSavePurchaseOrder = (orderData: Omit<PurchaseOrder, 'id'>) => {
        if (editingPurchaseOrder) {
            updatePurchaseOrder({ ...orderData, id: editingPurchaseOrder.id });
        } else {
            addPurchaseOrder(orderData);
        }
        setIsPurchaseOrderModalOpen(false);
        setEditingPurchaseOrder(null);
    };

    const handleConvertPurchaseToInventory = (po: PurchaseOrder) => {
        if (po.convertedToInventory) {
            addNotification('This purchase order has already been converted to inventory', 'info');
            return;
        }

        // Convert each item to a product
        po.items.forEach(item => {
            const product: Omit<Product, 'id'> = {
                sku: `PO-${po.id.substring(0, 8)}-${item.serialNumber}`,
                name: item.itemName,
                category: 'Purchased Items',
                costPrice: item.storeCostPrice, // Use the stored cost price
                sellingPrice: item.storeSellingPrice, // Use the stored selling price
                stock: item.quantity,
                minStockAlert: Math.ceil(item.quantity * 0.2),
                updatedAt: new Date().toISOString()
            };
            addProduct(product);
        });

        // Mark purchase order as converted
        updatePurchaseOrder({
            ...po,
            convertedToInventory: true,
            convertedAt: new Date().toISOString()
        });

        addNotification(`Purchase order converted to inventory. ${po.items.length} product(s) added.`, 'success');
    };

    // Product Transfer Handlers
    const handleCreateTransfer = (transferData: {
        toBranchId: string;
        toBranchName: string;
        items: any[];
        notes?: string;
    }) => {
        if (!user) return;
        
        addProductTransfer({
            date: new Date().toISOString(),
            fromBranchId: undefined,
            fromBranchName: 'Central Inventory',
            toBranchId: transferData.toBranchId,
            toBranchName: transferData.toBranchName,
            items: transferData.items,
            status: 'PENDING' as any,
            createdBy: user.id,
            createdByName: user.name,
            notes: transferData.notes
        });
        
        setIsTransferModalOpen(false);
    };

    const filteredTransfers = productTransfers.filter(t => {
        if (transferFilterStatus === 'ALL') return true;
        return t.status === transferFilterStatus;
    });

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCategoryName.trim()) { addCategory(newCategoryName.trim()); setNewCategoryName(''); }
    };
    const handleAddExpenseCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (newExpCatName.trim()) {
            addExpenseCategory({ id: nanoid(), name: newExpCatName, description: newExpCatDesc });
            setNewExpCatName(''); setNewExpCatDesc('');
        }
    };

    const potentialManagers = users; // Allow any user to be picked (validation or auto-upgrade can happen later or manually)
    // Actually, let's keep it to 'Branch Manager' candidates but maybe highlight they need the role? 
    // User asked: "untill i try creating branch so that i can chose the user role to asign"
    // Effectively, we should allow picking ANY user, and if they are not a manager, maybe we should warn or just allow it (and update their role?)
    // For now, let's list ALL users so they can be assigned. 

    // Permissions Data (Static for now)
    // Permissions Data - Now dynamic from store
    // const rolePermissions = ... (Derived from roles state in UI)

    const handleSaveRole = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const roleName = (formData.get('name') as string)?.trim();
        const roleDescription = (formData.get('description') as string)?.trim() || '';
        
        // Validation
        if (!roleName) {
            addNotification('Role name is required', 'error');
            return;
        }
        
        // Check for duplicate role name (excluding current role if editing)
        const existingRole = roles.find(r => r.name.toLowerCase() === roleName.toLowerCase() && (!editingRole || r.id !== editingRole.id));
        if (existingRole) {
            addNotification('A role with this name already exists', 'error');
            return;
        }
        
        const selectedPerms = permissions.filter(p => formData.get(`perm_${p.id}`) === 'on').map(p => p.name);

        const roleData: UserRole = {
            id: editingRole ? editingRole.id : nanoid(),
            name: roleName,
            description: roleDescription,
            isSystemDefined: false,
            permissions: selectedPerms
        };

        if (editingRole) updateRole(roleData); else addRole(roleData);
        setIsRoleModalOpen(false); setEditingRole(null);
    };

    const handleDeleteRole = (id: string) => {
        if (confirm('Are you sure you want to delete this role? Users assigned to this role may lose access.')) {
            deleteRole(id);
        }
    };

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
                        { id: 'purchases', icon: Icons.ShoppingCart, label: 'Purchases' },
                        { id: 'transfers', icon: Icons.Send, label: 'Product Transfers' },
                        { id: 'transactions', icon: Icons.Receipt, label: 'Transactions' },
                        { id: 'expenses', icon: Icons.Expenses, label: 'Expenses' },
                        { id: 'activity', icon: Icons.Activity, label: 'Activity Logs' },
                        { id: 'recycleBin', icon: Icons.Delete, label: 'Recycle Bin' },
                        { id: 'settings', icon: Icons.Settings, label: 'Settings' },
                        { id: 'roles', icon: Icons.Shield, label: 'Roles & Permissions' },
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
                                    <h3 className="font-bold text-lg text-white flex items-center gap-2"><Icons.History className="text-blue-400" /> Recent Sales (All Branches)</h3>
                                    <button onClick={() => setActiveTab('transactions')} className="text-xs font-bold text-blue-400 hover:text-white">View All</button>
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
                                                    <td className="p-3 text-gray-400 text-xs">{t.cashierName} <br /><span className="text-[10px]">{new Date(t.date).toLocaleTimeString()}</span></td>
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
                                    <h3 className="font-bold text-lg text-white flex items-center gap-2"><Icons.Bell className="text-orange-400" /> System Alerts & Activities</h3>
                                    <button onClick={() => setActiveTab('activity')} className="text-xs font-bold text-blue-400 hover:text-white">View Logs</button>
                                </div>
                                <div className="overflow-y-auto max-h-[400px] p-0">
                                    {recentSystemActivities.map(log => (
                                        <div key={log.id} className="p-4 border-b border-gray-700 hover:bg-gray-700/30 transition flex gap-3">
                                            <div className={`mt-1 p-2 rounded-full h-fit ${log.action.includes('CREATED') ? 'bg-green-900/50 text-green-400' : log.action.includes('DELETED') ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'}`}>
                                                {log.action.includes('USER') ? <Icons.User size={16} /> : <Icons.Activity size={16} />}
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
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center gap-4">
                            <div className="flex gap-2 items-center">
                                <input placeholder="Search users by name or username..." className="bg-gray-900 border border-gray-600 text-white p-2 rounded w-96 text-sm" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                                <button onClick={() => setUserSearch('')} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1"><Icons.Close size={14} /> Clear</button>
                            </div>
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
                                {users.filter(u => {
                                    const search = userSearch.toLowerCase();
                                    return u.name.toLowerCase().includes(search) || u.username.toLowerCase().includes(search);
                                }).map(u => (
                                    <tr key={u.id} className="hover:bg-gray-700/50">
                                        <td className="p-4 font-bold text-white">{u.name} <br /><span className="text-gray-500 font-normal">@{u.username}</span></td>
                                        <td className="p-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-xs">{u.role === Role.ADMIN ? 'BRANCH MANAGER' : u.role}</span></td>
                                        <td className="p-4 text-blue-400">{branches.find(b => b.id === u.storeId)?.name || 'Global'}</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.active ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{u.active ? 'Active' : 'Suspended'}</span></td>
                                        <td className="p-4 text-right flex justify-end gap-3 items-center">
                                            <button onClick={() => toggleUserStatus(u.id)} title={u.active ? "Suspend User" : "Activate User"} className={`${u.active ? 'text-orange-400 hover:text-orange-300' : 'text-green-400 hover:text-green-300'}`}>
                                                {u.active ? <Icons.Lock size={18} /> : <Icons.Unlock size={18} />}
                                            </button>
                                            <button onClick={() => { setPasswordChangeUserId(u.id); setIsPasswordModalOpen(true); }} title="Change Password" className="text-yellow-400 hover:text-yellow-300"><Icons.Password size={18} /></button>
                                            <button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="text-blue-400 hover:text-blue-300">Edit</button>
                                            <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'branches' && (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center gap-4">
                            <div className="flex gap-2 items-center">
                                <input placeholder="Search branches..." className="bg-gray-900 border border-gray-600 text-white p-2 rounded w-96 text-sm" value={branchSearch} onChange={e => setBranchSearch(e.target.value)} />
                                <button onClick={() => setBranchSearch('')} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1"><Icons.Close size={14} /> Clear</button>
                            </div>
                            <button onClick={() => { setEditingBranch(null); setIsBranchModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-bold"><Icons.Add size={16} /> Add Branch</button>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4">Branch Name</th>
                                    <th className="p-4">Address</th>
                                    <th className="p-4">Manager</th>
                                    <th className="p-4">Inventory Value</th>
                                    <th className="p-4">Sales Revenue</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700 text-gray-200">
                                {branches.filter(b => {
                                    const search = branchSearch.toLowerCase();
                                    return b.name.toLowerCase().includes(search) || b.address.toLowerCase().includes(search);
                                }).map(b => {
                                    const metrics = getBranchMetrics(b.id);
                                    const financials = branchFinancials.find(f => f.branch.id === b.id);
                                    const manager = users.find(u => u.id === b.managerId);
                                    return (
                                        <tr key={b.id} className="hover:bg-gray-700/50 cursor-pointer" onClick={() => setSelectedBranchForDetails(b)}>
                                            <td className="p-4 font-bold text-white">{b.name}</td>
                                            <td className="p-4 text-gray-400">{b.address}</td>
                                            <td className="p-4 text-blue-400">{manager?.name || 'Unassigned'}</td>
                                            <td className="p-4 text-white">
                                                <div className="text-xs">Cost: {settings.currency}{metrics.totalCost.toFixed(2)}</div>
                                                <div className="text-xs text-green-400">Sales: {settings.currency}{metrics.totalSales.toFixed(2)}</div>
                                            </td>
                                            <td className="p-4 font-bold text-green-400">{settings.currency}{financials?.revenue.toFixed(2)}</td>
                                            <td className="p-4 text-right flex justify-end gap-3 items-center" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleGenerateBranchFinancials(b, 'print')} title="Print Financial Report"><Icons.Printer className="text-gray-400 hover:text-white" size={16} /></button>
                                                <button onClick={() => handleGenerateBranchFinancials(b, 'pdf')} title="Download Financial PDF"><Icons.FileText className="text-blue-400 hover:text-blue-300" size={16} /></button>
                                                <button onClick={() => { setEditingBranch(b); setIsBranchModalOpen(true); }} className="text-blue-400 hover:text-blue-300"><Icons.Settings size={16} /></button>
                                                <button onClick={() => deleteBranch(b.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={16} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
                        {/* Inventory Subtabs */}
                        <div className="p-4 border-b border-gray-700 flex gap-2">
                            <button onClick={() => setInventorySubTab('products')} className={`px-4 py-2 rounded-lg font-bold transition-colors ${inventorySubTab === 'products' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                📦 Products
                            </button>
                            <button onClick={() => setInventorySubTab('categories')} className={`px-4 py-2 rounded-lg font-bold transition-colors ${inventorySubTab === 'categories' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                📂 Categories
                            </button>
                            <button onClick={() => setInventorySubTab('types')} className={`px-4 py-2 rounded-lg font-bold transition-colors ${inventorySubTab === 'types' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                🏷️ Types
                            </button>
                        </div>

                        {/* Products Tab */}
                        {inventorySubTab === 'products' && (
                            <>
                                <div className="p-6 border-b border-gray-700 flex flex-wrap gap-4 items-center">
                                    <div className="flex gap-2 items-center">
                                        <input placeholder="Search Inventory..." className="bg-gray-900 border border-gray-600 text-white p-2 rounded w-64 text-sm" value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} />
                                        <button onClick={() => setInventorySearch('')} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1"><Icons.Close size={14} /> Clear</button>
                                    </div>
                                    <select className="bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" value={inventoryBranchFilter} onChange={e => setInventoryBranchFilter(e.target.value)}>
                                        <option value="">All Branches</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                    <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-bold ml-auto"><Icons.Add size={16} /> Add Product</button>
                                </div>
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold sticky top-0">
                                            <tr>
                                                <th className="p-4">Product Name</th>
                                                <th className="p-4">SKU</th>
                                                <th className="p-4">Branch</th>
                                                <th className="p-4">Cost</th>
                                                <th className="p-4">Price</th>
                                                <th className="p-4 text-center">Stock</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700 text-gray-200">
                                            {filteredInventory.map(p => (
                                                <tr key={p.id} className="hover:bg-gray-700/50">
                                                    <td className="p-4 font-bold text-white">{p.name}</td>
                                                    <td className="p-4 font-mono text-gray-400">{p.sku}</td>
                                                    <td className="p-4 text-blue-400">{branches.find(b => b.id === p.storeId)?.name || 'Unassigned'}</td>
                                                    <td className="p-4">{settings.currency}{p.costPrice.toFixed(2)}</td>
                                                    <td className="p-4">{settings.currency}{p.sellingPrice.toFixed(2)}</td>
                                                    <td className="p-4 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${p.stock <= p.minStockAlert ? 'bg-red-900 text-red-400' : 'bg-green-900 text-green-400'}`}>{p.stock}</span></td>
                                                    <td className="p-4 text-right">
                                                        <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="text-blue-400 hover:text-blue-300 mr-3"><Icons.Settings size={16} /></button>
                                                        <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {/* Categories Tab */}
                        {inventorySubTab === 'categories' && (
                            <>
                                <div className="p-6 border-b border-gray-700 flex gap-4">
                                    <button onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-bold"><Icons.Add size={16} /> New Category</button>
                                </div>
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold sticky top-0">
                                            <tr>
                                                <th className="p-4">Name</th>
                                                <th className="p-4">Description</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700 text-gray-200">
                                            {categories.map(cat => (
                                                <tr key={cat.id} className="hover:bg-gray-700/50">
                                                    <td className="p-4 font-bold text-white">{cat.name}</td>
                                                    <td className="p-4 text-gray-400">{cat.description || '-'}</td>
                                                    <td className="p-4 text-right">
                                                        <button onClick={() => { setEditingCategory(cat); setIsCategoryModalOpen(true); }} className="text-blue-400 hover:text-blue-300 mr-3"><Icons.Settings size={16} /></button>
                                                        <button onClick={() => deleteCategory(cat.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {/* Product Types Tab */}
                        {inventorySubTab === 'types' && (
                            <>
                                <div className="p-6 border-b border-gray-700 flex gap-4">
                                    <button onClick={() => { setEditingProductType(null); setIsProductTypeModalOpen(true); }} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-bold"><Icons.Add size={16} /> New Type</button>
                                </div>
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold sticky top-0">
                                            <tr>
                                                <th className="p-4">Name</th>
                                                <th className="p-4">Description</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700 text-gray-200">
                                            {productTypes.map(type => (
                                                <tr key={type.id} className="hover:bg-gray-700/50">
                                                    <td className="p-4 font-bold text-white">{type.name}</td>
                                                    <td className="p-4 text-gray-400">{type.description || '-'}</td>
                                                    <td className="p-4 text-right">
                                                        <button onClick={() => { setEditingProductType(type); setIsProductTypeModalOpen(true); }} className="text-blue-400 hover:text-blue-300 mr-3"><Icons.Settings size={16} /></button>
                                                        <button onClick={() => deleteProductType(type.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'transactions' && (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
                        <div className="p-6 border-b border-gray-700 flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex gap-4 items-center flex-wrap">
                                <div className="flex gap-2 items-center">
                                    <label className="text-sm text-gray-400">From:</label>
                                    <input type="date" className="bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                                </div>
                                <div className="flex gap-2 items-center">
                                    <label className="text-sm text-gray-400">To:</label>
                                    <input type="date" className="bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                                </div>
                                <select className="bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" value={filterCashier} onChange={e => setFilterCashier(e.target.value)}>
                                    <option value="">All Cashiers</option>
                                    {users.filter(u => u.role === Role.CASHIER).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                                <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setFilterCashier(''); }} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1"><Icons.RotateCcw size={14} /> Clear</button>
                            </div>
                            {selectedTransactions.size > 0 && (
                                <div className="flex gap-2">
                                    <button onClick={() => { if(window.confirm(`Delete ${selectedTransactions.size} transaction(s)? This will move them to recycle bin.`)) { selectedTransactions.forEach(id => deleteTransaction(id)); setSelectedTransactions(new Set()); } }} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2">
                                        <Icons.Delete size={16}/> Delete Selected
                                    </button>
                                    <button onClick={() => setSelectedTransactions(new Set())} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm">Clear</button>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold sticky top-0">
                                    <tr>
                                        <th className="p-4 w-8"><input type="checkbox" className="w-4 h-4 accent-red-600" checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0} onChange={e => { if(e.target.checked) { setSelectedTransactions(new Set(filteredTransactions.map(t => t.id))); } else { setSelectedTransactions(new Set()); } }} /></th>
                                        <th className="p-4">Date</th><th className="p-4">Branch</th><th className="p-4">Cashier</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700 text-gray-200">
                                    {filteredTransactions.map(t => (
                                        <tr key={t.id} className="hover:bg-gray-700/50">
                                            <td className="p-4 w-8"><input type="checkbox" className="w-4 h-4 accent-red-600" checked={selectedTransactions.has(t.id)} onChange={e => { const newSet = new Set(selectedTransactions); if(e.target.checked) { newSet.add(t.id); } else { newSet.delete(t.id); } setSelectedTransactions(newSet); }} /></td>
                                            <td className="p-4">{new Date(t.date).toLocaleString()}</td>
                                            <td className="p-4 text-blue-400">{branches.find(b => b.id === t.storeId)?.name}</td>
                                            <td className="p-4">{t.cashierName}</td>
                                            <td className="p-4">{t.items.length}</td>
                                            <td className="p-4 font-bold text-white">{settings.currency}{t.total.toFixed(2)}</td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${t.status === 'COMPLETED' ? 'bg-green-900 text-green-400' : 'bg-orange-900 text-orange-400'}`}>{t.status}</span></td>
                                            <td className="p-4 flex gap-2"><button onClick={() => { if(window.confirm('Move to recycle bin?')) deleteTransaction(t.id); }} className="text-red-400 hover:text-red-300"><Icons.Delete size={16}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                                <h3 className="font-bold text-white mb-4">Expense Categories</h3>
                                <div className="flex gap-2 mb-4">
                                    <input className="bg-gray-900 border border-gray-600 rounded p-2 text-sm w-full text-white" placeholder="New Category" value={newExpCatName} onChange={e => setNewExpCatName(e.target.value)} />
                                    <button onClick={handleAddExpenseCategory} className="bg-blue-600 text-white p-2 rounded"><Icons.Add size={16} /></button>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {expenseCategories.map(c => (
                                        <div key={c.id} className="flex justify-between items-center p-2 bg-gray-900 rounded border border-gray-700">
                                            <span className="text-sm text-gray-300">{c.name}</span>
                                            <button onClick={() => deleteExpenseCategory(c.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                                <h3 className="font-bold text-white mb-4">Filters</h3>
                                <select className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded mb-2" value={expenseFilterStatus} onChange={e => setExpenseFilterStatus(e.target.value)}>
                                    <option value="ALL">All Statuses</option>
                                    <option value={ExpenseStatus.PENDING}>Pending</option>
                                    <option value={ExpenseStatus.APPROVED}>Approved</option>
                                    <option value={ExpenseStatus.REJECTED}>Rejected</option>
                                </select>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-gray-700">
                                <h3 className="font-bold text-white">Global Expense Requests</h3>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold sticky top-0"><tr><th>Date</th><th>Branch</th><th>User</th><th>Category</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
                                    <tbody className="divide-y divide-gray-700 text-gray-200">
                                        {filteredExpenses.map(e => (
                                            <tr key={e.id} className="hover:bg-gray-700/50">
                                                <td className="p-3">{new Date(e.date).toLocaleDateString()}</td>
                                                <td className="p-3 text-blue-400">{branches.find(b => b.id === e.storeId)?.name}</td>
                                                <td className="p-3">{e.requestedByName}</td>
                                                <td className="p-3">{e.categoryName}</td>
                                                <td className="p-3 font-bold">{settings.currency}{e.amount.toFixed(2)}</td>
                                                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${e.status === ExpenseStatus.APPROVED ? 'bg-green-900 text-green-400' : e.status === ExpenseStatus.REJECTED ? 'bg-red-900 text-red-400' : 'bg-orange-900 text-orange-400'}`}>{e.status}</span></td>
                                                <td className="p-3 flex gap-2">
                                                    {e.status === ExpenseStatus.PENDING && (
                                                        <>
                                                            <button onClick={() => updateExpense({ ...e, status: ExpenseStatus.APPROVED })} className="text-green-400 hover:text-green-300"><Icons.Check size={16} /></button>
                                                            <button onClick={() => updateExpense({ ...e, status: ExpenseStatus.REJECTED })} className="text-red-400 hover:text-red-300"><Icons.Close size={16} /></button>
                                                        </>
                                                    )}
                                                    <button onClick={() => deleteExpense(e.id)} className="text-gray-500 hover:text-white"><Icons.Delete size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-700"><h2 className="text-lg font-bold text-white">System Activity Logs</h2></div>
                        <div className="overflow-auto max-h-[calc(100vh-200px)]">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold sticky top-0"><tr><th className="p-4">Timestamp</th><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Action</th><th className="p-4">Details</th></tr></thead>
                                <tbody className="divide-y divide-gray-700 text-gray-200">
                                    {activityLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-700/50">
                                            <td className="p-4 whitespace-nowrap text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="p-4 font-bold">{log.userName}</td>
                                            <td className="p-4 text-xs">{log.userRole}</td>
                                            <td className="p-4"><span className="bg-gray-700 px-2 py-1 rounded text-xs">{log.action}</span></td>
                                            <td className="p-4 text-gray-300">{log.details}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Icons.DownloadCloud className="text-blue-400" /> Data Backup & Restore</h2>
                                <div className="p-4 bg-gray-900 border border-gray-600 rounded-lg mb-4 text-sm text-gray-300">
                                    <p className="mb-2"><strong className="text-white">Full Backup:</strong> Exports all users, transactions, inventory, and settings to a JSON file.</p>
                                    <p><strong className="text-white">Restore:</strong> Overwrites current system data with the backup file. Irreversible.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={handleBackup} className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"><Icons.Download size={20} /> Download Backup</button>
                                    <button onClick={handleRestoreClick} className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"><Icons.Upload size={20} /> Restore Data</button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                                </div>
                            </div>

                            {/* Access Restriction */}
                            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Icons.Shield className="text-green-400" /> Security & Access Control</h2>
                                <form onSubmit={handleUpdateSecurity} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-2"><Icons.Globe size={14} /> Allowed IP Addresses (CSV)</label>
                                        <textarea name="allowedIPs" defaultValue={settings.security?.allowedIPs} placeholder="192.168.1.1, 10.0.0.5..." className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded h-20 text-sm"></textarea>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-2"><Icons.Monitor size={14} /> Device Restrictions</label>
                                            <input name="allowedDevices" defaultValue={settings.security?.allowedDevices} placeholder="Device IDs..." className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-2"><Icons.MapPin size={14} /> Allowed Regions</label>
                                            <input name="allowedRegions" defaultValue={settings.security?.allowedRegions} placeholder="Lagos, Abuja..." className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" />
                                        </div>
                                    </div>
                                    <button className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition text-sm">Save Security Rules</button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'roles' && (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Roles & Permissions Management</h2>
                            <button onClick={() => { setEditingRole(null); setIsRoleModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-bold"><Icons.Add size={16} /> Create Role</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {roles.map((role) => (
                                <div key={role.id} className="bg-gray-900 border border-gray-600 rounded-xl p-6 relative group">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-white">{role.name.replace(/_/g, ' ')}</h3>
                                        <div className="flex gap-2">
                                            <span className="bg-gray-700 text-xs px-2 py-1 rounded text-gray-300">{users.filter(u => u.role === role.name).length} Users</span>
                                            {!role.isSystemDefined && (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                    <button onClick={() => { setEditingRole(role); setIsRoleModalOpen(true); }} className="p-1 text-blue-400 hover:bg-gray-800 rounded"><Icons.Settings size={14} /></button>
                                                    <button onClick={() => handleDeleteRole(role.id)} className="p-1 text-red-400 hover:bg-gray-800 rounded"><Icons.Delete size={14} /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3 italic">{role.description || 'No description'}</p>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Capabilities</h4>
                                    <ul className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                        {role.permissions.map((perm: string) => (
                                            <li key={perm} className="flex items-center gap-2 text-sm text-gray-300">
                                                <Icons.Check size={14} className="text-green-500" /> {perm}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="max-w-2xl mx-auto">
                        <div className="grid grid-cols-2 gap-6">
                            {/* Profile Card */}
                            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
                                <div className="text-center mb-6">
                                    <div className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-gray-600"><Icons.User size={48} className="text-gray-400" /></div>
                                    <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
                                    <p className="text-red-400 font-bold">SUPER ADMIN</p>
                                </div>
                                {isEditingProfile ? (
                                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                                        <input name="name" defaultValue={user?.name} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" placeholder="Full Name" required />
                                        <input name="username" defaultValue={user?.username} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" placeholder="Username" required />
                                        <div className="flex gap-2"><button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 bg-gray-700 text-white py-2 rounded">Cancel</button><button className="flex-1 bg-blue-600 text-white py-2 rounded font-bold">Save</button></div>
                                    </form>
                                ) : (
                                    <button onClick={() => setIsEditingProfile(true)} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-bold">Edit Profile</button>
                                )}
                            </div>

                            {/* Password & Security Card */}
                            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Icons.Lock size={20} /> Security</h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                                        <p className="text-gray-400 text-xs uppercase font-bold mb-2">Last Password Change</p>
                                        <p className="text-white">Never</p>
                                    </div>
                                    <button onClick={() => { setIsPasswordModalOpen(true); setPasswordChangeUserId(user?.id || null); setNewPassword(''); setConfirmPassword(''); }} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded font-bold flex items-center justify-center gap-2">
                                        <Icons.Edit size={16} /> Change Password
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'purchases' && (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
                        <div className="p-6 border-b border-gray-700 flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex gap-4 items-center">
                                <select className="bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" value={purchaseOrderFilterStatus} onChange={e => setPurchaseOrderFilterStatus(e.target.value)}>
                                    <option value="ALL">All Orders</option>
                                    <option value={PurchaseOrderStatus.PENDING}>Pending</option>
                                    <option value={PurchaseOrderStatus.RECEIVED}>Received</option>
                                    <option value={PurchaseOrderStatus.CANCELLED}>Cancelled</option>
                                </select>
                                <button onClick={() => setPurchaseOrderFilterStatus('ALL')} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1"><Icons.RotateCcw size={14} /> Clear</button>
                            </div>
                            <button onClick={() => { setEditingPurchaseOrder(null); setIsPurchaseOrderModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-bold"><Icons.Add size={16} /> New Purchase Order</button>
                        </div>

                        {isPurchaseOrderModalOpen && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
                                <div className="bg-gray-900 rounded-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto my-8">
                                    <h2 className="text-2xl font-bold text-white mb-6">{editingPurchaseOrder ? 'Edit Purchase Order' : 'Create New Purchase Order'}</h2>
                                    <PurchaseOrderForm
                                        order={editingPurchaseOrder}
                                        onSubmit={handleSavePurchaseOrder}
                                        onCancel={() => { setIsPurchaseOrderModalOpen(false); setEditingPurchaseOrder(null); }}
                                        userName={user?.name || 'Super Admin'}
                                        currency={settings.currency}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-auto">
                            {filteredPurchaseOrders.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <div className="text-center">
                                        <Icons.ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>No purchase orders found</p>
                                    </div>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold sticky top-0">
                                        <tr>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Items (Qty)</th>
                                            <th className="p-4">Item Cost</th>
                                            <th className="p-4">Shipping Cost</th>
                                            <th className="p-4">Total Cost</th>
                                            <th className="p-4">Store Cost</th>
                                            <th className="p-4">Store Price</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700 text-gray-200">
                                        {filteredPurchaseOrders.map(po => {
                                          const totalStoreQuantity = po.items.reduce((sum, item) => sum + item.quantity, 0);
                                          const avgStoreCost = po.items.length > 0 ? po.items.reduce((sum, item) => sum + item.storeCostPrice, 0) / po.items.length : 0;
                                          const avgStorePrice = po.items.length > 0 ? po.items.reduce((sum, item) => sum + item.storeSellingPrice, 0) / po.items.length : 0;
                                          return (
                                            <tr key={po.id} className="hover:bg-gray-700/50">
                                                <td className="p-4">{new Date(po.date).toLocaleDateString()}</td>
                                                <td className="p-4 text-blue-400">{po.items.length} items ({totalStoreQuantity} units)</td>
                                                <td className="p-4 font-bold text-white">{settings.currency}{po.subtotal.toFixed(2)}</td>
                                                <td className="p-4 text-yellow-400">{settings.currency}{(po.shippingExpense || 0).toFixed(2)}</td>
                                                <td className="p-4 font-bold text-green-400">{settings.currency}{po.totalCost.toFixed(2)}</td>
                                                <td className="p-4">{settings.currency}{avgStoreCost.toFixed(2)}</td>
                                                <td className="p-4">{settings.currency}{avgStorePrice.toFixed(2)}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                        po.status === PurchaseOrderStatus.RECEIVED ? 'bg-green-900 text-green-400' :
                                                        po.status === PurchaseOrderStatus.PENDING ? 'bg-yellow-900 text-yellow-400' :
                                                        'bg-red-900 text-red-400'
                                                    }`}>
                                                        {po.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right flex justify-end gap-2 items-center flex-wrap">
                                                    {!po.convertedToInventory && (
                                                        <button onClick={() => handleConvertPurchaseToInventory(po)} title="Convert to Inventory" className="text-green-400 hover:text-green-300 text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600">
                                                            <Icons.Check size={14} /> Convert
                                                        </button>
                                                    )}
                                                    {po.convertedToInventory && (
                                                        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">Converted</span>
                                                    )}
                                                    <button onClick={() => setSelectedPurchaseOrderForReport(po)} title="Print" className="text-blue-400 hover:text-blue-300 text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600" style={{ display: selectedPurchaseOrderForReport?.id === po.id ? 'none' : 'flex', alignItems: 'center', gap: '4px' }}>
                                                        🖨️ Print
                                                    </button>
                                                    <button onClick={() => setSelectedPurchaseOrderForReport(po)} title="Download PDF" className="text-green-400 hover:text-green-300 text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600" style={{ display: selectedPurchaseOrderForReport?.id === po.id ? 'none' : 'flex', alignItems: 'center', gap: '4px' }}>
                                                        📥 PDF
                                                    </button>
                                                    {selectedPurchaseOrderForReport?.id === po.id && (
                                                        <div className="flex gap-1">
                                                            <PurchaseOrderReport 
                                                              purchaseOrder={po}
                                                              currency={settings.currency}
                                                              storeName={settings.storeName || 'AlkanchiPay Store'}
                                                            />
                                                        </div>
                                                    )}
                                                    <button onClick={() => { setEditingPurchaseOrder(po); setIsPurchaseOrderModalOpen(true); }} className="text-blue-400 hover:text-blue-300"><Icons.Settings size={16} /></button>
                                                    <button onClick={() => { if(window.confirm('Delete this purchase order?')) deletePurchaseOrder(po.id); }} className="text-red-400 hover:text-red-300"><Icons.Delete size={16} /></button>
                                                </td>
                                            </tr>
                                          );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Purchase Orders Summary */}
                        <div className="p-4 border-t border-gray-700 bg-gray-900/50 grid grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400 text-xs font-bold">Total Orders</p>
                                <p className="text-xl font-bold text-white">{filteredPurchaseOrders.length}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs font-bold">Total Cost</p>
                                <p className="text-xl font-bold text-green-400">{settings.currency}{filteredPurchaseOrders.reduce((sum, po) => sum + po.totalCost, 0).toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs font-bold">Shipping Expense</p>
                                <p className="text-xl font-bold text-blue-400">{settings.currency}{filteredPurchaseOrders.reduce((sum, po) => sum + (po.shippingExpense || 0), 0).toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs font-bold">Converted to Inventory</p>
                                <p className="text-xl font-bold text-yellow-400">{filteredPurchaseOrders.filter(po => po.convertedToInventory).length}</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'recycleBin' && (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Recycle Bin - Deleted Transactions</h2>
                        {deletedTransactions.length === 0 ? (
                            <div className="text-center py-12">
                                <Icons.Delete size={48} className="mx-auto text-gray-600 mb-4"/>
                                <p className="text-gray-400">No deleted transactions</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-300">
                                    <thead className="bg-gray-900 text-gray-400 text-xs uppercase font-bold">
                                        <tr>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Invoice ID</th>
                                            <th className="p-3">Cashier</th>
                                            <th className="p-3">Branch</th>
                                            <th className="p-3">Total</th>
                                            <th className="p-3">Deleted By</th>
                                            <th className="p-3">Deleted At</th>
                                            <th className="p-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {deletedTransactions.map(t => {
                                            const branch = branches.find(b => b.id === t.storeId);
                                            return (
                                                <tr key={t.id} className="hover:bg-gray-700/50">
                                                    <td className="p-3">{new Date(t.date).toLocaleString()}</td>
                                                    <td className="p-3 font-mono text-xs">{t.id.substring(0, 8)}</td>
                                                    <td className="p-3">{t.cashierName}</td>
                                                    <td className="p-3">{branch?.name || 'Unknown'}</td>
                                                    <td className="p-3 font-bold">{settings.currency}{t.total.toFixed(2)}</td>
                                                    <td className="p-3 text-gray-400">{t.deletedBy || 'Unknown'}</td>
                                                    <td className="p-3 text-xs text-gray-500">{t.deletedAt ? new Date(t.deletedAt).toLocaleString() : '-'}</td>
                                                    <td className="p-3 flex gap-2">
                                                        <button onClick={() => { if(window.confirm('Restore this transaction?')) restoreTransaction(t.id); }} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                                                            <Icons.RotateCcw size={14}/> Restore
                                                        </button>
                                                        <button onClick={() => { if(window.confirm('Permanently delete this transaction? This cannot be undone.')) purgeTransaction(t.id); }} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                                                            <Icons.Delete size={14}/> Purge
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* PRODUCT TRANSFERS TAB */}
                {activeTab === 'transfers' && (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
                        <div className="p-6 border-b border-gray-700 flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex gap-4 items-center">
                                <select 
                                    className="bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" 
                                    value={transferFilterStatus} 
                                    onChange={e => setTransferFilterStatus(e.target.value)}
                                >
                                    <option value="ALL">All Transfers</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                                <button 
                                    onClick={() => setTransferFilterStatus('ALL')} 
                                    className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1"
                                >
                                    <Icons.RotateCcw size={14} /> Clear
                                </button>
                            </div>
                            <button 
                                onClick={() => setIsTransferModalOpen(true)} 
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-bold"
                            >
                                <Icons.Add size={16} /> New Transfer
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto">
                            {filteredTransfers.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <div className="text-center">
                                        <Icons.Send size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>No product transfers found</p>
                                    </div>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold sticky top-0">
                                        <tr>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Transfer ID</th>
                                            <th className="p-4">To Branch</th>
                                            <th className="p-4">Items</th>
                                            <th className="p-4">Total Units</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Reviewed By</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700 text-gray-200">
                                        {filteredTransfers.map(transfer => {
                                            const totalUnits = transfer.items.reduce((sum, item) => sum + item.quantity, 0);
                                            return (
                                                <tr key={transfer.id} className="hover:bg-gray-700/50">
                                                    <td className="p-4">{new Date(transfer.date).toLocaleDateString()}</td>
                                                    <td className="p-4 font-mono text-xs">#{transfer.id.substring(0, 8).toUpperCase()}</td>
                                                    <td className="p-4 text-blue-400">{transfer.toBranchName}</td>
                                                    <td className="p-4">{transfer.items.length} items</td>
                                                    <td className="p-4 font-bold">{totalUnits} units</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                            transfer.status === 'APPROVED' ? 'bg-green-900 text-green-400' :
                                                            transfer.status === 'PENDING' ? 'bg-yellow-900 text-yellow-400' :
                                                            'bg-red-900 text-red-400'
                                                        }`}>
                                                            {transfer.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-gray-400 text-xs">
                                                        {transfer.reviewedByName || '-'}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button 
                                                            onClick={() => { 
                                                                if(window.confirm('Delete this transfer?')) 
                                                                    deleteProductTransfer(transfer.id); 
                                                            }} 
                                                            className="text-red-400 hover:text-red-300"
                                                        >
                                                            <Icons.Delete size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Transfer Summary */}
                        <div className="p-4 border-t border-gray-700 bg-gray-900/50 grid grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400 text-xs font-bold">Total Transfers</p>
                                <p className="text-xl font-bold text-white">{filteredTransfers.length}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs font-bold">Pending</p>
                                <p className="text-xl font-bold text-yellow-400">{filteredTransfers.filter(t => t.status === 'PENDING').length}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs font-bold">Approved</p>
                                <p className="text-xl font-bold text-green-400">{filteredTransfers.filter(t => t.status === 'APPROVED').length}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs font-bold">Rejected</p>
                                <p className="text-xl font-bold text-red-400">{filteredTransfers.filter(t => t.status === 'REJECTED').length}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Transfer Modal */}
                {isTransferModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
                        <ProductTransferForm
                            products={products}
                            branches={branches}
                            onSubmit={handleCreateTransfer}
                            onCancel={() => setIsTransferModalOpen(false)}
                        />
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
                                <input name="username" defaultValue={editingUser?.username} placeholder="Username/Email" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                                {!editingUser && <input name="password" type="password" placeholder="Password (min 6 chars)" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required minLength={6} />}
                                <div className="grid grid-cols-2 gap-2">
                                    <select name="role" defaultValue={editingUser?.role || Role.CASHIER} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required>
                                        {roles.map(r => (
                                            <option key={r.id} value={r.name}>{r.name.replace(/_/g, ' ')}</option>
                                        ))}
                                    </select>
                                    <select name="storeId" defaultValue={editingUser?.storeId || ''} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded"><option value="">No Branch (Global)</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-400 mb-1">Expense Limit ({settings.currency})</label><input type="number" name="expenseLimit" defaultValue={editingUser?.expenseLimit || 0} placeholder="0.00" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" step="0.01" min="0" /></div>
                                {editingUser && (<div className="flex items-center gap-2"><input type="checkbox" name="status" defaultChecked={editingUser.active} value="active" /><label className="text-gray-300 text-sm">Active Account</label></div>)}
                                <div className="flex gap-2 pt-2"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button><button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">{editingUser ? 'Save Changes' : 'Create User'}</button></div>
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
                                {/* Manager field removed */}
                                <div className="flex gap-2"><button type="button" onClick={() => setIsBranchModalOpen(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button><button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">Save</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Branch Details Modal */}
                {selectedBranchForDetails && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-800 rounded-xl w-full max-w-4xl border border-gray-700 flex flex-col max-h-[90vh]">
                            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">{selectedBranchForDetails.name} Inventory</h2>
                                <button onClick={() => setSelectedBranchForDetails(null)}><Icons.Close className="text-white" /></button>
                            </div>
                            <div className="flex-1 overflow-auto p-4">
                                <table className="w-full text-left text-sm text-gray-300">
                                    <thead className="bg-gray-900 font-bold sticky top-0"><tr><th>Product</th><th>SKU</th><th>Cost</th><th>Price</th><th>Stock</th><th>Last Updated</th></tr></thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {branchDetailsProducts.map(p => (
                                            <tr key={p.id}>
                                                <td className="p-3 text-white font-bold">{p.name}</td>
                                                <td className="p-3 font-mono text-xs">{p.sku}</td>
                                                <td className="p-3">{settings.currency}{p.costPrice.toFixed(2)}</td>
                                                <td className="p-3">{settings.currency}{p.sellingPrice.toFixed(2)}</td>
                                                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${p.stock < p.minStockAlert ? 'bg-red-900 text-red-400' : 'bg-green-900 text-green-400'}`}>{p.stock}</span></td>
                                                <td className="p-3 text-xs">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Product Modal */}
                {isProductModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="bg-gray-800 p-8 rounded-xl w-[500px] border border-gray-700 max-h-[90vh] overflow-y-auto">
                            <h2 className="text-xl font-bold text-white mb-4">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                            <form onSubmit={handleSaveProduct} className="grid grid-cols-2 gap-4">
                                <input name="name" defaultValue={editingProduct?.name} placeholder="Product Name" className="col-span-2 w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                                <input name="sku" defaultValue={editingProduct?.sku} placeholder="SKU Code" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                                <select name="category" defaultValue={editingProduct?.category || 'General'} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded"><option value="General">General</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                                <textarea name="description" defaultValue={editingProduct?.description || ''} placeholder="Product Description" className="col-span-2 w-full bg-gray-900 border border-gray-600 text-white p-2 rounded h-20 resize-none" />
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

                {/* Category Modal */}
                {isCategoryModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="bg-gray-800 p-8 rounded-xl w-[500px] border border-gray-700">
                            <h2 className="text-xl font-bold text-white mb-4">{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const name = formData.get('name') as string;
                                const description = formData.get('description') as string;
                                if (editingCategory) {
                                    updateCategory(editingCategory.id, name, description);
                                } else {
                                    addCategory(name, description);
                                }
                                setIsCategoryModalOpen(false);
                                setEditingCategory(null);
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Category Name *</label>
                                    <input name="name" defaultValue={editingCategory?.name || ''} placeholder="e.g., Electronics, Groceries" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Description</label>
                                    <textarea name="description" defaultValue={editingCategory?.description || ''} placeholder="Category description (optional)" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded h-24"></textarea>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => { setIsCategoryModalOpen(false); setEditingCategory(null); }} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button>
                                    <button type="submit" className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold">Save Category</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Product Type Modal */}
                {isProductTypeModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="bg-gray-800 p-8 rounded-xl w-[500px] border border-gray-700">
                            <h2 className="text-xl font-bold text-white mb-4">{editingProductType ? 'Edit Product Type' : 'Add New Product Type'}</h2>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const name = formData.get('name') as string;
                                const description = formData.get('description') as string;
                                if (editingProductType) {
                                    updateProductType(editingProductType.id, name, description);
                                } else {
                                    addProductType(name, description);
                                }
                                setIsProductTypeModalOpen(false);
                                setEditingProductType(null);
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Type Name *</label>
                                    <input name="name" defaultValue={editingProductType?.name || ''} placeholder="e.g., Smartphone, Laptop, T-Shirt" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Description</label>
                                    <textarea name="description" defaultValue={editingProductType?.description || ''} placeholder="Type description (optional)" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded h-24"></textarea>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => { setIsProductTypeModalOpen(false); setEditingProductType(null); }} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button>
                                    <button type="submit" className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold">Save Type</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Password Change Modal */}
                {isPasswordModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="bg-gray-800 p-6 rounded-xl w-[400px] border border-gray-700">
                            <h2 className="text-xl font-bold text-white mb-4">Change Password</h2>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">New Password</label>
                                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" placeholder="Enter new password" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
                                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" placeholder="Confirm new password" required />
                                </div>
                                <div className="flex gap-2 pt-2"><button type="button" onClick={() => { setIsPasswordModalOpen(false); setPasswordChangeUserId(null); setNewPassword(''); setConfirmPassword(''); }} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button><button type="submit" className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold">Change</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Role Modal */}
                {isRoleModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 overflow-y-auto p-4">
                        <div className="bg-gray-800 p-8 rounded-xl w-full max-w-2xl border border-gray-700 my-8">
                            <h2 className="text-xl font-bold text-white mb-6">{editingRole ? 'Edit Role' : 'Create New Role'}</h2>
                            <form onSubmit={handleSaveRole} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Role Name</label>
                                        <input name="name" defaultValue={editingRole?.name} placeholder="e.g., Manager, Supervisor" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">Description</label>
                                        <input name="description" defaultValue={editingRole?.description} placeholder="Role description" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 mb-3">Assign Permissions</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-3 bg-gray-900 rounded border border-gray-700">
                                        {permissions.length === 0 ? (
                                            <p className="col-span-full text-gray-500 text-sm">No permissions available</p>
                                        ) : (
                                            permissions.map(perm => (
                                                <label key={perm.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 p-2 rounded">
                                                    <input type="checkbox" name={`perm_${perm.id}`} defaultChecked={editingRole?.permissions?.includes(perm.name)} className="w-4 h-4 accent-blue-600" />
                                                    <span className="text-sm text-gray-300">{perm.name}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-gray-700">
                                    <button type="button" onClick={() => { setIsRoleModalOpen(false); setEditingRole(null); }} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold">Cancel</button>
                                    <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">{editingRole ? 'Update Role' : 'Create Role'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default SuperAdmin;
