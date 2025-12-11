
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, Role, Transaction, RefundItem, PaymentMethod, TransactionStatus, Expense, ExpenseStatus } from '../types';
import { Icons } from '../components/ui/Icons';
import { nanoid } from 'nanoid';
import { HeaderTools } from '../components/ui/HeaderTools';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Admin = () => {
  const { 
    user, products: allProducts, transactions: allTransactions, 
    addProduct, updateProduct, deleteProduct, settings, updateBranch, 
    users, logout, branches, categories, addCategory, deleteCategory, updateUser,
    expenses, addExpense, updateExpense, updateTransaction, processRefund, expenseCategories,
    createBackup, restoreBackup, addNotification,
    deletedTransactions, getDeletedTransactions, restoreTransaction, purgeTransaction, deleteTransaction
  } = useStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'reports' | 'debts' | 'expenses' | 'settings' | 'profile' | 'returns' | 'recycleBin'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Branch Data
  const products = allProducts.filter(p => p.storeId === user?.storeId);
  const transactions = allTransactions.filter(t => t.storeId === user?.storeId);
  const currentBranch = branches.find(b => b.id === user?.storeId);
  const branchExpenses = expenses.filter(e => e.storeId === user?.storeId);
  const debtTransactions = transactions.filter(t => t.status === TransactionStatus.PARTIAL || (t.paymentMethod === PaymentMethod.CREDIT && t.amountPaid < t.total));
  
  // Dashboard Metrics
  const totalRevenue = transactions.reduce((acc, t) => acc + t.total, 0);
  const totalOrders = transactions.length;
  const branchInventoryCost = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
  const branchInventorySales = products.reduce((acc, p) => acc + (p.sellingPrice * p.stock), 0);
  const recentSales = [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  // Filters & State
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCashier, setFilterCashier] = useState('');
  const [reportViewMode, setReportViewMode] = useState<'transactions' | 'detailed' | 'deposits' | 'items'>('transactions');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showCategorySidebar, setShowCategorySidebar] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  
  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Expense State
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseReason, setNewExpenseReason] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('');
  const [expenseSubTab, setExpenseSubTab] = useState<'pending' | 'history'>('pending');

  // Return State
  const [returnInvoiceId, setReturnInvoiceId] = useState('');
  const [returnTransaction, setReturnTransaction] = useState<Transaction | null>(null);
  const [itemsToReturn, setItemsToReturn] = useState<{itemId: string, qty: number}[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnCondition, setReturnCondition] = useState('Good');
  
  // Debt Payment Modal
  const [selectedDebtTx, setSelectedDebtTx] = useState<Transaction | null>(null);
  const [debtPaymentAmount, setDebtPaymentAmount] = useState('');

  // Backup Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter Logic
  const filteredInventory = products.filter(p => {
      const search = inventorySearch.toLowerCase();
      return p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search);
  });

  const filteredReportTransactions = transactions.filter(t => {
      const tDate = new Date(t.date).getTime();
      const start = filterStartDate ? new Date(filterStartDate).getTime() : 0;
      const end = filterEndDate ? new Date(filterEndDate).getTime() + 86400000 : Infinity;
      return tDate >= start && tDate <= end && (!filterCashier || t.cashierId === filterCashier);
  });
  
  // Detailed Report Logic
  const detailedReportData = useMemo(() => {
    let rowIndex = 1, grandTotalCost = 0, grandTotalSales = 0, grandTotalProfit = 0, grandTotalBalance = 0, grandDiscount = 0;
    
    const rows = filteredReportTransactions.flatMap(t => {
      const itemDiscountShare = t.discount / (t.items.length || 1);

      return t.items.map(item => {
        const prod = products.find(p => p.id === item.id);
        const qtySold = item.quantity;
        const currentStock = prod ? prod.stock : 0;
        const qtyBefore = currentStock + qtySold; 
        const unitCost = item.costPrice || prod?.costPrice || 0;
        const unitPrice = item.sellingPrice;
        
        const totalCost = unitCost * qtySold;
        const totalSalesRaw = unitPrice * qtySold;
        const discount = itemDiscountShare; 
        const balance = totalSalesRaw - discount;
        const profit = balance - totalCost;

        grandTotalCost += totalCost;
        grandTotalSales += totalSalesRaw;
        grandDiscount += discount;
        grandTotalBalance += balance;
        grandTotalProfit += profit;

        return {
          sn: rowIndex++, 
          itemName: item.name, 
          qtyBefore: qtyBefore,
          qtySold: qtySold, 
          qtyRemaining: currentStock,
          unitCost: unitCost, 
          unitPrice: unitPrice, 
          totalCost, 
          totalSales: totalSalesRaw, 
          discount,
          balance,
          profit,
          cashier: t.cashierName, 
          date: new Date(t.date).toLocaleString(),
          paymentMethod: t.paymentMethod === PaymentMethod.SPLIT ? 'SPLIT' : t.paymentMethod
        };
      });
    });
    return { rows, grandTotalCost, grandTotalSales, grandTotalProfit, grandTotalBalance, grandDiscount };
  }, [filteredReportTransactions, products]);

  // Actions
  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cat = expenseCategories.find(c => c.id === newExpenseCategory);
    const expense: Expense = {
        id: nanoid(),
        amount: parseFloat(newExpenseAmount),
        description: newExpenseReason,
        categoryId: cat?.id,
        categoryName: cat?.name,
        status: ExpenseStatus.APPROVED, 
        requestedBy: user.id,
        requestedByName: user.name,
        storeId: user.storeId,
        date: new Date().toISOString(),
        approvedBy: user.id
    };
    addExpense(expense);
    setNewExpenseAmount('');
    setNewExpenseReason('');
    setNewExpenseCategory('');
  };

  const handleReviewExpense = (exp: Expense, status: ExpenseStatus) => {
      updateExpense({ ...exp, status, approvedBy: user?.id });
  };
  
  const handleAddDebtPayment = () => {
      if(!selectedDebtTx) return;
      const amount = parseFloat(debtPaymentAmount);
      if(isNaN(amount) || amount <= 0) return;
      
      const newPaid = selectedDebtTx.amountPaid + amount;
      const newStatus = newPaid >= selectedDebtTx.total - 0.01 ? TransactionStatus.COMPLETED : TransactionStatus.PARTIAL;
      
      updateTransaction({ ...selectedDebtTx, amountPaid: newPaid, status: newStatus });
      setSelectedDebtTx(null);
      setDebtPaymentAmount('');
  };

  const getSummaryMetrics = () => {
    const breakdown = { [PaymentMethod.CASH]: 0, [PaymentMethod.POS]: 0, [PaymentMethod.TRANSFER]: 0, [PaymentMethod.CREDIT]: 0 };
    filteredReportTransactions.forEach(t => {
        if(t.paymentMethod === PaymentMethod.SPLIT) {
            t.payments.forEach(p => { if(breakdown[p.method] !== undefined) breakdown[p.method] += p.amount; });
        } else if(breakdown[t.paymentMethod] !== undefined) {
            breakdown[t.paymentMethod] += t.amountPaid;
        }
    });
    return breakdown;
  };

  // Branch Backup Handlers
  const handleBackup = () => {
      if(!user?.storeId) return;
      const json = createBackup(user.storeId);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `branch_${currentBranch?.name}_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      addNotification('Branch data backup downloaded', 'success');
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
      e.target.value = ''; 
  };

  const handlePrintReceipt = (tx: Transaction) => {
       const paymentRows = tx.paymentMethod === PaymentMethod.SPLIT 
        ? tx.payments.map(p => `<tr><td>${p.method}</td><td class="right">${settings.currency}${p.amount.toFixed(2)}</td></tr>`).join('')
        : `<tr><td>${tx.paymentMethod}</td><td class="right">${settings.currency}${tx.amountPaid.toFixed(2)}</td></tr>`;
      const isPaid = tx.amountPaid >= tx.total - 0.01;
      const receiptHtml = `
      <!DOCTYPE html><html><head><title>Receipt</title><style>
          @media print { @page { margin: 0; size: 80mm auto; } body { margin: 0; padding: 10px; } }
          body { font-family: 'Courier New', monospace; width: 80mm; margin: 0 auto; padding: 10px; font-size: 12px; }
          .header, .footer { text-align: center; } .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; } th { text-align: left; border-bottom: 1px dashed #000; }
          .right { text-align: right; } .center { text-align: center; } .total-row { font-weight: bold; margin-top: 4px; display: flex; justify-content: space-between; }
      </style></head><body>
        <div class="header"><div style="font-weight:bold; font-size:16px;">${settings.name}</div><div>${currentBranch?.name}</div></div>
        <div class="divider"></div>
        <div>Date: ${new Date(tx.date).toLocaleDateString()} ${new Date(tx.date).toLocaleTimeString()}</div>
        <div>Receipt #: ${tx.id.substring(0,8)}</div>
        <div class="divider"></div>
        <table><thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Amt</th></tr></thead>
        <tbody>${tx.items.map(i => `<tr><td>${i.name}</td><td class="center">${i.quantity}</td><td class="right">${(i.sellingPrice*i.quantity).toFixed(2)}</td></tr>`).join('')}</tbody></table>
        <div class="divider"></div>
        <div class="total-row"><span>TOTAL</span><span>${settings.currency}${tx.total.toFixed(2)}</span></div>
        <div style="margin-top:5px"><table>${paymentRows}</table></div>
        <div style="text-align:center; margin-top:10px; font-weight:bold; border:1px solid #000;">${isPaid?'PAID':'PARTIAL'}</div>
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>
      </body></html>`;
      const win = window.open('','_blank','width=400,height=600'); 
      if(win) { win.document.write(receiptHtml); win.document.close(); }
  };

  const handleGenerateInventoryReport = (mode: 'pdf' | 'print') => {
    const branchName = currentBranch?.name || 'Main Branch';
    const totalCostPrice = products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);
    const totalSalesPrice = products.reduce((sum, p) => sum + (p.sellingPrice * p.stock), 0);
    const totalProfit = totalSalesPrice - totalCostPrice;

    // Format currency safely for PDF
    const formatCurrency = (amount: number): string => {
      return amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (mode === 'pdf') {
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(18); doc.text(settings.name, 14, 15);
      doc.setFontSize(14); doc.text(`${branchName} - Inventory Report`, 14, 22);
      doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

      const columns = ["Product Name", "SKU", "Category", "Cost Price", "Sales Price", "Stock", "Total Cost", "Total Sales"];
      const rows = products.map(p => [
        p.name,
        p.sku,
        p.category,
        formatCurrency(p.costPrice),
        formatCurrency(p.sellingPrice),
        p.stock.toString(),
        formatCurrency(p.costPrice * p.stock),
        formatCurrency(p.sellingPrice * p.stock)
      ]);

      autoTable(doc, { head: [columns], body: rows, startY: 35, styles: { fontSize: 8 } });

      doc.text("Summary", 14, (doc as any).lastAutoTable.finalY + 10);
      autoTable(doc, {
        head: [['Metric', 'Amount']],
        body: [
          ['Total Products', products.length.toString()],
          ['Total Cost Value', formatCurrency(totalCostPrice)],
          ['Total Sales Value', formatCurrency(totalSalesPrice)],
          ['Total Profit Potential', formatCurrency(totalProfit)]
        ],
        startY: (doc as any).lastAutoTable.finalY + 15,
        theme: 'grid'
      });

      doc.save(`Inventory_Report_${branchName}_${new Date().toISOString().split('T')[0]}.pdf`);
      addNotification('Inventory report downloaded', 'success');
    } else {
      const html = `
        <html><head><style>
          body { font-family: sans-serif; margin: 20px; }
          h1, h2 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .summary { margin-top: 20px; }
          .summary table { width: 50%; }
        </style></head><body>
          <h1>${settings.name}</h1>
          <h2>${branchName} - Inventory Report</h2>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <table>
            <thead><tr>
              <th>Product Name</th><th>SKU</th><th>Category</th><th>Cost Price</th><th>Sales Price</th>
              <th>Stock</th><th>Total Cost</th><th>Total Sales</th>
            </tr></thead>
            <tbody>
              ${products.map(p => `<tr>
                <td>${p.name}</td><td>${p.sku}</td><td>${p.category}</td>
                <td>${formatCurrency(p.costPrice)}</td><td>${formatCurrency(p.sellingPrice)}</td>
                <td>${p.stock}</td><td>${formatCurrency(p.costPrice * p.stock)}</td>
                <td>${formatCurrency(p.sellingPrice * p.stock)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          <div class="summary">
            <h3>Summary</h3>
            <table>
              <tr><td><strong>Total Products</strong></td><td>${products.length}</td></tr>
              <tr><td><strong>Total Cost Value</strong></td><td>${formatCurrency(totalCostPrice)}</td></tr>
              <tr><td><strong>Total Sales Value</strong></td><td>${formatCurrency(totalSalesPrice)}</td></tr>
              <tr><td><strong>Total Profit Potential</strong></td><td>${formatCurrency(totalProfit)}</td></tr>
            </table>
          </div>
          <script>window.print();</script>
        </body></html>`;
      const win = window.open('', '_blank', 'width=1000,height=600');
      if (win) { win.document.write(html); win.document.close(); }
      addNotification('Inventory report opened for printing', 'success');
    }
  };

  const handleDownloadReportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const branchName = currentBranch?.name || 'Main Branch';
    const breakdown = getSummaryMetrics();

    doc.setFontSize(18); doc.text(settings.name, 14, 15);
    doc.setFontSize(14); doc.text(branchName + " Report", 14, 22);

    if (reportViewMode === 'detailed') {
        const columns = ["S/N", "Item", "Qty Before", "Sold", "Rem", "Method", "Unit Cost", "Unit Price", "Total Cost", "Total Sales", "Profit", "Cashier", "Date"];
        const rows = detailedReportData.rows.map(r => [
            r.sn, r.itemName, r.qtyBefore, r.qtySold, r.qtyRemaining, r.paymentMethod,
            r.unitCost.toFixed(2), r.unitPrice.toFixed(2), r.totalCost.toFixed(2), r.totalSales.toFixed(2), r.profit.toFixed(2),
            r.cashier, r.date.split(',')[0]
        ]);
        autoTable(doc, { head: [columns], body: rows, startY: 35, styles: { fontSize: 8 } });
        
        doc.text("Financial Summary", 14, (doc as any).lastAutoTable.finalY + 10);
        autoTable(doc, {
            head: [['Metric', 'Value']],
            body: [
                ['Total Sales', detailedReportData.grandTotalSales.toFixed(2)],
                ['Total Profit', detailedReportData.grandTotalProfit.toFixed(2)],
                ['Cash', breakdown[PaymentMethod.CASH].toFixed(2)],
                ['POS', breakdown[PaymentMethod.POS].toFixed(2)],
                ['Transfer', breakdown[PaymentMethod.TRANSFER].toFixed(2)]
            ],
            startY: (doc as any).lastAutoTable.finalY + 15,
            theme: 'grid'
        });
    } else if (reportViewMode === 'transactions') {
        const columns = ["Date", "Tx ID", "Cashier", "Method", "Total", "Status"];
        const rows = filteredReportTransactions.map(t => [new Date(t.date).toLocaleString(), t.id.substring(0,8), t.cashierName, t.paymentMethod, t.total.toFixed(2), t.status]);
        autoTable(doc, { head: [columns], body: rows, startY: 35 });
    }
    doc.save(`Report_${branchName}.pdf`);
  };

  const handlePrintReport = () => {
      const breakdown = getSummaryMetrics();
      let content = '';
      if(reportViewMode === 'detailed') {
           content = `
           <table>
             <thead><tr><th>S/N</th><th>Item</th><th>Sold</th><th>Method</th><th>Total Sales</th><th>Profit</th></tr></thead>
             <tbody>${detailedReportData.rows.map(r=>`<tr><td>${r.sn}</td><td>${r.itemName}</td><td>${r.qtySold}</td><td>${r.paymentMethod}</td><td>${r.totalSales.toFixed(2)}</td><td>${r.profit.toFixed(2)}</td></tr>`).join('')}</tbody>
           </table>
           <div style="margin-top:20px; font-weight:bold;">Financial Summary</div>
           <table>
             <tr><td>Total Sales</td><td>${detailedReportData.grandTotalSales.toFixed(2)}</td></tr>
             <tr><td>Total Profit</td><td>${detailedReportData.grandTotalProfit.toFixed(2)}</td></tr>
             <tr><td>Cash</td><td>${breakdown[PaymentMethod.CASH].toFixed(2)}</td></tr>
             <tr><td>POS</td><td>${breakdown[PaymentMethod.POS].toFixed(2)}</td></tr>
           </table>
           `;
      } else {
           content = `<table><thead><tr><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>${filteredReportTransactions.map(t=>`<tr><td>${new Date(t.date).toLocaleString()}</td><td>${t.total.toFixed(2)}</td><td>${t.status}</td></tr>`).join('')}</tbody></table>`;
      }
      
      const win = window.open('','_blank','width=800,height=600');
      if(win){ 
          win.document.write(`
            <html><head><style>
              body { font-family: sans-serif; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #000; padding: 5px; } th { background: #eee; }
            </style></head><body>
              <h2>${currentBranch?.name} - Report</h2>
              ${content}
              <script>window.print();</script>
            </body></html>
          `); 
          win.document.close(); 
      }
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
          storeId: user?.storeId
      };
      if (editingProduct) updateProduct(productData); else addProduct(productData);
      setIsProductModalOpen(false); setEditingProduct(null);
  };
  
  const handleAddCategory = (e: React.FormEvent) => { e.preventDefault(); if(newCategoryName.trim()) { addCategory(newCategoryName.trim()); setNewCategoryName(''); }};
  const handleUpdateProfile = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); if (!user) return; const formData = new FormData(e.currentTarget); updateUser({ ...user, name: formData.get('name') as string, username: formData.get('username') as string }); setIsEditingProfile(false); };

  // Return Logic
   const handleSearchForReturn = () => {
    const found = transactions.find(t => t.id === returnInvoiceId && t.storeId === user?.storeId);
    if (found) { setReturnTransaction(found); setItemsToReturn([]); setReturnCondition('Good'); }
    else { addNotification('Transaction not found', 'error'); }
  };
  const toggleItemReturn = (itemId: string, maxQty: number) => {
      const exists = itemsToReturn.find(i => i.itemId === itemId);
      if (exists) setItemsToReturn(prev => prev.filter(i => i.itemId !== itemId));
      else setItemsToReturn(prev => [...prev, { itemId, qty: 1 }]);
  };
  const handleProcessReturn = () => {
      if (!returnTransaction) return;
      processRefund(returnTransaction.id, itemsToReturn.map(i => ({ itemId: i.itemId, quantity: i.qty })), returnReason, returnCondition);
      setReturnTransaction(null); setItemsToReturn([]); setReturnReason(''); setReturnInvoiceId('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex font-sans">
      <aside className={`bg-gray-800 border-r border-gray-700 flex flex-col fixed h-full z-20 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
           {!isSidebarCollapsed && <h1 className="text-xl font-bold flex items-center gap-2 text-white"><Icons.Dashboard className="text-blue-500"/> Admin</h1>}
           <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-gray-400 hover:text-white">
               {isSidebarCollapsed ? <Icons.ChevronRight size={20}/> : <Icons.ChevronLeft size={20}/>}
           </button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {[{ id: 'dashboard', icon: Icons.Dashboard, label: 'Dashboard' }, { id: 'reports', icon: Icons.Reports, label: 'Reports & Analytics' }, { id: 'inventory', icon: Icons.Inventory, label: 'Branch Inventory' }, { id: 'debts', icon: Icons.Wallet, label: 'Debts & Deposits' }, { id: 'expenses', icon: Icons.Expenses, label: 'Expenses' }, { id: 'returns', icon: Icons.RotateCcw, label: 'Returns' }, { id: 'recycleBin', icon: Icons.Delete, label: 'Recycle Bin' }, { id: 'settings', icon: Icons.Settings, label: 'Branch Settings' }, { id: 'profile', icon: Icons.User, label: 'My Profile' }].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition ${activeTab === item.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                    <item.icon size={20} />{!isSidebarCollapsed && <span>{item.label}</span>}
                </button>
            ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
           <button onClick={logout} className="flex items-center gap-2 text-gray-400 hover:text-white w-full px-2 py-2 rounded hover:bg-gray-700"><Icons.Logout size={20} />{!isSidebarCollapsed && "Logout"}</button>
        </div>
      </aside>

      <main className={`flex-1 overflow-auto bg-gray-900 p-8 transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white capitalize">{activeTab}</h2>
              <p className="text-gray-400 text-sm">{currentBranch?.name}</p>
            </div>
            <HeaderTools />
        </header>

        {activeTab === 'dashboard' && (
           <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                       <p className="text-gray-400 font-bold text-xs uppercase">Total Revenue</p>
                       <h3 className="text-3xl font-extrabold text-white mt-1">{settings.currency}{totalRevenue.toLocaleString()}</h3>
                   </div>
                   <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                       <p className="text-gray-400 font-bold text-xs uppercase">Total Orders</p>
                       <h3 className="text-3xl font-extrabold text-blue-400 mt-1">{totalOrders}</h3>
                   </div>
                   <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                       <p className="text-gray-400 font-bold text-xs uppercase">Inventory Cost</p>
                       <h3 className="text-3xl font-extrabold text-gray-200 mt-1">{settings.currency}{branchInventoryCost.toLocaleString()}</h3>
                   </div>
                   <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                       <p className="text-gray-400 font-bold text-xs uppercase">Inventory Sales Value</p>
                       <h3 className="text-3xl font-extrabold text-green-400 mt-1">{settings.currency}{branchInventorySales.toLocaleString()}</h3>
                   </div>
               </div>
               
               <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                   <div className="p-4 border-b border-gray-700"><h3 className="font-bold text-white">Recent Sales</h3></div>
                   <table className="w-full text-left text-sm text-gray-300">
                       <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold"><tr><th className="p-3">Time</th><th className="p-3">Cashier</th><th className="p-3">Items</th><th className="p-3">Method</th><th className="p-3">Total</th><th className="p-3">Action</th></tr></thead>
                       <tbody className="divide-y divide-gray-700">
                           {recentSales.map(t => (
                               <tr key={t.id} className="hover:bg-gray-700/50">
                                   <td className="p-3 text-xs">{new Date(t.date).toLocaleTimeString()}</td>
                                   <td className="p-3">{t.cashierName}</td>
                                   <td className="p-3">{t.items.length} items</td>
                                   <td className="p-3">{t.paymentMethod}</td>
                                   <td className="p-3 font-bold text-white">{settings.currency}{t.total.toFixed(2)}</td>
                                   <td className="p-3"><button onClick={()=>handlePrintReceipt(t)} className="text-gray-400 hover:text-white"><Icons.Printer size={16}/></button></td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           </div>
        )}

        {activeTab === 'reports' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
                    <select className="bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" value={reportViewMode} onChange={e => setReportViewMode(e.target.value as any)}>
                        <option value="transactions">Transaction History</option>
                        <option value="detailed">Detailed Item Report</option>
                        <option value="deposits">Deposit & Debt Report</option>
                        <option value="items">Remaining Items Report</option>
                    </select>
                    <div className="flex gap-2 items-center">
                        <label className="text-sm text-gray-400">From:</label>
                        <input type="date" className="bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                    </div>
                    <div className="flex gap-2 items-center">
                        <label className="text-sm text-gray-400">To:</label>
                        <input type="date" className="bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                    </div>
                    <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2"><Icons.RotateCcw size={16}/> Clear</button>
                    <div className="flex gap-2 ml-auto">
                        <button onClick={handleDownloadReportPDF} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2"><Icons.FileText size={16}/> PDF</button>
                        <button onClick={handlePrintReport} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2"><Icons.Printer size={16}/> Print</button>
                    </div>
                </div>
                 {/* Report Tables */}
                 <div className="overflow-x-auto">
                    {reportViewMode === 'detailed' ? (
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="bg-gray-900 text-gray-400 text-xs uppercase font-bold">
                                <tr><th>S/N</th><th>Item</th><th>Qty Before</th><th>Sold</th><th>Rem</th><th>Method</th><th>Cost</th><th>Price</th><th>Total Sales</th><th>Profit</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {detailedReportData.rows.map(r => (
                                    <tr key={Math.random()} className="hover:bg-gray-700/50">
                                        <td className="p-3">{r.sn}</td><td className="p-3 font-bold">{r.itemName}</td>
                                        <td className="p-3">{r.qtyBefore}</td><td className="p-3 text-blue-400 font-bold">{r.qtySold}</td>
                                        <td className="p-3">{r.qtyRemaining}</td><td className="p-3">{r.paymentMethod}</td>
                                        <td className="p-3">{r.unitCost.toFixed(2)}</td><td className="p-3">{r.unitPrice.toFixed(2)}</td>
                                        <td className="p-3 text-white font-bold">{r.totalSales.toFixed(2)}</td><td className="p-3 text-green-400 font-bold">{r.profit.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                             <tfoot className="bg-gray-900 font-bold text-white">
                                <tr>
                                    <td colSpan={8} className="p-4 text-right">Grand Total Sales:</td>
                                    <td className="p-4">{settings.currency}{detailedReportData.grandTotalSales.toFixed(2)}</td>
                                    <td className="p-4 text-green-400">{settings.currency}{detailedReportData.grandTotalProfit.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    ) : (
                        <div>
                            {selectedTransactions.size > 0 && (
                                <div className="mb-4 p-4 bg-gray-900 rounded flex gap-2 items-center">
                                    <span className="text-white font-bold">{selectedTransactions.size} selected</span>
                                    <button onClick={() => { if(window.confirm(`Delete ${selectedTransactions.size} transaction(s)? This will move them to recycle bin.`)) { selectedTransactions.forEach(id => deleteTransaction(id)); setSelectedTransactions(new Set()); } }} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2">
                                        <Icons.Delete size={16}/> Delete Selected
                                    </button>
                                    <button onClick={() => setSelectedTransactions(new Set())} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm">Clear</button>
                                </div>
                            )}
                            <table className="w-full text-left text-sm text-gray-300">
                               <thead className="bg-gray-900 text-gray-400 text-xs uppercase font-bold"><tr><th className="p-3 w-8"><input type="checkbox" className="w-4 h-4 accent-blue-600" checked={selectedTransactions.size === filteredReportTransactions.length && filteredReportTransactions.length > 0} onChange={e => { if(e.target.checked) { setSelectedTransactions(new Set(filteredReportTransactions.map(t => t.id))); } else { setSelectedTransactions(new Set()); } }} /></th><th>Date</th><th>ID</th><th>Cashier</th><th>Method</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                               <tbody className="divide-y divide-gray-700">
                                   {filteredReportTransactions.map(t => (
                                       <tr key={t.id} className="hover:bg-gray-700/50">
                                           <td className="p-3 w-8"><input type="checkbox" className="w-4 h-4 accent-blue-600" checked={selectedTransactions.has(t.id)} onChange={e => { const newSet = new Set(selectedTransactions); if(e.target.checked) { newSet.add(t.id); } else { newSet.delete(t.id); } setSelectedTransactions(newSet); }} /></td>
                                           <td className="p-3">{new Date(t.date).toLocaleString()}</td><td className="p-3 font-mono text-xs">{t.id.slice(0,8)}</td>
                                           <td className="p-3">{t.cashierName}</td><td className="p-3">{t.paymentMethod}</td>
                                           <td className="p-3 font-bold text-white">{settings.currency}{t.total.toFixed(2)}</td><td className="p-3">{t.status}</td>
                                           <td className="p-3"><button onClick={() => { if(window.confirm('Move to recycle bin?')) deleteTransaction(t.id); }} className="text-red-400 hover:text-red-300"><Icons.Delete size={16}/></button></td>
                                       </tr>
                                   ))}
                               </tbody>
                            </table>
                        </div>
                    )}
                 </div>
            </div>
        )}

        {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto bg-gray-800 rounded-xl border border-gray-700 p-8">
                  <h2 className="text-xl font-bold text-white mb-6">Branch Settings</h2>
                  <form onSubmit={e => { e.preventDefault(); if (currentBranch) updateBranch({ ...currentBranch, name: (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value, address: (e.currentTarget.elements.namedItem('address') as HTMLInputElement).value, phone: (e.currentTarget.elements.namedItem('phone') as HTMLInputElement).value }); }} className="space-y-6">
                      <div className="group relative">
                          <label className="block text-sm font-bold text-gray-400 mb-1">Branch Name</label>
                          <input name="name" defaultValue={currentBranch?.name} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded focus:border-blue-500 outline-none" required />
                      </div>
                      <div className="group relative">
                          <label className="block text-sm font-bold text-gray-400 mb-1">Branch Address</label>
                          <input name="address" defaultValue={currentBranch?.address} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded focus:border-blue-500 outline-none" required />
                      </div>
                      <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition">Save Branch Settings</button>
                  </form>
                  
                   <div className="mt-8 pt-8 border-t border-gray-700">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Icons.DownloadCloud size={20}/> Branch Data Backup</h3>
                      <div className="p-4 bg-gray-900 rounded-lg border border-gray-600 mb-4 text-sm text-gray-300">
                          <p>Download a JSON backup of this branch's data (Inventory, Transactions, Users).</p>
                      </div>
                      <div className="flex gap-4">
                          <button onClick={handleBackup} className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded font-bold flex items-center gap-2"><Icons.Download size={16}/> Backup Branch Data</button>
                          <button onClick={handleRestoreClick} className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded font-bold flex items-center gap-2"><Icons.Upload size={16}/> Restore Branch Data</button>
                          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                      </div>
                  </div>
              </div>
        )}
        
        {activeTab === 'inventory' && (
            <div className="flex gap-6 h-full">
                <div className={`transition-all duration-300 flex flex-col ${showCategorySidebar ? 'w-64' : 'w-0 overflow-hidden'}`}>
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 h-full flex flex-col">
                         <h3 className="font-bold text-white mb-4">Categories</h3>
                         <div className="flex gap-2 mb-4">
                             <input className="bg-gray-900 border border-gray-600 rounded p-2 text-sm w-full text-white" placeholder="New Category" value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)}/>
                             <button onClick={handleAddCategory} className="bg-blue-600 text-white p-2 rounded"><Icons.Plus size={16}/></button>
                         </div>
                         <div className="flex-1 overflow-y-auto space-y-1">
                             {categories.map(c => (
                                 <div key={c.id} className="flex justify-between items-center p-2 hover:bg-gray-700 rounded group">
                                     <span className="text-sm text-gray-300">{c.name}</span>
                                     <button onClick={()=>deleteCategory(c.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"><Icons.Delete size={14}/></button>
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center gap-4">
                         <div className="flex gap-2 items-center">
                             <button onClick={()=>setShowCategorySidebar(!showCategorySidebar)} className="p-2 hover:bg-gray-700 rounded"><Icons.Menu size={20} className="text-gray-400"/></button>
                             <input placeholder="Search Products..." className="bg-gray-900 border border-gray-600 text-white p-2 rounded w-64" value={inventorySearch} onChange={e=>setInventorySearch(e.target.value)}/>
                         </div>
                         <div className="flex gap-2 items-center">
                             <button onClick={() => handleGenerateInventoryReport('pdf')} className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded font-bold text-sm flex items-center gap-2"><Icons.FileText size={16}/> Report PDF</button>
                             <button onClick={() => handleGenerateInventoryReport('print')} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded font-bold text-sm flex items-center gap-2"><Icons.Printer size={16}/> Print Report</button>
                             <button onClick={()=>{setEditingProduct(null); setIsProductModalOpen(true);}} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold flex items-center gap-2"><Icons.Plus size={16}/> Add Product</button>
                         </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                             <thead className="bg-gray-900/50 text-gray-400 font-bold sticky top-0"><tr><th className="p-4">Name</th><th className="p-4">SKU</th><th className="p-4">Category</th><th className="p-4">Cost</th><th className="p-4">Price</th><th className="p-4">Stock</th><th className="p-4">Action</th></tr></thead>
                             <tbody className="divide-y divide-gray-700">
                                 {filteredInventory.map(p => (
                                     <tr key={p.id} className="hover:bg-gray-700/50">
                                         <td className="p-4 font-bold text-white">{p.name}</td>
                                         <td className="p-4 text-xs font-mono">{p.sku}</td>
                                         <td className="p-4">{p.category}</td>
                                         <td className="p-4">{settings.currency}{p.costPrice.toFixed(2)}</td>
                                         <td className="p-4">{settings.currency}{p.sellingPrice.toFixed(2)}</td>
                                         <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${p.stock <= p.minStockAlert ? 'bg-red-900 text-red-400' : 'bg-green-900 text-green-400'}`}>{p.stock}</span></td>
                                         <td className="p-4 flex gap-2">
                                             <button onClick={()=>{setEditingProduct(p); setIsProductModalOpen(true);}} className="text-blue-400 hover:text-blue-300"><Icons.Settings size={16}/></button>
                                             <button onClick={()=>deleteProduct(p.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={16}/></button>
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                        </table>
                    </div>
                </div>
            </div>
         )}
         
         {activeTab === 'expenses' && (
             <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                 <div className="flex gap-4 mb-6 border-b border-gray-700 pb-2">
                     <button onClick={()=>setExpenseSubTab('pending')} className={`pb-2 font-bold ${expenseSubTab==='pending'?'text-blue-400 border-b-2 border-blue-400':'text-gray-400'}`}>Pending Requests</button>
                     <button onClick={()=>setExpenseSubTab('history')} className={`pb-2 font-bold ${expenseSubTab==='history'?'text-blue-400 border-b-2 border-blue-400':'text-gray-400'}`}>Expense History</button>
                 </div>
                 
                 {expenseSubTab === 'pending' && (
                     <div className="space-y-4">
                         {branchExpenses.filter(e => e.status === ExpenseStatus.PENDING).map(e => (
                             <div key={e.id} className="bg-gray-900 p-4 rounded-lg flex justify-between items-center border border-gray-700">
                                 <div>
                                     <p className="font-bold text-white">{e.description}</p>
                                     <p className="text-sm text-gray-400">{e.categoryName} • Requested by {e.requestedByName}</p>
                                     <p className="text-lg font-bold text-blue-400 mt-1">{settings.currency}{e.amount.toFixed(2)}</p>
                                 </div>
                                 <div className="flex gap-2">
                                     <button onClick={()=>handleReviewExpense(e, ExpenseStatus.APPROVED)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold">Approve</button>
                                     <button onClick={()=>handleReviewExpense(e, ExpenseStatus.REJECTED)} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold">Reject</button>
                                 </div>
                             </div>
                         ))}
                         {branchExpenses.filter(e => e.status === ExpenseStatus.PENDING).length === 0 && <p className="text-gray-500">No pending requests.</p>}
                         
                         <div className="mt-8 border-t border-gray-700 pt-6">
                             <h3 className="font-bold text-white mb-4">Record New Expense</h3>
                             <form onSubmit={handleCreateExpense} className="flex gap-4 items-end">
                                 <div className="flex-1"><label className="block text-xs text-gray-400 mb-1">Category</label><select className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" value={newExpenseCategory} onChange={e=>setNewExpenseCategory(e.target.value)} required><option value="">Select</option>{expenseCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                 <div className="flex-1"><label className="block text-xs text-gray-400 mb-1">Description</label><input className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" value={newExpenseReason} onChange={e=>setNewExpenseReason(e.target.value)} required /></div>
                                 <div className="w-32"><label className="block text-xs text-gray-400 mb-1">Amount</label><input type="number" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" value={newExpenseAmount} onChange={e=>setNewExpenseAmount(e.target.value)} required /></div>
                                 <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold h-[42px]">Record</button>
                             </form>
                         </div>
                     </div>
                 )}
                 {expenseSubTab === 'history' && (
                     <table className="w-full text-left text-sm text-gray-300">
                         <thead className="bg-gray-900 text-gray-400 font-bold"><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Status</th></tr></thead>
                         <tbody className="divide-y divide-gray-700">
                             {branchExpenses.filter(e => e.status !== ExpenseStatus.PENDING).map(e => (
                                 <tr key={e.id}>
                                     <td className="p-3">{new Date(e.date).toLocaleDateString()}</td>
                                     <td className="p-3 font-bold text-white">{e.description}</td>
                                     <td className="p-3">{e.categoryName}</td>
                                     <td className="p-3">{settings.currency}{e.amount.toFixed(2)}</td>
                                     <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${e.status === ExpenseStatus.APPROVED ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>{e.status}</span></td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 )}
             </div>
         )}
         
         {activeTab === 'debts' && (
             <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                 <h3 className="font-bold text-white text-lg mb-4">Manage Customer Debts</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {debtTransactions.map(t => (
                         <div key={t.id} className="bg-gray-900 border border-gray-700 p-4 rounded-xl">
                             <div className="flex justify-between mb-2"><span className="font-bold text-white">{t.customerName}</span><span className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</span></div>
                             <div className="mb-2 text-sm text-gray-300">
                                 <p>Total: {settings.currency}{t.total.toFixed(2)}</p>
                                 <p>Paid: <span className="text-green-400">{settings.currency}{t.amountPaid.toFixed(2)}</span></p>
                                 <p>Remaining: <span className="text-red-400 font-bold">{settings.currency}{(t.total - t.amountPaid).toFixed(2)}</span></p>
                             </div>
                             <div className="flex gap-2">
                                 <input type="number" className="w-24 bg-gray-800 border border-gray-600 text-white text-xs p-1 rounded" placeholder="Amount" value={selectedDebtTx?.id === t.id ? debtPaymentAmount : ''} onChange={e => { setSelectedDebtTx(t); setDebtPaymentAmount(e.target.value); }} />
                                 <button onClick={handleAddDebtPayment} disabled={selectedDebtTx?.id !== t.id} className="bg-blue-600 text-white text-xs px-3 py-1 rounded font-bold hover:bg-blue-500 disabled:opacity-50">Add Payment</button>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         )}
         
         {activeTab === 'returns' && (
             <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-2xl mx-auto">
                 <h2 className="text-xl font-bold text-white mb-6">Process Return</h2>
                 <div className="flex gap-4 mb-6">
                    <input type="text" placeholder="Enter Invoice ID..." className="flex-1 border border-gray-600 bg-gray-900 text-white p-3 rounded-lg" value={returnInvoiceId} onChange={e => setReturnInvoiceId(e.target.value)} />
                    <button onClick={handleSearchForReturn} className="bg-blue-600 text-white px-6 rounded-lg font-bold hover:bg-blue-700">Search</button>
                </div>
                {returnTransaction && (
                    <div className="flex flex-col">
                        <h3 className="font-bold text-lg mb-4 text-white">Select Items to Return</h3>
                        <div className="flex-1 overflow-auto border border-gray-600 rounded-lg p-4 mb-4 bg-gray-900">
                            {returnTransaction.items.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-800 mb-2 rounded shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={!!itemsToReturn.find(i => i.itemId === item.id)} onChange={() => toggleItemReturn(item.id, item.quantity)} />
                                        <span className="font-bold text-gray-300">{item.name} (Qty: {item.quantity})</span>
                                    </div>
                                    <span className="font-bold text-white">{settings.currency}{item.sellingPrice}</span>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div><label className="block text-sm font-bold text-gray-400 mb-1">Condition</label><select className="w-full border border-gray-600 bg-gray-900 text-white p-3 rounded-lg" value={returnCondition} onChange={e => setReturnCondition(e.target.value)}><option value="Good">Good (Restock)</option><option value="Damaged">Damaged (No Restock)</option></select></div>
                            <div><label className="block text-sm font-bold text-gray-400 mb-1">Reason</label><input type="text" placeholder="Reason" className="w-full border border-gray-600 bg-gray-900 text-white p-3 rounded-lg" value={returnReason} onChange={e => setReturnReason(e.target.value)} /></div>
                        </div>
                        <button onClick={handleProcessReturn} disabled={itemsToReturn.length === 0} className="bg-red-600 text-white py-3 rounded-lg font-bold w-full hover:bg-red-700 disabled:bg-gray-600">Confirm Return</button>
                    </div>
                )}
             </div>
         )}
         
         {activeTab === 'profile' && (
             <div className="max-w-md mx-auto bg-gray-800 rounded-xl border border-gray-700 p-8">
                 <div className="text-center mb-6">
                     <div className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center"><Icons.User size={48} className="text-gray-400"/></div>
                     <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
                     <p className="text-gray-400">@{user?.username} • Admin</p>
                 </div>
                 {isEditingProfile ? (
                     <form onSubmit={handleUpdateProfile} className="space-y-4">
                         <input name="name" defaultValue={user?.name} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" placeholder="Full Name"/>
                         <input name="username" defaultValue={user?.username} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" placeholder="Username"/>
                         <div className="flex gap-2"><button type="button" onClick={()=>setIsEditingProfile(false)} className="flex-1 bg-gray-700 text-white py-2 rounded">Cancel</button><button className="flex-1 bg-blue-600 text-white py-2 rounded font-bold">Save</button></div>
                     </form>
                 ) : (
                     <button onClick={()=>setIsEditingProfile(true)} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-bold">Edit Profile</button>
                 )}
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
                                     <th className="p-3">Total</th>
                                     <th className="p-3">Deleted By</th>
                                     <th className="p-3">Deleted At</th>
                                     <th className="p-3">Actions</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-700">
                                 {deletedTransactions.map(t => (
                                     <tr key={t.id} className="hover:bg-gray-700/50">
                                         <td className="p-3">{new Date(t.date).toLocaleString()}</td>
                                         <td className="p-3 font-mono text-xs">{t.id.substring(0, 8)}</td>
                                         <td className="p-3">{t.cashierName}</td>
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
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 )}
             </div>
         )}

      </main>
      
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
                          <div className="col-span-2 flex gap-2 mt-4"><button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button><button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">Save Product</button></div>
                      </form>
                  </div>
              </div>
      )}
    </div>
  );
};
