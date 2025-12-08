
import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, Role, Transaction, RefundItem, PaymentMethod, TransactionStatus, Expense, ExpenseStatus } from '../types';
import { Icons } from '../components/ui/Icons';
import { nanoid } from 'nanoid';
import { HeaderTools } from '../components/ui/HeaderTools';
import jsPDF from 'jspdf';
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

  // Return State
  const [returnInvoiceId, setReturnInvoiceId] = useState('');
  const [returnTransaction, setReturnTransaction] = useState<Transaction | null>(null);
  const [itemsToReturn, setItemsToReturn] = useState<{itemId: string, qty: number}[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnCondition, setReturnCondition] = useState('Good');

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
  
  const depositTransactions = filteredReportTransactions.filter(t => t.paymentMethod === PaymentMethod.DEPOSIT || t.status === TransactionStatus.PARTIAL || (t.paymentMethod === PaymentMethod.CREDIT));

  // Detailed Report Logic
  const detailedReportData = useMemo(() => {
    let rowIndex = 1, grandTotalCost = 0, grandTotalSales = 0, grandTotalProfit = 0, grandTotalBalance = 0, grandDiscount = 0;
    
    const rows = filteredReportTransactions.flatMap(t => {
      const itemDiscountShare = t.discount / t.items.length;

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

  const handlePrintReceipt = (tx: Transaction) => {
      // (Receipt Logic same as Cashier - omitted for brevity but included in output if file fully replaced)
      // I will include the full function to ensure it works.
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
          <div>Please check your items before leaving.</div>
          <div>Powered by AlkanchiPay</div>
        </div>
        
        <script>
          window.onload = function() { window.print(); window.onafterprint = function(){ window.close(); } };
        </script>
      </body>
      </html>
      `;
      
      const win = window.open('','_blank','width=400,height=600'); 
      if(win) {
          win.document.write(receiptHtml); 
          win.document.close();
      }
  };

  const handleDownloadReportPDF = () => {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
      const branchName = currentBranch?.name || 'AlkanchiPay Store';
      const reportTitle = reportViewMode === 'transactions' ? 'Sales Transaction Report' : reportViewMode === 'detailed' ? 'Detailed Item Sales Report' : reportViewMode === 'deposits' ? 'Deposit Sales Report' : 'Remaining Items Report';
      const period = `Period: ${filterStartDate || 'Start'} to ${filterEndDate || 'Today'}`;
      const generatedBy = `Generated: ${new Date().toLocaleString()} by ${user?.name}`;
      
      doc.setFontSize(18); doc.text(settings.name, 14, 15);
      doc.setFontSize(14); doc.text(branchName, 14, 22);
      doc.setFontSize(12); doc.text(reportTitle, 14, 29);
      doc.setFontSize(10); doc.setTextColor(50); doc.text(`${period} | ${generatedBy}`, 14, 35); doc.setTextColor(0);

      if (reportViewMode === 'transactions') {
          const tableColumn = ["ID", "Date", "Cashier", "Items", "Method", "Total"];
          const tableRows = filteredReportTransactions.map(t => [ 
              t.id.substring(0, 8), 
              new Date(t.date).toLocaleString(), 
              t.cashierName, 
              t.items.length, 
              t.paymentMethod, 
              t.total.toFixed(2) 
          ]);
          autoTable(doc, { 
              head: [tableColumn], 
              body: tableRows, 
              startY: 40, 
              foot: [['', '', '', '', 'TOTAL', filteredReportTransactions.reduce((a,b)=>a+b.total,0).toFixed(2)]], 
              theme: 'grid',
              headStyles: { fillColor: [40, 40, 40] }
          });
      } else if (reportViewMode === 'detailed') {
          const tableColumn = ["S/N", "Item", "Before", "Sold", "Rem", "Cost", "Price", "Total Cost", "Total Sales", "Profit", "Cashier", "Date"];
          const tableRows = detailedReportData.rows.map(r => [ 
              r.sn, 
              r.itemName, 
              r.qtyBefore, 
              r.qtySold, 
              r.qtyRemaining,
              r.unitCost.toFixed(2), 
              r.unitPrice.toFixed(2), 
              r.totalCost.toFixed(2),
              r.totalSales.toFixed(2), 
              r.profit.toFixed(2),
              r.cashier,
              r.date
          ]);
          autoTable(doc, { 
              head: [tableColumn], 
              body: tableRows, 
              startY: 40, 
              foot: [['', 'TOTAL', '', '', '', detailedReportData.grandTotalCost.toFixed(2), '', detailedReportData.grandTotalCost.toFixed(2), detailedReportData.grandTotalSales.toFixed(2), detailedReportData.grandTotalProfit.toFixed(2), '', '']], 
              theme: 'grid',
              styles: { fontSize: 8 },
              headStyles: { fillColor: [40, 40, 40] }
          });
      } else if (reportViewMode === 'deposits') {
          const tableColumn = ["Date", "Customer", "Total", "Paid", "Balance", "Due Date"];
          const tableRows = depositTransactions.map(t => [
              new Date(t.date).toLocaleString(),
              t.customerName || 'Guest',
              t.total.toFixed(2),
              t.amountPaid.toFixed(2),
              (t.total - t.amountPaid).toFixed(2),
              t.dueDate || '-'
          ]);
           autoTable(doc, { 
              head: [tableColumn], 
              body: tableRows, 
              startY: 40, 
              theme: 'grid',
              headStyles: { fillColor: [40, 40, 40] }
          });
      } else if (reportViewMode === 'items') {
          const tableColumn = ["Item", "Category", "Stock", "Cost Value", "Sales Value"];
          const tableRows = filteredInventory.map(p => [
              p.name,
              p.category,
              p.stock,
              (p.stock * p.costPrice).toFixed(2),
              (p.stock * p.sellingPrice).toFixed(2)
          ]);
          autoTable(doc, { 
              head: [tableColumn], 
              body: tableRows, 
              startY: 40, 
              foot: [['TOTAL', '', filteredInventory.reduce((a,b)=>a+b.stock,0), filteredInventory.reduce((a,b)=>a+(b.stock*b.costPrice),0).toFixed(2), filteredInventory.reduce((a,b)=>a+(b.stock*b.sellingPrice),0).toFixed(2)]],
              theme: 'grid',
              headStyles: { fillColor: [40, 40, 40] }
          });
      }
      doc.save(`${reportTitle.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  const handlePrintReport = () => {
    // Report printing logic same as before
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportTitle = reportViewMode === 'transactions' ? 'Sales Transaction Report' 
                      : reportViewMode === 'detailed' ? 'Detailed Item Sales Report' 
                      : reportViewMode === 'deposits' ? 'Deposit Sales Report' 
                      : 'Remaining Items Report';

    let tableHTML = '';
    
    if (reportViewMode === 'transactions') {
        const rows = filteredReportTransactions.map(t => `<tr><td>${t.id.substring(0,8)}</td><td>${new Date(t.date).toLocaleString()}</td><td>${t.cashierName}</td><td>${t.items.length}</td><td>${t.paymentMethod}</td><td style="text-align:right;">${t.total.toFixed(2)}</td></tr>`).join('');
        tableHTML = `
            <thead><tr><th>ID</th><th>Date</th><th>Cashier</th><th>Items</th><th>Method</th><th style="text-align:right;">Total</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr><td colspan="5" style="text-align:right; font-weight:bold;">TOTAL</td><td style="text-align:right; font-weight:bold;">${filteredReportTransactions.reduce((a,b)=>a+b.total,0).toFixed(2)}</td></tr></tfoot>
        `;
    } else if (reportViewMode === 'detailed') {
        const rows = detailedReportData.rows.map(r => `<tr><td>${r.sn}</td><td>${r.itemName}</td><td style="text-align:center;">${r.qtyBefore}</td><td style="text-align:center;">${r.qtySold}</td><td style="text-align:center;">${r.qtyRemaining}</td><td style="text-align:right;">${r.unitCost.toFixed(2)}</td><td style="text-align:right;">${r.unitPrice.toFixed(2)}</td><td style="text-align:right;">${r.totalCost.toFixed(2)}</td><td style="text-align:right;">${r.totalSales.toFixed(2)}</td><td style="text-align:right;">${r.profit.toFixed(2)}</td><td>${r.cashier}</td><td>${r.date}</td></tr>`).join('');
        tableHTML = `
            <thead><tr><th>S/N</th><th>Item</th><th>Bef</th><th>Sold</th><th>Rem</th><th>Cost</th><th>Price</th><th>Tot Cost</th><th>Tot Sales</th><th>Profit</th><th>Cashier</th><th>Date</th></tr></thead>
            <tbody>${rows}</tbody>
             <tfoot><tr><td colspan="7" style="text-align:right; font-weight:bold;">GRAND TOTALS</td><td style="text-align:right; font-weight:bold;">${detailedReportData.grandTotalCost.toFixed(2)}</td><td style="text-align:right; font-weight:bold;">${detailedReportData.grandTotalSales.toFixed(2)}</td><td style="text-align:right; font-weight:bold;">${detailedReportData.grandTotalProfit.toFixed(2)}</td><td colspan="2"></td></tr></tfoot>
        `;
    } else if (reportViewMode === 'deposits') {
        const rows = depositTransactions.map(t => `<tr><td>${new Date(t.date).toLocaleString()}</td><td>${t.customerName||'Guest'}</td><td>${t.total.toFixed(2)}</td><td>${t.amountPaid.toFixed(2)}</td><td>${(t.total - t.amountPaid).toFixed(2)}</td><td>${t.dueDate||'-'}</td></tr>`).join('');
        tableHTML = `<thead><tr><th>Date</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th>Due Date</th></tr></thead><tbody>${rows}</tbody>`;
    } else if (reportViewMode === 'items') {
        const rows = filteredInventory.map(p => `<tr><td>${p.name}</td><td>${p.category}</td><td>${p.stock}</td><td style="text-align:right;">${(p.stock*p.costPrice).toFixed(2)}</td><td style="text-align:right;">${(p.stock*p.sellingPrice).toFixed(2)}</td></tr>`).join('');
        tableHTML = `<thead><tr><th>Item</th><th>Category</th><th>Stock</th><th style="text-align:right;">Cost Value</th><th style="text-align:right;">Sales Value</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="2" style="text-align:right; font-weight:bold;">TOTAL</td><td style="font-weight:bold;">${filteredInventory.reduce((a,b)=>a+b.stock,0)}</td><td style="text-align:right; font-weight:bold;">${filteredInventory.reduce((a,b)=>a+(b.stock*b.costPrice),0).toFixed(2)}</td><td style="text-align:right; font-weight:bold;">${filteredInventory.reduce((a,b)=>a+(b.stock*b.sellingPrice),0).toFixed(2)}</td></tr></tfoot>`;
    }

    const html = `
        <html>
        <head>
            <title>${reportTitle}</title>
            <style>
                body { font-family: sans-serif; padding: 20px; color: #333; }
                h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
                h2 { margin: 5px 0 0; font-size: 18px; color: #555; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 15px; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background-color: #333; color: white; padding: 8px; text-align: left; text-transform: uppercase; }
                td { border-bottom: 1px solid #ddd; padding: 8px; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                tfoot td { border-top: 2px solid #333; background-color: #eee; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${settings.name}</h1>
                <h2>${currentBranch?.name} - ${reportTitle}</h2>
            </div>
            <div class="meta">
                <div>Date Range: ${filterStartDate || 'Start'} to ${filterEndDate || 'Today'}</div>
                <div>Generated: ${new Date().toLocaleString()}</div>
                <div>User: ${user?.name}</div>
            </div>
            <table>${tableHTML}</table>
            <script>window.print();</script>
        </body>
        </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportSalesCSV = () => {
     const headers = reportViewMode === 'transactions' 
        ? ['Transaction ID', 'Date', 'Cashier', 'Items', 'Total']
        : ['S/N', 'Item', 'Qty Before', 'Qty Sold', 'Qty Rem', 'Unit Cost', 'Unit Price', 'Total Cost', 'Total Sales', 'Profit', 'Cashier', 'Date'];
     
     const rows = reportViewMode === 'transactions'
        ? transactions.map(t => [t.id, new Date(t.date).toLocaleString(), t.cashierName, t.items.length, t.total.toFixed(2)])
        : detailedReportData.rows.map(r => [r.sn, r.itemName, r.qtyBefore, r.qtySold, r.qtyRemaining, r.unitCost, r.unitPrice, r.totalCost, r.totalSales, r.profit, r.cashier, r.date]);

     const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
     const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
     const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `report.csv`; link.click();
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

  const handleUpdateBranchSettings = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if(!currentBranch) return;
      const formData = new FormData(e.currentTarget);
      updateBranch({ ...currentBranch, name: formData.get('name') as string, address: formData.get('address') as string, phone: formData.get('phone') as string });
  };

  const handleAddCategory = (e: React.FormEvent) => { e.preventDefault(); if(newCategoryName.trim()) { addCategory(newCategoryName.trim()); setNewCategoryName(''); } };
  const handleUpdateProfile = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); if (!user) return; const formData = new FormData(e.currentTarget); updateUser({ ...user, name: formData.get('name') as string, username: formData.get('username') as string }); setIsEditingProfile(false); };
  
  // Return Handlers
  const handleSearchForReturn = () => {
      const found = transactions.find(t => t.id === returnInvoiceId);
      if (found) { setReturnTransaction(found); setItemsToReturn([]); setReturnCondition('Good'); } else { alert('Invoice not found'); }
  };
  const toggleItemReturn = (itemId: string, maxQty: number) => {
      const exists = itemsToReturn.find(i => i.itemId === itemId);
      if (exists) { setItemsToReturn(prev => prev.filter(i => i.itemId !== itemId)); } 
      else { setItemsToReturn(prev => [...prev, { itemId, qty: 1 }]); }
  };
  const handleProcessReturn = () => {
      if (!returnTransaction) return;
      processRefund(returnTransaction.id, itemsToReturn.map(i => ({ itemId: i.itemId, quantity: i.qty })), returnReason, returnCondition);
      setReturnTransaction(null); setItemsToReturn([]); setReturnReason(''); setReturnInvoiceId('');
  };

  return (
    <div className="min-h-screen flex bg-gray-900 font-sans text-gray-100">
      {/* Sidebar - Same as before */}
      <div className={`bg-gray-800 text-white flex flex-col fixed h-full z-20 transition-all duration-300 border-r border-gray-700 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          {!isSidebarCollapsed && <h1 className="text-xl font-bold flex items-center gap-2 truncate text-white"><Icons.POS className="text-blue-500" /> AlkanchiPay</h1>}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-gray-400 hover:text-white"> {isSidebarCollapsed ? <Icons.ChevronRight size={20} /> : <Icons.ChevronLeft size={20} />} </button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {[{ id: 'dashboard', icon: Icons.Dashboard, label: 'Dashboard' }, { id: 'inventory', icon: Icons.Inventory, label: 'Inventory' }, { id: 'reports', icon: Icons.Reports, label: 'Reports' }, { id: 'returns', icon: Icons.RotateCcw, label: 'Returns' }, { id: 'debts', icon: Icons.Wallet, label: 'Debt & Deposits' }, { id: 'expenses', icon: Icons.Expenses, label: 'Expenses' }, { id: 'settings', icon: Icons.Settings, label: 'Branch Settings' }, { id: 'profile', icon: Icons.User, label: 'My Profile' }].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition ${activeTab === item.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'} ${isSidebarCollapsed ? 'justify-center' : ''}`}> <item.icon size={20} />{!isSidebarCollapsed && <span className="font-medium">{item.label}</span>} </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700"><button onClick={logout} className="flex items-center gap-2 text-gray-400 hover:text-white transition w-full px-2 py-2 rounded hover:bg-gray-700"><Icons.Logout size={18} />{!isSidebarCollapsed && "Sign Out"}</button></div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 overflow-auto transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="bg-gray-800 shadow-sm p-6 flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 border-b border-gray-700">
          <div><h2 className="text-2xl font-extrabold text-white capitalize">{activeTab}</h2><p className="text-sm text-gray-400 font-medium">{currentBranch?.name}</p></div>
          <HeaderTools />
        </header>

        <main className="p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-blue-600"><p className="text-sm font-bold text-gray-400 mb-1">Total Revenue</p><h3 className="text-2xl font-extrabold text-white">{settings.currency}{totalRevenue.toLocaleString()}</h3></div>
                <div className="bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-green-600"><p className="text-sm font-bold text-gray-400 mb-1">Inventory Cost</p><h3 className="text-2xl font-extrabold text-white">{settings.currency}{branchInventoryCost.toLocaleString()}</h3></div>
                <div className="bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-purple-600"><p className="text-sm font-bold text-gray-400 mb-1">Inventory Value</p><h3 className="text-2xl font-extrabold text-white">{settings.currency}{branchInventorySales.toLocaleString()}</h3></div>
                <div className="bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-orange-500"><p className="text-sm font-bold text-gray-400 mb-1">Total Orders</p><h3 className="text-2xl font-extrabold text-white">{totalOrders}</h3></div>
              </div>
              <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
                  <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2"><Icons.History className="text-blue-400"/> Recent Sales Feed</h3>
                  <div className="space-y-3">
                      {recentSales.map(t => (
                          <div key={t.id} className="flex justify-between items-center p-3 hover:bg-gray-700/50 rounded border border-gray-600 transition bg-gray-900/50">
                              <div className="flex items-center gap-3"><div className="bg-green-900/50 p-2 rounded-full text-green-400"><Icons.Receipt size={16}/></div><div><p className="font-bold text-sm text-white">{t.id.slice(0,8)}</p><p className="text-xs text-gray-400 font-bold">{new Date(t.date).toLocaleTimeString()} - {t.cashierName}</p></div></div>
                              <div className="text-right"><p className="font-bold text-white">{settings.currency}{t.total.toFixed(2)}</p><span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-700 px-2 py-0.5 rounded">{t.paymentMethod}</span></div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
          )}

          {activeTab === 'expenses' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
                      <h3 className="font-bold text-lg text-white mb-4">Expense History & Approvals</h3>
                      <table className="w-full text-left text-sm">
                          <thead className="bg-gray-900 text-white font-bold border-b border-gray-700"><tr><th className="p-3">Date</th><th className="p-3">Category</th><th className="p-3">Reason</th><th className="p-3">Amount</th><th className="p-3">User</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr></thead>
                          <tbody className="divide-y divide-gray-700">{branchExpenses.map(exp => (
                                  <tr key={exp.id} className="hover:bg-gray-700/50">
                                      <td className="p-3 text-gray-400 font-medium">{new Date(exp.date).toLocaleDateString()}</td>
                                      <td className="p-3 text-gray-300 font-bold">{exp.categoryName || '-'}</td>
                                      <td className="p-3 text-white font-bold">{exp.description}</td>
                                      <td className="p-3 font-bold text-white">{settings.currency}{exp.amount.toFixed(2)}</td>
                                      <td className="p-3 text-gray-300">{exp.requestedByName}</td>
                                      <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${exp.status === 'APPROVED' ? 'bg-green-900/50 text-green-400' : exp.status === 'REJECTED' ? 'bg-red-900/50 text-red-400' : 'bg-orange-900/50 text-orange-400'}`}>{exp.status}</span></td><td className="p-3 text-right">{exp.status === 'PENDING' && (<div className="flex justify-end gap-2"><button onClick={() => handleReviewExpense(exp, ExpenseStatus.APPROVED)} className="text-green-500 hover:text-green-400" title="Approve"><Icons.CheckSquare size={18}/></button><button onClick={() => handleReviewExpense(exp, ExpenseStatus.REJECTED)} className="text-red-500 hover:text-red-400" title="Reject"><Icons.XSquare size={18}/></button></div>)}</td>
                                  </tr>
                              ))}</tbody>
                      </table>
                  </div>
                  <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6 h-fit">
                      <h3 className="font-bold text-lg text-white mb-4">Record Store Expense</h3>
                      <form onSubmit={handleCreateExpense} className="space-y-4">
                          <div>
                              <label className="block text-sm font-bold text-gray-400 mb-1">Amount</label>
                              <input type="number" required className="w-full p-2 border border-gray-600 bg-gray-900 text-white rounded focus:ring-2 focus:ring-blue-500" value={newExpenseAmount} onChange={e => setNewExpenseAmount(e.target.value)} />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-400 mb-1">Category</label>
                              <select className="w-full p-2 border border-gray-600 bg-gray-900 text-white rounded" value={newExpenseCategory} onChange={e => setNewExpenseCategory(e.target.value)} required>
                                  <option value="">Select Category</option>
                                  {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-400 mb-1">Reason</label>
                              <textarea required className="w-full p-2 border border-gray-600 bg-gray-900 text-white rounded focus:ring-2 focus:ring-blue-500" rows={3} value={newExpenseReason} onChange={e => setNewExpenseReason(e.target.value)}></textarea>
                          </div>
                          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">Submit Approved Expense</button>
                      </form>
                  </div>
              </div>
          )}

          {/* ... Rest of tabs (reports, inventory, returns, debts, settings, profile) remain unchanged ... */}
          {/* I will omit them for brevity but they are implicitly part of the full file restoration if I were replacing the whole file. 
             Since I am doing partial updates where possible, I will assume the previous 'Admin.tsx' content for these tabs is still valid, 
             but for safety I will include the full render logic below to ensure nothing is lost. */}
          
          {activeTab === 'reports' && (
              <div className="space-y-6">
                  <div className="flex flex-col xl:flex-row gap-4 justify-between items-center bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-700">
                      <div className="flex gap-2 overflow-x-auto">
                        <button onClick={() => setReportViewMode('transactions')} className={`px-4 py-2 rounded border font-bold text-sm whitespace-nowrap ${reportViewMode === 'transactions' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'}`}>Sales</button>
                        <button onClick={() => setReportViewMode('detailed')} className={`px-4 py-2 rounded border font-bold text-sm whitespace-nowrap ${reportViewMode === 'detailed' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'}`}>Detailed Items</button>
                        <button onClick={() => setReportViewMode('deposits')} className={`px-4 py-2 rounded border font-bold text-sm whitespace-nowrap ${reportViewMode === 'deposits' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'}`}>Deposits/Debts</button>
                        <button onClick={() => setReportViewMode('items')} className={`px-4 py-2 rounded border font-bold text-sm whitespace-nowrap ${reportViewMode === 'items' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'}`}>Remaining Items</button>
                      </div>
                      <div className="flex gap-2 items-center"><input type="date" value={filterStartDate} onChange={e=>setFilterStartDate(e.target.value)} className="bg-gray-700 border border-gray-600 p-2 rounded text-sm text-white"/> - <input type="date" value={filterEndDate} onChange={e=>setFilterEndDate(e.target.value)} className="bg-gray-700 border border-gray-600 p-2 rounded text-sm text-white"/><select value={filterCashier} onChange={e=>setFilterCashier(e.target.value)} className="bg-gray-700 border border-gray-600 p-2 rounded text-sm text-white"><option value="">All Cashiers</option>{users.filter(u => u.storeId === user.storeId).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                      <div className="flex gap-2">
                          <button onClick={handlePrintReport} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-bold text-sm flex gap-2"><Icons.Printer size={16}/> Print</button>
                          <button onClick={handleExportSalesCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold text-sm flex gap-2"><Icons.Download size={16}/> CSV</button>
                          <button onClick={handleDownloadReportPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold text-sm flex gap-2"><Icons.FileText size={16}/> PDF</button>
                      </div>
                  </div>
                  <div className="bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-700 overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                          <thead className="bg-gray-900 text-white font-bold uppercase text-xs">
                              {reportViewMode === 'transactions' && <tr><th className="p-3 border-r border-gray-700">ID</th><th className="p-3 border-r border-gray-700">Date</th><th className="p-3 border-r border-gray-700">Cashier</th><th className="p-3 border-r border-gray-700">Items</th><th className="p-3 border-r border-gray-700">Method</th><th className="p-3 text-right border-r border-gray-700">Total</th><th className="p-3 text-center">Receipt</th></tr>}
                              {reportViewMode === 'detailed' && <tr><th className="p-3 border-r border-gray-700">S/N</th><th className="p-3 border-r border-gray-700">Item Name</th><th className="p-3 text-center border-r border-gray-700">Before</th><th className="p-3 text-center border-r border-gray-700">Sold</th><th className="p-3 text-center border-r border-gray-700">Rem</th><th className="p-3 text-right border-r border-gray-700">Unit Cost</th><th className="p-3 text-right border-r border-gray-700">Unit Price</th><th className="p-3 text-right border-r border-gray-700">Total Cost</th><th className="p-3 text-right border-r border-gray-700">Total Sales</th><th className="p-3 text-right border-r border-gray-700">Profit</th><th className="p-3 border-r border-gray-700">Cashier</th><th className="p-3">Date</th></tr>}
                              {reportViewMode === 'deposits' && <tr><th className="p-3 border-r border-gray-700">Date</th><th className="p-3 border-r border-gray-700">Customer</th><th className="p-3 border-r border-gray-700">Total</th><th className="p-3 border-r border-gray-700">Paid</th><th className="p-3 border-r border-gray-700">Balance</th><th className="p-3">Due Date</th></tr>}
                              {reportViewMode === 'items' && <tr><th className="p-3 border-r border-gray-700">Item</th><th className="p-3 border-r border-gray-700">Category</th><th className="p-3 text-center border-r border-gray-700">Stock</th><th className="p-3 text-right border-r border-gray-700">Cost Value</th><th className="p-3 text-right">Sales Value</th></tr>}
                          </thead>
                          <tbody className="divide-y divide-gray-700 text-gray-200">
                              {reportViewMode === 'transactions' && filteredReportTransactions.map((t, idx) => (<tr key={t.id} className={idx % 2 === 0 ? "bg-gray-800" : "bg-gray-700/30 hover:bg-gray-700/50"}><td className="p-3 font-mono text-xs font-bold border-r border-gray-700 text-gray-400">{t.id.substring(0,8)}</td><td className="p-3 border-r border-gray-700">{new Date(t.date).toLocaleString()}</td><td className="p-3 border-r border-gray-700">{t.cashierName}</td><td className="p-3 border-r border-gray-700">{t.items.length}</td><td className="p-3 border-r border-gray-700"><span className="bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded text-xs font-bold">{t.paymentMethod}</span></td><td className="p-3 text-right font-bold text-white border-r border-gray-700">{settings.currency}{t.total.toFixed(2)}</td><td className="p-3 text-center"><button onClick={() => handlePrintReceipt(t)} className="text-gray-400 hover:text-white"><Icons.Printer size={16}/></button></td></tr>))}
                              {reportViewMode === 'detailed' && detailedReportData.rows.map((r, idx) => (<tr key={r.sn} className={idx % 2 === 0 ? "bg-gray-800" : "bg-gray-700/30 hover:bg-gray-700/50"}><td className="p-3 text-gray-400 border-r border-gray-700">{r.sn}</td><td className="p-3 font-bold text-white border-r border-gray-700">{r.itemName}</td><td className="p-3 text-center text-gray-400 font-medium border-r border-gray-700">{r.qtyBefore}</td><td className="p-3 text-center font-bold text-blue-400 border-r border-gray-700">{r.qtySold}</td><td className="p-3 text-center text-gray-400 font-medium border-r border-gray-700">{r.qtyRemaining}</td><td className="p-3 text-right text-gray-400 border-r border-gray-700">{settings.currency}{r.unitCost.toFixed(2)}</td><td className="p-3 text-right text-gray-400 border-r border-gray-700">{settings.currency}{r.unitPrice.toFixed(2)}</td><td className="p-3 text-right font-medium text-gray-300 border-r border-gray-700">{settings.currency}{r.totalCost.toFixed(2)}</td><td className="p-3 text-right font-bold text-white border-r border-gray-700">{settings.currency}{r.totalSales.toFixed(2)}</td><td className="p-3 text-right font-bold text-green-400 border-r border-gray-700">{settings.currency}{r.profit.toFixed(2)}</td><td className="p-3 text-xs border-r border-gray-700 text-gray-400">{r.cashier}</td><td className="p-3 text-xs text-gray-400">{r.date}</td></tr>))}
                              {reportViewMode === 'deposits' && depositTransactions.map((t, idx) => (<tr key={t.id} className={idx % 2 === 0 ? "bg-gray-800" : "bg-gray-700/30 hover:bg-gray-700/50"}><td className="p-3 border-r border-gray-700">{new Date(t.date).toLocaleString()}</td><td className="p-3 font-bold border-r border-gray-700 text-white">{t.customerName||'Guest'}</td><td className="p-3 border-r border-gray-700">{t.total.toFixed(2)}</td><td className="p-3 border-r border-gray-700 text-green-400 font-bold">{t.amountPaid.toFixed(2)}</td><td className="p-3 border-r border-gray-700 text-red-400 font-bold">{(t.total - t.amountPaid).toFixed(2)}</td><td className="p-3 text-gray-300">{t.dueDate||'-'}</td></tr>))}
                              {reportViewMode === 'items' && filteredInventory.map((p, idx) => (<tr key={p.id} className={idx % 2 === 0 ? "bg-gray-800" : "bg-gray-700/30 hover:bg-gray-700/50"}><td className="p-3 font-bold border-r border-gray-700 text-white">{p.name}</td><td className="p-3 border-r border-gray-700 text-gray-300">{p.category}</td><td className="p-3 text-center border-r border-gray-700 text-gray-300">{p.stock}</td><td className="p-3 text-right border-r border-gray-700">{settings.currency}{(p.stock*p.costPrice).toFixed(2)}</td><td className="p-3 text-right text-green-400">{settings.currency}{(p.stock*p.sellingPrice).toFixed(2)}</td></tr>))}
                          </tbody>
                          <tfoot className="bg-gray-700 font-extrabold text-white border-t-2 border-gray-500">
                              {reportViewMode === 'transactions' && <tr><td colSpan={5} className="p-4 text-right uppercase">Total Revenue:</td><td className="p-4 text-right">{settings.currency}{filteredReportTransactions.reduce((a,b)=>a+b.total,0).toLocaleString()}</td><td></td></tr>}
                              {reportViewMode === 'detailed' && <tr><td colSpan={7} className="p-4 text-right uppercase">Grand Totals:</td><td className="p-4 text-right">{settings.currency}{detailedReportData.grandTotalCost.toLocaleString()}</td><td className="p-4 text-right">{settings.currency}{detailedReportData.grandTotalSales.toLocaleString()}</td><td className="p-4 text-right text-green-400">{settings.currency}{detailedReportData.grandTotalProfit.toLocaleString()}</td><td colSpan={2}></td></tr>}
                              {reportViewMode === 'items' && <tr><td colSpan={2} className="p-4 text-right uppercase">TOTALS</td><td className="p-4 text-center">{filteredInventory.reduce((a,b)=>a+b.stock,0)}</td><td className="p-4 text-right">{settings.currency}{filteredInventory.reduce((a,b)=>a+(b.stock*b.costPrice),0).toFixed(2)}</td><td className="p-4 text-right">{settings.currency}{filteredInventory.reduce((a,b)=>a+(b.stock*b.sellingPrice),0).toFixed(2)}</td></tr>}
                          </tfoot>
                      </table>
                  </div>
              </div>
          )}
          
          {activeTab === 'inventory' && (
              <div className="flex gap-6 h-full">
                  <div className={`${showCategorySidebar ? 'w-64' : 'w-0 hidden'} bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-4 transition-all duration-300`}>
                      <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-white">Categories</h3><button onClick={()=>setShowCategorySidebar(false)} className="text-gray-400 hover:text-white"><Icons.Close size={16}/></button></div>
                      <div className="space-y-2 mb-4 max-h-[60vh] overflow-y-auto">{categories.map(c => (<div key={c.id} className="flex justify-between items-center bg-gray-700 p-2 rounded text-sm text-gray-200 font-medium"><span>{c.name}</span><button onClick={()=>deleteCategory(c.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={14}/></button></div>))}</div>
                      <form onSubmit={handleAddCategory} className="flex gap-2"><input className="w-full bg-gray-900 border border-gray-600 rounded text-sm p-2 outline-none focus:border-blue-500 text-white" placeholder="New Category" value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)} /><button className="bg-green-600 text-white p-2 rounded hover:bg-green-500"><Icons.Plus size={16}/></button></form>
                  </div>
                  <div className="flex-1 bg-gray-800 rounded-xl shadow-sm border border-gray-700 flex flex-col overflow-hidden">
                       <div className="p-4 border-b border-gray-700 flex gap-4 items-center">
                           {!showCategorySidebar && <button onClick={()=>setShowCategorySidebar(true)} className="bg-gray-700 p-2 rounded text-white"><Icons.Menu size={20}/></button>}
                           <div className="relative flex-1">
                               <Icons.Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                               <input type="text" placeholder="Search Inventory..." className="w-full pl-10 pr-4 py-2 border border-gray-600 bg-gray-900 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} />
                           </div>
                           <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700"><Icons.Add size={18} /> Add Product</button>
                       </div>
                       <div className="flex-1 overflow-auto">
                           <table className="w-full text-left text-sm">
                               <thead className="bg-gray-900 text-white text-xs uppercase font-bold sticky top-0 z-10"><tr><th className="p-4">Product</th><th className="p-4">SKU</th><th className="p-4 text-right">Cost</th><th className="p-4 text-right">Price</th><th className="p-4 text-center">Stock</th><th className="p-4 text-right">Actions</th></tr></thead>
                               <tbody className="divide-y divide-gray-700 text-gray-200">{filteredInventory.map(p => (<tr key={p.id} className="hover:bg-gray-700/50"><td className="p-4 font-bold text-white">{p.name}</td><td className="p-4 text-gray-400 font-mono text-xs">{p.sku}</td><td className="p-4 text-right">{settings.currency}{p.costPrice.toFixed(2)}</td><td className="p-4 text-right text-green-400 font-bold">{settings.currency}{p.sellingPrice.toFixed(2)}</td><td className="p-4 text-center"><span className={`px-2 py-0.5 rounded text-xs font-bold ${p.stock < p.minStockAlert ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>{p.stock}</span></td><td className="p-4 text-right flex justify-end gap-3"><button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="text-blue-400 hover:text-blue-300 font-medium">Edit</button><button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-300"><Icons.Delete size={18} /></button></td></tr>))}</tbody>
                           </table>
                       </div>
                  </div>
              </div>
          )}

          {activeTab === 'returns' && (
              <div className="bg-gray-800 p-6 rounded-xl shadow-sm h-full flex flex-col border border-gray-700">
                  <div className="flex gap-4 mb-6">
                      <input type="text" placeholder="Enter Invoice ID to Search..." className="flex-1 border border-gray-600 bg-gray-900 text-white p-2 rounded text-lg placeholder-gray-500" value={returnInvoiceId} onChange={e => setReturnInvoiceId(e.target.value)} />
                      <button onClick={handleSearchForReturn} className="bg-blue-600 text-white px-6 rounded font-bold hover:bg-blue-700">Search Invoice</button>
                  </div>
                  {returnTransaction && (
                      <div className="flex-1 flex flex-col">
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
                                  <select 
                                      className="w-full border border-gray-600 bg-gray-900 text-white p-2 rounded"
                                      value={returnCondition}
                                      onChange={e => setReturnCondition(e.target.value)}
                                  >
                                      <option value="Good">Good (Restock)</option>
                                      <option value="Resellable">Resellable (Restock)</option>
                                      <option value="Damaged">Damaged (Do Not Restock)</option>
                                      <option value="Defective">Defective (Do Not Restock)</option>
                                      <option value="Expired">Expired (Do Not Restock)</option>
                                  </select>
                                  <p className="text-xs text-gray-500 mt-1">
                                      {['Good', 'Resellable'].includes(returnCondition) 
                                          ? "Items will be added back to inventory." 
                                          : "Items will NOT be added back to inventory."}
                                  </p>
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-400 mb-1">Reason for Return</label>
                                  <input 
                                      type="text" 
                                      placeholder="Reason..." 
                                      className="w-full border border-gray-600 bg-gray-900 text-white p-2 rounded" 
                                      value={returnReason} 
                                      onChange={e => setReturnReason(e.target.value)}
                                  />
                              </div>
                          </div>
                          <button onClick={handleProcessReturn} disabled={itemsToReturn.length === 0} className="bg-red-600 text-white py-3 rounded font-bold w-full hover:bg-red-700 disabled:bg-gray-600 disabled:text-gray-400">Process Return & Update Inventory</button>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'debts' && (
              <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
                  <div className="p-6 border-b border-gray-700"><h3 className="font-bold text-lg text-white">Debt & Partial Payment Tracker</h3></div>
                  <table className="w-full text-left text-sm">
                      <thead className="bg-gray-900 text-white font-bold border-b border-gray-700"><tr><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Total Bill</th><th className="p-3">Paid So Far</th><th className="p-3">Remaining</th><th className="p-3">Due Date</th><th className="p-3">Status</th></tr></thead>
                      <tbody className="divide-y divide-gray-700">{debtTransactions.map(t => (
                          <tr key={t.id} className="hover:bg-gray-700/50"><td className="p-3 text-gray-400 font-medium">{new Date(t.date).toLocaleDateString()}</td><td className="p-3 font-bold text-white">{t.customerName || 'Guest'}</td><td className="p-3 font-bold text-white">{settings.currency}{t.total.toFixed(2)}</td><td className="p-3 text-green-400 font-bold">{settings.currency}{t.amountPaid.toFixed(2)}</td><td className="p-3 text-red-400 font-bold">{settings.currency}{(t.total - t.amountPaid).toFixed(2)}</td><td className="p-3 text-gray-300 font-medium">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}</td><td className="p-3"><span className="bg-orange-900/50 text-orange-400 px-2 py-1 rounded text-xs font-bold">Unpaid</span></td></tr>
                      ))}</tbody>
                  </table>
              </div>
          )}

          {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-8">
                  <h2 className="text-xl font-bold text-white mb-6">Branch Settings</h2>
                  <form onSubmit={handleUpdateBranchSettings} className="space-y-6">
                      <div className="group relative"><label className="block text-sm font-bold text-gray-400 mb-1">Branch Name</label><input name="name" defaultValue={currentBranch?.name} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded focus:ring-2 focus:ring-blue-500" required /></div>
                      <div className="group relative"><label className="block text-sm font-bold text-gray-400 mb-1">Branch Address</label><input name="address" defaultValue={currentBranch?.address} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded focus:ring-2 focus:ring-blue-500" required /></div>
                      <div className="group relative"><label className="block text-sm font-bold text-gray-400 mb-1">Phone Number</label><input name="phone" defaultValue={currentBranch?.phone} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded focus:ring-2 focus:ring-blue-500" /></div>
                      <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">Save Changes</button>
                  </form>
              </div>
          )}

          {activeTab === 'profile' && (
              <div className="max-w-xl mx-auto bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-8">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-700">
                      <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-gray-400"><Icons.User size={40}/></div>
                      <div><h2 className="text-2xl font-bold text-white">{user?.name}</h2><p className="text-gray-400 capitalize">{user?.role} - {currentBranch?.name}</p></div>
                      <button onClick={()=>setIsEditingProfile(!isEditingProfile)} className="ml-auto text-blue-400 font-bold text-sm hover:underline">{isEditingProfile ? 'Cancel' : 'Edit Profile'}</button>
                  </div>
                  {isEditingProfile ? (<form onSubmit={handleUpdateProfile} className="space-y-4"><div><label className="block text-sm font-bold text-gray-400 mb-1">Name</label><input name="name" defaultValue={user?.name} className="w-full p-2 bg-gray-900 border border-gray-600 text-white rounded" required /></div><div><label className="block text-sm font-bold text-gray-400 mb-1">Username</label><input name="username" defaultValue={user?.username} className="w-full p-2 bg-gray-900 border border-gray-600 text-white rounded" required /></div><button className="w-full bg-blue-600 text-white font-bold py-2 rounded">Save</button></form>) : (<div className="space-y-4"><div className="flex justify-between p-3 bg-gray-900 rounded border border-gray-700"><span className="text-gray-400 font-medium">Username</span><span className="font-bold text-white">{user?.username}</span></div><div className="flex justify-between p-3 bg-gray-900 rounded border border-gray-700"><span className="text-gray-400 font-medium">Status</span><span className="font-bold text-green-500">Active</span></div></div>)}
              </div>
          )}
        </main>
      </div>

      {isProductModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-8 rounded-xl w-[500px] shadow-2xl border border-gray-700">
                  <h2 className="text-xl font-bold text-white mb-4">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                  <form onSubmit={handleSaveProduct} className="grid grid-cols-2 gap-4">
                      <input name="name" defaultValue={editingProduct?.name} placeholder="Product Name" className="col-span-2 w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                      <input name="sku" defaultValue={editingProduct?.sku} placeholder="SKU" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                      <select name="category" defaultValue={editingProduct?.category || 'General'} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded"><option value="General">General</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                      <input type="number" name="costPrice" defaultValue={editingProduct?.costPrice} placeholder="Cost Price" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required step="0.01" />
                      <input type="number" name="sellingPrice" defaultValue={editingProduct?.sellingPrice} placeholder="Selling Price" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required step="0.01" />
                      <input type="number" name="stock" defaultValue={editingProduct?.stock} placeholder="Initial Stock" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                      <input type="number" name="minStockAlert" defaultValue={editingProduct?.minStockAlert || 5} placeholder="Low Stock Alert" className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" required />
                      <div className="col-span-2 flex gap-2 mt-4"><button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-2 bg-gray-700 rounded text-gray-300 hover:bg-gray-600">Cancel</button><button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-500">Save</button></div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
