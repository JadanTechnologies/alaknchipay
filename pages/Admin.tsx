
import React, { useState, useEffect, useMemo } from 'react';
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
    expenses, addExpense, updateExpense, updateTransaction, processRefund, expenseCategories
  } = useStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'reports' | 'debts' | 'expenses' | 'settings' | 'profile' | 'returns'>('dashboard');
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
        status: ExpenseStatus.APPROVED, // Admins auto-approve their own branch expenses usually, or set PENDING if needed. Let's assume APPROVED for Admin.
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

  const handlePrintReceipt = (tx: Transaction) => {
      const paymentRows = tx.paymentMethod === PaymentMethod.SPLIT 
        ? tx.payments.map(p => 
            `<tr><td>${p.method}</td><td class="right">${settings.currency}${p.amount.toFixed(2)}</td></tr>`
          ).join('')
        : `<tr><td>${tx.paymentMethod}</td><td class="right">${settings.currency}${tx.amountPaid.toFixed(2)}</td></tr>`;

      const balance = (tx.total - tx.amountPaid);
      const isPaid = tx.amountPaid >= tx.total - 0.01;

      const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt #${tx.id.substring(0,8)}</title>
        <style>
          @media print { 
            @page { margin: 0; size: 80mm auto; } 
            body { margin: 0; padding: 10px; }
          }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 80mm; 
            margin: 0 auto; 
            padding: 10px;
            background: #fff;
            color: #000;
            font-size: 12px;
            line-height: 1.2;
          }
          .header { text-align: center; margin-bottom: 10px; }
          .logo { font-size: 18px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
          .branch { font-size: 14px; font-weight: bold; margin-bottom: 3px; }
          .info { font-size: 10px; margin-bottom: 2px; }
          .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; border-bottom: 1px dashed #000; padding: 4px 0; font-size: 11px; }
          td { padding: 4px 0; vertical-align: top; }
          .right { text-align: right; }
          .center { text-align: center; }
          .total-section { border-top: 1px dashed #000; margin-top: 8px; padding-top: 4px; }
          .total-row { font-weight: bold; font-size: 14px; margin-top: 4px; display: flex; justify-content: space-between; }
          .sub-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }
          .footer { text-align: center; font-size: 10px; margin-top: 15px; }
          .status { text-align: center; font-weight: bold; border: 1px solid #000; padding: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">${settings.name}</div>
          <div class="branch">${currentBranch?.name || 'Main Branch'}</div>
          <div class="info">${currentBranch?.address || ''}</div>
          <div class="info">${currentBranch?.phone || ''}</div>
        </div>
        
        <div class="divider"></div>
        
        <div class="info">
          <div><strong>Date:</strong> ${new Date(tx.date).toLocaleDateString()}</div>
          <div><strong>Time:</strong> ${new Date(tx.date).toLocaleTimeString()}</div>
          <div><strong>Cashier:</strong> ${tx.cashierName}</div>
          <div><strong>Receipt #:</strong> ${tx.id.substring(0,8)}</div>
          ${tx.customerName ? `<div><strong>Customer:</strong> ${tx.customerName}</div>` : ''}
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th style="width: 50%;">Item</th>
              <th class="center" style="width: 15%;">Qty</th>
              <th class="right" style="width: 35%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${tx.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="center">x${item.quantity}</td>
                <td class="right">${settings.currency}${(item.sellingPrice * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div class="sub-row">
            <span>Subtotal:</span>
            <span>${settings.currency}${tx.subtotal.toFixed(2)}</span>
          </div>
          ${tx.discount > 0 ? `
          <div class="sub-row">
            <span>Discount:</span>
            <span>-${settings.currency}${(tx.discount || 0).toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="total-row">
            <span>TOTAL:</span>
            <span>${settings.currency}${tx.total.toFixed(2)}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div style="margin-bottom: 8px;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px;">PAYMENT DETAILS</div>
          <table>
            ${paymentRows}
          </table>
        </div>

        <div class="divider"></div>
        
        <div class="sub-row" style="font-weight: bold;">
          <span>Amount Paid:</span>
          <span>${settings.currency}${tx.amountPaid.toFixed(2)}</span>
        </div>
        ${!isPaid ? `
        <div class="sub-row" style="color: red;">
          <span>Balance Due:</span>
          <span>${settings.currency}${balance.toFixed(2)}</span>
        </div>
        ` : `
         <div class="sub-row">
          <span>Change:</span>
          <span>${settings.currency}${(tx.amountPaid - tx.total).toFixed(2)}</span>
        </div>
        `}
        
        <div class="status">
          ${isPaid ? 'PAID FULLY' : 'PARTIAL PAYMENT'}
        </div>

        <div class="footer">
          <div>Thank you for your patronage!</div>
          <div>Powered by AlkanchiPay</div>
        </div>
        <script>window.onload = function() { window.print(); window.onafterprint = function(){ window.close(); } };</script>
      </body>
      </html>`;
      
      const win = window.open('','_blank','width=400,height=600'); 
      if(win) { win.document.write(receiptHtml); win.document.close(); }
  };

  const handleDownloadReportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const branchName = currentBranch?.name || 'Main Branch';
    const dateRange = filterStartDate && filterEndDate ? `${filterStartDate} to ${filterEndDate}` : 'All Time';
    const cashierName = filterCashier ? users.find(u => u.id === filterCashier)?.name : 'All Cashiers';

    doc.setFontSize(18); doc.text(settings.name, 14, 15);
    doc.setFontSize(14); doc.text(branchName, 14, 22);
    doc.setFontSize(10); doc.text(`Report Type: ${reportViewMode.toUpperCase()} Report`, 14, 28);
    doc.text(`Date Range: ${dateRange} | Cashier: ${cashierName}`, 14, 33);
    doc.text(`Generated: ${new Date().toLocaleString()} by ${user?.name}`, 14, 38);

    if (reportViewMode === 'detailed') {
        const columns = ["S/N", "Item", "Qty Before", "Sold", "Rem", "Method", "Cost", "Price", "Sales", "Profit", "Cashier", "Date"];
        const rows = detailedReportData.rows.map(r => [
            r.sn, r.itemName, r.qtyBefore, r.qtySold, r.qtyRemaining, r.paymentMethod,
            r.unitCost.toFixed(2), r.unitPrice.toFixed(2), r.totalSales.toFixed(2), r.profit.toFixed(2),
            r.cashier, r.date.split(',')[0]
        ]);
        
        autoTable(doc, { 
            head: [columns], body: rows, startY: 45, theme: 'grid', 
            headStyles: { fillColor: [40, 40, 40] },
            styles: { fontSize: 8 }
        });

        // Summary Table
        const summaryY = (doc as any).lastAutoTable.finalY + 10;
        doc.text("Financial Summary", 14, summaryY);
        
        // Calculate Payment Method Breakdown
        const breakdown = { [PaymentMethod.CASH]: 0, [PaymentMethod.POS]: 0, [PaymentMethod.TRANSFER]: 0, [PaymentMethod.CREDIT]: 0 };
        filteredReportTransactions.forEach(t => {
            if(t.paymentMethod === PaymentMethod.SPLIT) {
                t.payments.forEach(p => { if(breakdown[p.method] !== undefined) breakdown[p.method] += p.amount; });
            } else if(breakdown[t.paymentMethod] !== undefined) {
                breakdown[t.paymentMethod] += t.amountPaid;
            }
        });

        autoTable(doc, {
            head: [['Metric', 'Value']],
            body: [
                ['Total Sales Revenue', detailedReportData.grandTotalSales.toFixed(2)],
                ['Total Cost', detailedReportData.grandTotalCost.toFixed(2)],
                ['Total Profit', detailedReportData.grandTotalProfit.toFixed(2)],
                ['Total Cash', breakdown[PaymentMethod.CASH].toFixed(2)],
                ['Total POS', breakdown[PaymentMethod.POS].toFixed(2)],
                ['Total Transfer', breakdown[PaymentMethod.TRANSFER].toFixed(2)],
                ['Total Credit/Debt', breakdown[PaymentMethod.CREDIT].toFixed(2)],
            ],
            startY: summaryY + 5,
            theme: 'grid',
            tableWidth: 100
        });

    } else if (reportViewMode === 'transactions') {
        const columns = ["Date", "Tx ID", "Cashier", "Method", "Total", "Status"];
        const rows = filteredReportTransactions.map(t => [new Date(t.date).toLocaleString(), t.id.substring(0,8), t.cashierName, t.paymentMethod, t.total.toFixed(2), t.status]);
        autoTable(doc, { head: [columns], body: rows, startY: 45, theme: 'grid', headStyles: { fillColor: [40, 40, 40] } });
    }

    doc.save(`Report_${branchName}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleUpdateBranchSettings = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!currentBranch) return;
      const formData = new FormData(e.currentTarget);
      updateBranch({
          ...currentBranch,
          name: formData.get('name') as string,
          address: formData.get('address') as string,
          phone: formData.get('phone') as string,
      });
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

  // Returns Logic
  const handleSearchForReturn = () => {
    const found = transactions.find(t => t.id === returnInvoiceId);
    if (found) { setReturnTransaction(found); setItemsToReturn([]); setReturnCondition('Good'); }
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
            {[{ id: 'dashboard', icon: Icons.Dashboard, label: 'Dashboard' }, { id: 'reports', icon: Icons.Reports, label: 'Reports & Analytics' }, { id: 'inventory', icon: Icons.Inventory, label: 'Branch Inventory' }, { id: 'debts', icon: Icons.Wallet, label: 'Debts & Deposits' }, { id: 'expenses', icon: Icons.Expenses, label: 'Expenses' }, { id: 'returns', icon: Icons.RotateCcw, label: 'Returns' }, { id: 'settings', icon: Icons.Settings, label: 'Branch Settings' }, { id: 'profile', icon: Icons.User, label: 'My Profile' }].map(item => (
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
               
               {/* Recent Sales Feed */}
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

        {activeTab === 'inventory' && (
            <div className="flex gap-6 h-full">
                <div className={`${showCategorySidebar ? 'w-64' : 'w-0 hidden'} bg-gray-800 rounded-xl border border-gray-700 p-4 transition-all duration-300 overflow-hidden`}>
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
                            <input type="text" placeholder="Search Inventory..." className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} />
                        </div>
                        <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Icons.Add size={18} /> Add Product</button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold sticky top-0">
                                <tr>
                                    <th className="p-4">Product</th>
                                    <th className="p-4">SKU</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4 text-right">Cost</th>
                                    <th className="p-4 text-right">Price</th>
                                    <th className="p-4 text-center">Stock</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredInventory.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-700/50 text-gray-200">
                                        <td className="p-4 font-bold text-white">{p.name}</td>
                                        <td className="p-4 font-mono text-xs text-gray-400">{p.sku}</td>
                                        <td className="p-4">{p.category}</td>
                                        <td className="p-4 text-right">{settings.currency}{p.costPrice.toFixed(2)}</td>
                                        <td className="p-4 text-right text-green-400 font-bold">{settings.currency}{p.sellingPrice.toFixed(2)}</td>
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

        {activeTab === 'reports' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <select className="bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" value={reportViewMode} onChange={e => setReportViewMode(e.target.value as any)}>
                        <option value="transactions">Transaction History</option>
                        <option value="detailed">Detailed Item Report</option>
                        <option value="deposits">Deposit & Debt Report</option>
                        <option value="items">Remaining Items Report</option>
                    </select>
                    <input type="date" className="bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                    <input type="date" className="bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                    <select className="bg-gray-900 border border-gray-600 text-white p-2 rounded text-sm" value={filterCashier} onChange={e => setFilterCashier(e.target.value)}><option value="">All Cashiers</option>{users.filter(u => u.storeId === user?.storeId).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                    <div className="flex gap-2 ml-auto">
                        <button onClick={handleDownloadReportPDF} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2"><Icons.FileText size={16}/> PDF</button>
                    </div>
                </div>

                <div className="overflow-x-auto border border-gray-700 rounded-lg">
                    {reportViewMode === 'detailed' && (
                        <table className="w-full text-left text-sm text-gray-200">
                            <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold"><tr><th className="p-3">S/N</th><th className="p-3">Item Name</th><th className="p-3 text-center">Before</th><th className="p-3 text-center">Sold</th><th className="p-3 text-center">Rem</th><th className="p-3">Method</th><th className="p-3 text-right">Cost</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Sales</th><th className="p-3 text-right">Profit</th></tr></thead>
                            <tbody className="divide-y divide-gray-700">
                                {detailedReportData.rows.map(r => (
                                    <tr key={r.sn} className="hover:bg-gray-700/50">
                                        <td className="p-3">{r.sn}</td>
                                        <td className="p-3 font-bold text-white">{r.itemName}</td>
                                        <td className="p-3 text-center text-gray-400">{r.qtyBefore}</td>
                                        <td className="p-3 text-center font-bold text-blue-400">{r.qtySold}</td>
                                        <td className="p-3 text-center text-gray-200">{r.qtyRemaining}</td>
                                        <td className="p-3 text-gray-400">{r.paymentMethod}</td>
                                        <td className="p-3 text-right">{r.unitCost.toFixed(2)}</td>
                                        <td className="p-3 text-right">{r.unitPrice.toFixed(2)}</td>
                                        <td className="p-3 text-right font-bold text-green-400">{r.totalSales.toFixed(2)}</td>
                                        <td className="p-3 text-right font-bold text-blue-400">{r.profit.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-900/80 font-bold text-white border-t border-gray-600">
                                <tr><td colSpan={6} className="p-3 text-right">Grand Total:</td><td className="p-3 text-right text-gray-400">{detailedReportData.grandTotalCost.toFixed(2)}</td><td></td><td className="p-3 text-right text-green-400">{detailedReportData.grandTotalSales.toFixed(2)}</td><td className="p-3 text-right text-blue-400">{detailedReportData.grandTotalProfit.toFixed(2)}</td></tr>
                            </tfoot>
                        </table>
                    )}
                    
                    {reportViewMode === 'transactions' && (
                         <table className="w-full text-left text-sm text-gray-200">
                            <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold"><tr><th className="p-3">Date</th><th className="p-3">Receipt #</th><th className="p-3">Cashier</th><th className="p-3">Method</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr></thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredReportTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-700/50">
                                        <td className="p-3 text-gray-400">{new Date(t.date).toLocaleString()}</td>
                                        <td className="p-3 font-mono text-xs">{t.id.slice(0,8)}</td>
                                        <td className="p-3">{t.cashierName}</td>
                                        <td className="p-3">{t.paymentMethod}</td>
                                        <td className="p-3 font-bold text-green-400">{settings.currency}{t.total.toFixed(2)}</td>
                                        <td className="p-3"><span className="bg-gray-700 px-2 py-0.5 rounded text-xs">{t.status}</span></td>
                                        <td className="p-3 text-right"><button onClick={()=>handlePrintReceipt(t)} className="text-gray-400 hover:text-white"><Icons.Printer size={16}/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                    )}
                    
                     {reportViewMode === 'items' && (
                         <table className="w-full text-left text-sm text-gray-200">
                            <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold"><tr><th className="p-3">Item Name</th><th className="p-3">Category</th><th className="p-3 text-center">Current Stock</th><th className="p-3 text-right">Value (Cost)</th><th className="p-3 text-right">Value (Sales)</th></tr></thead>
                            <tbody className="divide-y divide-gray-700">
                                {products.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-700/50">
                                        <td className="p-3 font-bold text-white">{p.name}</td>
                                        <td className="p-3 text-gray-400">{p.category}</td>
                                        <td className="p-3 text-center font-bold">{p.stock}</td>
                                        <td className="p-3 text-right">{settings.currency}{(p.stock * p.costPrice).toFixed(2)}</td>
                                        <td className="p-3 text-right text-green-400">{settings.currency}{(p.stock * p.sellingPrice).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'expenses' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex gap-4 mb-6 border-b border-gray-700 pb-2">
                     <button onClick={() => setExpenseSubTab('pending')} className={`font-bold pb-2 ${expenseSubTab === 'pending' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>Pending Requests</button>
                     <button onClick={() => setExpenseSubTab('history')} className={`font-bold pb-2 ${expenseSubTab === 'history' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>Expense History</button>
                </div>

                {expenseSubTab === 'pending' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="bg-gray-900 border border-gray-600 rounded-xl p-4">
                             <h3 className="font-bold text-white mb-4">Create New Expense</h3>
                             <form onSubmit={handleCreateExpense} className="space-y-4">
                                 <div><label className="text-gray-400 text-xs font-bold">Category</label><select className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded" value={newExpenseCategory} onChange={e=>setNewExpenseCategory(e.target.value)} required><option value="">Select Category</option>{expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                 <div><label className="text-gray-400 text-xs font-bold">Amount</label><input type="number" className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded" value={newExpenseAmount} onChange={e=>setNewExpenseAmount(e.target.value)} required /></div>
                                 <div><label className="text-gray-400 text-xs font-bold">Description</label><textarea className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded" value={newExpenseReason} onChange={e=>setNewExpenseReason(e.target.value)} required /></div>
                                 <button className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-500">Submit Approved Expense</button>
                             </form>
                         </div>
                         <div className="md:col-span-2">
                             <h3 className="font-bold text-white mb-4">Pending Cashier Requests</h3>
                             <div className="space-y-3">
                                 {branchExpenses.filter(e => e.status === ExpenseStatus.PENDING).length === 0 && <p className="text-gray-500">No pending requests.</p>}
                                 {branchExpenses.filter(e => e.status === ExpenseStatus.PENDING).map(exp => (
                                     <div key={exp.id} className="bg-gray-700/50 border border-gray-600 p-4 rounded-lg flex justify-between items-center">
                                         <div>
                                             <p className="font-bold text-white">{exp.description} <span className="text-xs text-gray-400">({exp.categoryName})</span></p>
                                             <p className="text-sm text-gray-400">Requested by: {exp.requestedByName} • {settings.currency}{exp.amount.toFixed(2)}</p>
                                         </div>
                                         <div className="flex gap-2">
                                             <button onClick={() => handleReviewExpense(exp, ExpenseStatus.APPROVED)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-500">Approve</button>
                                             <button onClick={() => handleReviewExpense(exp, ExpenseStatus.REJECTED)} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-500">Reject</button>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                    </div>
                )}
                
                {expenseSubTab === 'history' && (
                    <table className="w-full text-left text-sm text-gray-200">
                        <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold"><tr><th className="p-3">Date</th><th className="p-3">Description</th><th className="p-3">Category</th><th className="p-3">Amount</th><th className="p-3">By</th><th className="p-3">Status</th></tr></thead>
                        <tbody className="divide-y divide-gray-700">
                             {branchExpenses.map(e => (
                                 <tr key={e.id} className="hover:bg-gray-700/50">
                                     <td className="p-3 text-gray-400">{new Date(e.date).toLocaleDateString()}</td>
                                     <td className="p-3">{e.description}</td>
                                     <td className="p-3 text-gray-400">{e.categoryName}</td>
                                     <td className="p-3 font-bold text-white">{settings.currency}{e.amount.toFixed(2)}</td>
                                     <td className="p-3">{e.requestedByName}</td>
                                     <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${e.status === 'APPROVED' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{e.status}</span></td>
                                 </tr>
                             ))}
                        </tbody>
                    </table>
                )}
            </div>
        )}

        {activeTab === 'debts' && (
             <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                 <h3 className="font-bold text-white mb-4">Outstanding Debts & Partial Payments</h3>
                 <table className="w-full text-left text-sm text-gray-200">
                    <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-bold"><tr><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Total</th><th className="p-3">Paid</th><th className="p-3">Remaining</th><th className="p-3">Due</th><th className="p-3">Action</th></tr></thead>
                    <tbody className="divide-y divide-gray-700">
                        {debtTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-700/50">
                                <td className="p-3 text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                                <td className="p-3 font-bold text-white">{t.customerName}</td>
                                <td className="p-3 text-white">{settings.currency}{t.total.toFixed(2)}</td>
                                <td className="p-3 text-green-400">{settings.currency}{t.amountPaid.toFixed(2)}</td>
                                <td className="p-3 text-red-400 font-bold">{settings.currency}{(t.total - t.amountPaid).toFixed(2)}</td>
                                <td className="p-3 text-gray-300">{t.dueDate || '-'}</td>
                                <td className="p-3"><button onClick={() => setSelectedDebtTx(t)} className="bg-blue-900/50 text-blue-400 px-3 py-1 rounded text-xs font-bold hover:bg-blue-900">Add Payment</button></td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             </div>
        )}

        {activeTab === 'returns' && (
             <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                 <div className="flex gap-4 mb-6">
                    <input type="text" placeholder="Enter Invoice ID..." className="flex-1 border border-gray-600 bg-gray-900 text-white p-2 rounded" value={returnInvoiceId} onChange={e => setReturnInvoiceId(e.target.value)} />
                    <button onClick={handleSearchForReturn} className="bg-blue-600 text-white px-6 rounded font-bold hover:bg-blue-700">Search</button>
                </div>
                {returnTransaction && (
                    <div className="flex flex-col">
                        <h3 className="font-bold text-lg mb-4 text-white">Select Items to Return</h3>
                        <div className="flex-1 overflow-auto border border-gray-600 rounded p-4 mb-4 bg-gray-900">
                            {returnTransaction.items.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-800 mb-2 rounded shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" className="w-5 h-5" checked={!!itemsToReturn.find(i => i.itemId === item.id)} onChange={() => toggleItemReturn(item.id, item.quantity)} />
                                        <span className="font-bold text-gray-300">{item.name} (Qty: {item.quantity})</span>
                                    </div>
                                    <span className="font-bold text-white">{settings.currency}{item.sellingPrice}</span>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-1">Return Condition</label>
                                <select className="w-full border border-gray-600 bg-gray-900 text-white p-2 rounded" value={returnCondition} onChange={e => setReturnCondition(e.target.value)}>
                                    <option value="Good">Good (Restock)</option>
                                    <option value="Damaged">Damaged (Do Not Restock)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-1">Reason</label>
                                <input type="text" placeholder="Reason..." className="w-full border border-gray-600 bg-gray-900 text-white p-2 rounded" value={returnReason} onChange={e => setReturnReason(e.target.value)} />
                            </div>
                        </div>
                        <button onClick={handleProcessReturn} disabled={itemsToReturn.length === 0} className="bg-red-600 text-white py-3 rounded font-bold w-full hover:bg-red-700 disabled:bg-gray-600">Process Return</button>
                    </div>
                )}
             </div>
        )}

        {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto bg-gray-800 rounded-xl border border-gray-700 p-8">
                <h2 className="text-xl font-bold text-white mb-6">Branch Settings</h2>
                <form onSubmit={handleUpdateBranchSettings} className="space-y-6">
                    <div><label className="text-gray-400 text-xs font-bold mb-1 block">Branch Name</label><input name="name" defaultValue={currentBranch?.name} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded" required /></div>
                    <div><label className="text-gray-400 text-xs font-bold mb-1 block">Address</label><input name="address" defaultValue={currentBranch?.address} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded" required /></div>
                    <div><label className="text-gray-400 text-xs font-bold mb-1 block">Phone</label><input name="phone" defaultValue={currentBranch?.phone} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded" required /></div>
                    <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition">Save Changes</button>
                </form>
            </div>
        )}

        {activeTab === 'profile' && (
            <div className="max-w-xl mx-auto bg-gray-800 rounded-xl border border-gray-700 p-8">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-700">
                    <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-gray-400"><Icons.User size={40}/></div>
                    <div><h2 className="text-2xl font-bold text-white">{user?.name}</h2><p className="text-gray-400 capitalize">{user?.role}</p></div>
                    <button onClick={()=>setIsEditingProfile(!isEditingProfile)} className="ml-auto text-blue-400 hover:text-blue-300 font-bold text-sm">{isEditingProfile ? 'Cancel' : 'Edit Profile'}</button>
                </div>
                {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div><label className="text-gray-400 text-xs font-bold">Full Name</label><input name="name" defaultValue={user?.name} className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-white" required /></div>
                        <div><label className="text-gray-400 text-xs font-bold">Username</label><input name="username" defaultValue={user?.username} className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-white" required /></div>
                        <button className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-500">Save Changes</button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between p-3 bg-gray-900 rounded border border-gray-700"><span className="text-gray-400 font-medium">Username</span><span className="font-bold text-white">{user?.username}</span></div>
                        <div className="flex justify-between p-3 bg-gray-900 rounded border border-gray-700"><span className="text-gray-400 font-medium">Status</span><span className="font-bold text-green-500 flex items-center gap-1"><Icons.Check size={14}/> Active</span></div>
                    </div>
                )}
            </div>
        )}
      </main>

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
                      <div className="col-span-2 flex gap-2 mt-4">
                          <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button>
                          <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">Save Product</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Debt Payment Modal */}
      {selectedDebtTx && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-6 rounded-xl w-96 shadow-2xl border border-gray-700">
                    <h3 className="font-bold text-lg mb-4 text-white">Add Payment for {selectedDebtTx.customerName}</h3>
                    <p className="mb-4 text-sm text-gray-400">Remaining Balance: <span className="text-red-400 font-bold">{settings.currency}{(selectedDebtTx.total - selectedDebtTx.amountPaid).toFixed(2)}</span></p>
                    <input type="number" placeholder="Enter Amount" className="w-full border border-gray-600 bg-gray-900 text-white p-2 rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none" value={debtPaymentAmount} onChange={e => setDebtPaymentAmount(e.target.value)} />
                    <div className="flex gap-2"><button onClick={() => setSelectedDebtTx(null)} className="flex-1 py-2 bg-gray-700 rounded text-gray-300 font-bold hover:bg-gray-600">Cancel</button><button onClick={handleAddDebtPayment} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Confirm</button></div>
                </div>
            </div>
      )}
    </div>
  );
};
