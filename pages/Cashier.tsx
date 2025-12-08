
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, CartItem, PaymentMethod, TransactionStatus, Transaction, RefundItem, PaymentPart, Expense, ExpenseStatus } from '../types';
import { Icons } from '../components/ui/Icons';
import { nanoid } from 'nanoid';
import { HeaderTools } from '../components/ui/HeaderTools';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Cashier = () => {
  const { products, user, addTransaction, updateTransaction, transactions, settings, logout, processRefund, branches, categories, addNotification, expenses, addExpense, expenseCategories } = useStore();
  const [activeTab, setActiveTab] = useState<'pos' | 'dashboard' | 'history' | 'debts' | 'inventory' | 'endofday' | 'returns' | 'profile' | 'expenses'>('pos');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  
  // Checkout State
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [singlePaymentMethod, setSinglePaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [amountTendered, setAmountTendered] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [splitPayments, setSplitPayments] = useState<PaymentPart[]>([{ method: PaymentMethod.CASH, amount: 0 }]);
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);

  // Discount State
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('FIXED');
  const [discountInput, setDiscountInput] = useState('');

  // Return State
  const [returnInvoiceId, setReturnInvoiceId] = useState('');
  const [returnTransaction, setReturnTransaction] = useState<Transaction | null>(null);
  const [itemsToReturn, setItemsToReturn] = useState<{itemId: string, qty: number}[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnCondition, setReturnCondition] = useState('Good');

  // Debt State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedDebtTx, setSelectedDebtTx] = useState<Transaction | null>(null);

  // Derived Data
  const currentBranch = branches.find(b => b.id === user?.storeId);
  const availableProducts = products.filter(p => p.storeId === user?.storeId);
  const productCategories = ['All', ...categories.map(c => c.name)];
  const myTransactions = transactions.filter(t => t.cashierId === user?.id && t.status !== TransactionStatus.HELD);
  const heldTransactions = transactions.filter(t => t.storeId === user?.storeId && t.status === TransactionStatus.HELD);
  const myExpenses = expenses.filter(e => e.requestedBy === user?.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const debtTransactions = transactions.filter(t => t.storeId === user?.storeId && (t.status === TransactionStatus.PARTIAL || (t.paymentMethod === PaymentMethod.CREDIT && t.amountPaid < t.total)));
  
  const filteredProducts = availableProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Real-time Stock Alerts
  useEffect(() => {
    if (user?.storeId) {
      const lowStock = availableProducts.filter(p => p.stock <= p.minStockAlert && p.stock > 0);
      const outOfStock = availableProducts.filter(p => p.stock === 0);

      if (lowStock.length > 0) {
        addNotification(`${lowStock.length} items are running low on stock!`, 'warning');
      }
      if (outOfStock.length > 0) {
        addNotification(`${outOfStock.length} items are out of stock!`, 'error');
      }
    }
  }, [products, user?.storeId, addNotification]); // Monitor product changes

  // End of Day Metrics
  const today = new Date().toLocaleDateString();
  const todaysTxs = myTransactions.filter(t => new Date(t.date).toLocaleDateString() === today);
  const totalSales = todaysTxs.reduce((a,b) => a + b.total, 0);
  
  // Payment Breakdown
  const paymentBreakdown = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.POS]: 0,
      [PaymentMethod.TRANSFER]: 0,
      [PaymentMethod.WALLET]: 0,
      [PaymentMethod.CREDIT]: 0,
      [PaymentMethod.DEPOSIT]: 0,
  };

  todaysTxs.forEach(t => {
      if (t.paymentMethod === PaymentMethod.SPLIT) {
          t.payments.forEach(p => {
              if (paymentBreakdown[p.method] !== undefined) paymentBreakdown[p.method] += p.amount;
          });
      } else {
          if (paymentBreakdown[t.paymentMethod] !== undefined) {
             paymentBreakdown[t.paymentMethod] += (t.paymentMethod === PaymentMethod.CREDIT ? 0 : t.amountPaid);
          }
      }
  });

  const cashInHand = paymentBreakdown[PaymentMethod.CASH];

  // --- Handlers ---

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) { return prev.map(item => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item); }
      return [...prev, { ...product, quantity: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));
  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        const product = products.find(p => p.id === id);
        if (product && newQty > product.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(i => i.quantity > 0));
  };
  
  // Calculations
  const cartTotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  const discountVal = parseFloat(discountInput) || 0;
  const calculatedDiscount = discountType === 'PERCENTAGE' ? (cartTotal * discountVal) / 100 : discountVal;
  const finalTotal = Math.max(0, cartTotal - calculatedDiscount);

  const handleHoldInvoice = () => {
      const t: Transaction = { id: nanoid(), date: new Date().toISOString(), cashierId: user?.id || 'u', cashierName: user?.name || 'U', storeId: user?.storeId, items: [...cart], subtotal: cartTotal, discount: 0, total: cartTotal, amountPaid: 0, paymentMethod: PaymentMethod.CASH, payments: [], status: TransactionStatus.HELD, customerName: customerName || 'Held Invoice' };
      addTransaction(t); setCart([]); setCustomerName('');
  };
  const handleRecallInvoice = (t: Transaction) => {
      setCart(t.items);
      setCustomerName(t.customerName || '');
      setIsRecallModalOpen(false);
  };
  
  const handleCheckout = () => { 
      if (cart.length === 0) return; 
      setIsCheckingOut(true); 
      setAmountTendered(''); 
      setDiscountInput('');
      setDiscountType('FIXED');
      // We set split payments to calculate from the base total initially; will adjust in UI
      setSplitPayments([{ method: PaymentMethod.CASH, amount: cartTotal }]); 
      setIsSplitPayment(false); 
  };
  
  const finalizeTransaction = () => {
    let finalPayments: PaymentPart[] = [], realAmountPaid = 0;
    if (isSplitPayment) {
        finalPayments = splitPayments.filter(p => p.amount > 0);
        realAmountPaid = finalPayments.reduce((sum, p) => p.method === PaymentMethod.CREDIT ? sum : sum + (parseFloat(p.amount as any)||0), 0);
    } else {
        const paid = parseFloat(amountTendered) || 0;
        realAmountPaid = singlePaymentMethod === PaymentMethod.CREDIT ? 0 : paid;
        finalPayments = [{ method: singlePaymentMethod, amount: paid }];
    }
    const status = realAmountPaid < finalTotal - 0.01 ? TransactionStatus.PARTIAL : TransactionStatus.COMPLETED;
    const tx: Transaction = {
        id: nanoid(), date: new Date().toISOString(), cashierId: user?.id || 'u', cashierName: user?.name || 'U', storeId: user?.storeId,
        items: [...cart], subtotal: cartTotal, discount: calculatedDiscount, total: finalTotal, amountPaid: realAmountPaid, paymentMethod: isSplitPayment ? PaymentMethod.SPLIT : singlePaymentMethod,
        payments: finalPayments, status, customerName, dueDate: status === TransactionStatus.PARTIAL ? dueDate : undefined
    };
    addTransaction(tx); 
    setCompletedTransaction(tx); 
    setCart([]); 
    setIsCheckingOut(false);
    setShowSuccessModal(true);
  };

  const handleNewSale = () => {
      setShowSuccessModal(false);
      setCompletedTransaction(null);
      setCart([]);
  };

  const handleClearCart = () => {
    if (cart.length > 0 && window.confirm('Are you sure you want to clear the cart? This action cannot be undone.')) {
      setCart([]);
    }
  };

  const handleAddDebtPayment = () => {
      if(!selectedDebtTx) return;
      const amount = parseFloat(paymentAmount);
      if(isNaN(amount) || amount <= 0) return;
      
      const newPaid = selectedDebtTx.amountPaid + amount;
      const newStatus = newPaid >= selectedDebtTx.total - 0.01 ? TransactionStatus.COMPLETED : TransactionStatus.PARTIAL;
      
      updateTransaction({ ...selectedDebtTx, amountPaid: newPaid, status: newStatus });
      setSelectedDebtTx(null);
      setPaymentAmount('');
  };

  const getPaymentIcon = (method: PaymentMethod) => {
      switch(method) {
          case PaymentMethod.CASH: return <Icons.Banknote size={20} className="mr-2" />;
          case PaymentMethod.POS: return <Icons.CreditCard size={20} className="mr-2" />;
          case PaymentMethod.TRANSFER: return <Icons.Smartphone size={20} className="mr-2" />;
          case PaymentMethod.WALLET: return <Icons.Wallet size={20} className="mr-2" />;
          case PaymentMethod.CREDIT: return <Icons.FileText size={20} className="mr-2" />;
          case PaymentMethod.DEPOSIT: return <Icons.Deposit size={20} className="mr-2" />;
          default: return <Icons.Dollar size={20} className="mr-2" />;
      }
  };

  const handlePrintReceipt = (tx: Transaction | null) => {
      const transactionToPrint = tx || completedTransaction;
      if (!transactionToPrint) return;
      
      const paymentRows = transactionToPrint.paymentMethod === PaymentMethod.SPLIT 
        ? transactionToPrint.payments.map(p => 
            `<tr><td>${p.method}</td><td class="right">${settings.currency}${p.amount.toFixed(2)}</td></tr>`
          ).join('')
        : `<tr><td>${transactionToPrint.paymentMethod}</td><td class="right">${settings.currency}${transactionToPrint.amountPaid.toFixed(2)}</td></tr>`;

      const balance = (transactionToPrint.total - transactionToPrint.amountPaid);
      const isPaid = transactionToPrint.amountPaid >= transactionToPrint.total - 0.01;

      const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt #${transactionToPrint.id.substring(0,8)}</title>
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
          <div><strong>Date:</strong> ${new Date(transactionToPrint.date).toLocaleDateString()}</div>
          <div><strong>Time:</strong> ${new Date(transactionToPrint.date).toLocaleTimeString()}</div>
          <div><strong>Cashier:</strong> ${transactionToPrint.cashierName}</div>
          <div><strong>Receipt #:</strong> ${transactionToPrint.id.substring(0,8)}</div>
          ${transactionToPrint.customerName ? `<div><strong>Customer:</strong> ${transactionToPrint.customerName}</div>` : ''}
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
            ${transactionToPrint.items.map(item => `
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
            <span>${settings.currency}${transactionToPrint.subtotal.toFixed(2)}</span>
          </div>
          ${transactionToPrint.discount > 0 ? `
          <div class="sub-row">
            <span>Discount:</span>
            <span>-${settings.currency}${(transactionToPrint.discount || 0).toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="total-row">
            <span>TOTAL:</span>
            <span>${settings.currency}${transactionToPrint.total.toFixed(2)}</span>
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
          <span>${settings.currency}${transactionToPrint.amountPaid.toFixed(2)}</span>
        </div>
        ${!isPaid ? `
        <div class="sub-row" style="color: red;">
          <span>Balance Due:</span>
          <span>${settings.currency}${balance.toFixed(2)}</span>
        </div>
        ` : `
         <div class="sub-row">
          <span>Change:</span>
          <span>${settings.currency}${(transactionToPrint.amountPaid - transactionToPrint.total).toFixed(2)}</span>
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

  const handlePrintEndOfDay = () => {
    // End of Day logic preserved
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>End of Day Report - ${today}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1, h2, h3 { margin: 0; padding: 0; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; }
            .right { text-align: right; }
            .center { text-align: center; }
            .total { font-weight: bold; background-color: #eee; }
            .summary-box { display: flex; gap: 20px; margin-bottom: 20px; }
            .box { flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 4px; text-align: center; background: #f9f9f9; }
            .box-title { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 5px; }
            .box-value { font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${settings.name}</h1>
            <h2>${currentBranch?.name}</h2>
            <h3>End of Day Report</h3>
          </div>
          <div class="meta">
            <div><strong>Date:</strong> ${today}</div>
            <div><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
            <div><strong>Cashier:</strong> ${user?.name}</div>
          </div>
          
          <div class="summary-box">
             <div class="box"><div class="box-title">Total Revenue</div><div class="box-value">${settings.currency}${totalSales.toFixed(2)}</div></div>
             <div class="box"><div class="box-title">Transactions</div><div class="box-value">${todaysTxs.length}</div></div>
             <div class="box"><div class="box-title">Cash Collected</div><div class="box-value">${settings.currency}${cashInHand.toFixed(2)}</div></div>
          </div>

          <h3>Payment Breakdown</h3>
          <table>
             <thead><tr><th>Method</th><th class="right">Amount</th></tr></thead>
             <tbody>
                ${Object.entries(paymentBreakdown).map(([k,v]) => `<tr><td>${k}</td><td class="right">${settings.currency}${v.toFixed(2)}</td></tr>`).join('')}
             </tbody>
             <tfoot>
                <tr class="total"><td>Total</td><td class="right">${settings.currency}${totalSales.toFixed(2)}</td></tr>
             </tfoot>
          </table>

          <h3>Inventory Movement</h3>
          <table>
             <thead><tr><th>Item</th><th class="center">Opening</th><th class="center">Sold</th><th class="center">Closing</th><th class="right">Revenue</th></tr></thead>
             <tbody>
                ${Array.from(new Set(todaysTxs.flatMap(t => t.items.map(i => i.id)))).map(itemId => {
                    const itemTxs = todaysTxs.flatMap(t => t.items).filter(i => i.id === itemId);
                    const qtySold = itemTxs.reduce((a,b) => a + b.quantity, 0);
                    const rev = itemTxs.reduce((a,b) => a + (b.quantity * b.sellingPrice), 0);
                    const product = products.find(p => p.id === itemId);
                    const currentStock = product ? product.stock : 0;
                    const openingStock = currentStock + qtySold;
                    return `<tr><td>${product?.name || 'Item'}</td><td class="center">${openingStock}</td><td class="center">${qtySold}</td><td class="center">${currentStock}</td><td class="right">${settings.currency}${rev.toFixed(2)}</td></tr>`;
                }).join('')}
             </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Returns
  const handleSearchForReturn = () => {
      const found = transactions.find(t => t.id === returnInvoiceId);
      if (found) { setReturnTransaction(found); setItemsToReturn([]); setReturnCondition('Good'); } else { addNotification('Invoice not found', 'error'); }
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

  // Expenses & Reports
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseReason, setExpenseReason] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');

  const handleSubmitExpense = (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (!user) return; 
      const cat = expenseCategories.find(c => c.id === expenseCategory);
      addExpense({ 
          id: nanoid(), 
          amount: parseFloat(expenseAmount), 
          description: expenseReason, 
          categoryId: cat?.id,
          categoryName: cat?.name,
          status: ExpenseStatus.PENDING, 
          requestedBy: user.id, 
          requestedByName: user.name, 
          storeId: user.storeId, 
          date: new Date().toISOString() 
      }); 
      setExpenseAmount(''); 
      setExpenseReason(''); 
      setExpenseCategory('');
  };

  const handleDownloadDayReport = () => { 
      const headers = ['Tx ID', 'Time', 'Total', 'Payment', 'Status']; const rows = todaysTxs.map(t => [t.id, new Date(t.date).toLocaleTimeString(), t.total.toFixed(2), t.paymentMethod, t.status]); 
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n'); 
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); 
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `end_of_day_${today.replace(/\//g, '-')}.csv`; link.click(); 
  };
  const handleDownloadEndDayPDF = () => { 
      const doc = new jsPDF(); 
      doc.setFontSize(18); doc.text(settings.name, 14, 20); 
      doc.setFontSize(14); doc.text(currentBranch?.name || 'Branch', 14, 28); 
      doc.text(`End of Day Report - ${today}`, 14, 36); 
      doc.setFontSize(10); doc.text(`Cashier: ${user?.name}`, 14, 42);

      // Summary
      let y = 50;
      doc.text("Financial Summary:", 14, y); y+=6;
      doc.text(`Total Sales: ${settings.currency}${totalSales.toFixed(2)}`, 14, y); y+=6;
      doc.text(`Cash In Hand: ${settings.currency}${cashInHand.toFixed(2)}`, 14, y); y+=10;

      // Payment Breakdown
      const paymentRows = Object.entries(paymentBreakdown).map(([method, amount]) => [method, settings.currency + amount.toFixed(2)]);
      autoTable(doc, { head: [["Payment Method", "Total Collected"]], body: paymentRows, startY: y, theme: 'grid' });
      
      y = (doc as any).lastAutoTable.finalY + 10;
      doc.text("Inventory Movement:", 14, y); y+=6;
      
      const invRows = Array.from(new Set(todaysTxs.flatMap(t => t.items.map(i => i.id)))).map(itemId => {
          const itemTxs = todaysTxs.flatMap(t => t.items).filter(i => i.id === itemId);
          const qtySold = itemTxs.reduce((a,b) => a + b.quantity, 0);
          const rev = itemTxs.reduce((a,b) => a + (b.quantity * b.sellingPrice), 0);
          const product = products.find(p => p.id === itemId);
          const currentStock = product ? product.stock : 0;
          const openingStock = currentStock + qtySold;
          return [product?.name || 'Item', openingStock, qtySold, currentStock, settings.currency + rev.toFixed(2)];
      });

      autoTable(doc, { 
          head: [["Item", "Opening", "Sold", "Closing", "Revenue"]], 
          body: invRows, 
          startY: y,
          theme: 'grid',
          headStyles: { fillColor: [40, 40, 40] }
      });

      doc.save(`EOD_Report_${user?.name}_${today}.pdf`); 
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900 font-sans text-gray-100">
      <aside className={`bg-gray-800 border-r border-gray-700 flex flex-col fixed h-full z-20 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
           {!isSidebarCollapsed && <h1 className="text-xl font-bold flex items-center gap-2 text-white"><Icons.POS className="text-blue-500"/> Cashier</h1>}
           <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-gray-400 hover:text-white"> {isSidebarCollapsed ? <Icons.ChevronRight size={20}/> : <Icons.ChevronLeft size={20}/>} </button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {[{ id: 'pos', icon: Icons.Terminal, label: 'POS Terminal' }, { id: 'dashboard', icon: Icons.Dashboard, label: 'My Dashboard' }, { id: 'expenses', icon: Icons.Expenses, label: 'Expenses' }, { id: 'returns', icon: Icons.RotateCcw, label: 'Returns & Recall' }, { id: 'history', icon: Icons.History, label: 'Transaction History' }, { id: 'debts', icon: Icons.Wallet, label: 'Debts & Credits' }, { id: 'inventory', icon: Icons.Inventory, label: 'View Inventory' }, { id: 'endofday', icon: Icons.File, label: 'End of Day Report' }, { id: 'profile', icon: Icons.User, label: 'My Profile' }].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition ${activeTab === item.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'} ${isSidebarCollapsed ? 'justify-center' : ''}`}> <item.icon size={20} />{!isSidebarCollapsed && <span>{item.label}</span>} </button>
            ))}
        </nav>
        <div className="p-4 border-t border-gray-700"><button onClick={logout} className="flex items-center gap-2 text-gray-400 hover:text-white w-full px-2 py-2 rounded hover:bg-gray-700"><Icons.Logout size={20} />{!isSidebarCollapsed && "Logout"}</button></div>
      </aside>

      <main className={`flex-1 overflow-hidden flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        {activeTab !== 'pos' && (<header className="bg-gray-800 shadow-sm p-6 flex justify-between items-center z-10 border-b border-gray-700"><div><h2 className="text-2xl font-extrabold text-white capitalize">{activeTab}</h2><p className="text-sm text-gray-400 font-medium">{currentBranch?.name} | {user?.name}</p></div><HeaderTools /></header>)}
        
        <div className="flex-1 overflow-auto bg-gray-900 p-4 relative text-gray-100">
            {activeTab === 'pos' && (
                <div className="flex h-full gap-4">
                     <div className="flex-1 flex flex-col bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-700">
                         <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800"><h2 className="font-bold text-gray-200">POS Terminal</h2><HeaderTools /></div>
                         <div className="p-4 border-b border-gray-700 flex flex-col gap-3 bg-gray-800">
                            <div className="flex gap-4">
                                <div className="relative flex-1"><Icons.Search className="absolute left-3 top-3 text-gray-500" size={20} /><input type="text" placeholder="Scan SKU or Search..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={search} onChange={e => setSearch(e.target.value)} autoFocus /></div>
                                <button onClick={() => setIsRecallModalOpen(true)} className="px-4 py-2 bg-yellow-600 text-white rounded-lg flex items-center gap-2 font-medium hover:bg-yellow-700"><Icons.Play size={16} /> Recall ({heldTransactions.length})</button>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">{productCategories.map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{cat}</button>))}</div>
                         </div>
                         <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                 {filteredProducts.map(p => (
                                     <div key={p.id} onClick={() => addToCart(p)} className={`bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-700 hover:border-blue-500 cursor-pointer flex flex-col h-40 ${p.stock === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                                         <div className="flex-1 flex items-center justify-center bg-gray-700 rounded mb-2"><Icons.Inventory className="text-gray-500" size={24} /></div>
                                         <h3 className="font-bold text-gray-200 text-sm line-clamp-2">{p.name}</h3>
                                         <div className="mt-auto flex justify-between items-end"><span className="font-bold text-blue-400">{settings.currency}{p.sellingPrice}</span><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${p.stock < 5 ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>{p.stock}</span></div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     </div>
                     <div className="w-96 bg-gray-800 rounded-xl shadow-sm border border-gray-700 flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-gray-700 bg-gray-800 flex justify-between items-center"><h2 className="font-bold text-gray-200 flex items-center gap-2"><Icons.POS size={18}/> Cart</h2><button onClick={handleClearCart} className="text-xs text-red-400 font-bold hover:underline">Clear</button></div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-gray-700 border border-gray-600 p-2 rounded-lg shadow-sm">
                                    <div className="flex-1 min-w-0 mr-2"><h4 className="font-bold text-white text-sm truncate">{item.name}</h4><div className="text-xs text-gray-400 font-medium">{settings.currency}{item.sellingPrice} x {item.quantity}</div></div>
                                    <div className="flex items-center gap-2"><button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded bg-gray-600 font-bold hover:bg-gray-500 text-white">-</button><span className="font-bold text-sm text-white">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded bg-gray-600 font-bold hover:bg-gray-500 text-white">+</button></div>
                                    <button onClick={() => removeFromCart(item.id)} className="ml-2 text-red-400 hover:text-red-300"><Icons.Delete size={16}/></button>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-gray-800 border-t border-gray-700 space-y-3">
                            <div className="flex justify-between text-lg font-extrabold text-white"><span>Total</span><span>{settings.currency}{cartTotal.toFixed(2)}</span></div>
                            <div className="grid grid-cols-2 gap-2"><button onClick={handleHoldInvoice} disabled={cart.length === 0} className="bg-gray-700 text-white font-bold py-3 rounded-lg flex justify-center gap-2 hover:bg-gray-600 transition disabled:opacity-50"><Icons.Pause size={18} /> Hold</button><button onClick={handleCheckout} disabled={cart.length === 0} className="bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">PAY</button></div>
                        </div>
                     </div>
                </div>
            )}
            
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-blue-600"><p className="text-gray-400 font-bold text-sm uppercase">Today's Sales</p><h3 className="text-3xl font-extrabold text-white">{settings.currency}{totalSales.toFixed(2)}</h3></div>
                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-green-600"><p className="text-gray-400 font-bold text-sm uppercase">Transactions</p><h3 className="text-3xl font-extrabold text-white">{todaysTxs.length}</h3></div>
                    <div className="bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-purple-600"><p className="text-gray-400 font-bold text-sm uppercase">Cash In Hand</p><h3 className="text-3xl font-extrabold text-white">{settings.currency}{cashInHand.toFixed(2)}</h3></div>
                </div>
            )}

            {activeTab === 'expenses' && (
                <div className="flex flex-col md:flex-row gap-6 h-full">
                    <div className="w-full md:w-1/3 bg-gray-800 p-6 rounded-xl shadow-sm h-fit border border-gray-700">
                        <h3 className="font-bold text-lg mb-4 text-white">Request Expense</h3>
                        <form onSubmit={handleSubmitExpense} className="space-y-4">
                            <div><label className="text-sm font-bold text-gray-400">Amount</label><input type="number" required placeholder="0.00" className="w-full p-2 border border-gray-600 bg-gray-900 text-white rounded" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} /></div>
                            <div>
                                <label className="text-sm font-bold text-gray-400">Category</label>
                                <select className="w-full p-2 border border-gray-600 bg-gray-900 text-white rounded" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} required>
                                    <option value="">Select Category</option>
                                    {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div><label className="text-sm font-bold text-gray-400">Description</label><textarea required placeholder="Reason for expense..." rows={4} className="w-full p-2 border border-gray-600 bg-gray-900 text-white rounded" value={expenseReason} onChange={e => setExpenseReason(e.target.value)}></textarea></div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">Submit Request</button>
                        </form>
                    </div>
                    <div className="flex-1 bg-gray-800 p-6 rounded-xl shadow-sm overflow-y-auto border border-gray-700">
                        <h3 className="font-bold text-lg mb-4 text-white">My Requests</h3>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-900/50 font-bold text-gray-400"><tr><th className="p-3">Date</th><th className="p-3">Category</th><th className="p-3">Desc</th><th className="p-3">Amount</th><th className="p-3">Status</th></tr></thead>
                            <tbody className="divide-y divide-gray-700">{myExpenses.map(e => (<tr key={e.id}><td className="p-3 text-gray-400">{new Date(e.date).toLocaleDateString()}</td><td className="p-3 text-gray-300 font-bold">{e.categoryName || '-'}</td><td className="p-3 text-gray-300">{e.description}</td><td className="p-3 font-bold text-white">{e.amount}</td><td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${e.status==='APPROVED'?'bg-green-900/50 text-green-400':e.status==='REJECTED'?'bg-red-900/50 text-red-400':'bg-orange-900/50 text-orange-400'}`}>{e.status}</span></td></tr>))}</tbody>
                        </table>
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
                <div className="bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-700">
                    <h3 className="font-bold text-lg mb-4 text-white">Outstanding Debts & Partial Payments</h3>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-900/50 font-bold text-gray-400"><tr><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Total</th><th className="p-3">Paid</th><th className="p-3">Remaining</th><th className="p-3">Due</th><th className="p-3">Action</th></tr></thead>
                        <tbody className="divide-y divide-gray-700">{debtTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-700/50"><td className="p-3 text-gray-500">{new Date(t.date).toLocaleDateString()}</td><td className="p-3 font-bold text-white">{t.customerName}</td><td className="p-3 text-white">{t.total.toFixed(2)}</td><td className="p-3 text-green-400">{t.amountPaid.toFixed(2)}</td><td className="p-3 text-red-400 font-bold">{(t.total - t.amountPaid).toFixed(2)}</td><td className="p-3 text-gray-300">{t.dueDate || '-'}</td><td className="p-3"><button onClick={() => setSelectedDebtTx(t)} className="bg-blue-900/50 text-blue-400 px-3 py-1 rounded text-xs font-bold hover:bg-blue-900">Add Payment</button></td></tr>
                        ))}</tbody>
                    </table>
                </div>
            )}

            {activeTab === 'endofday' && (
                <div className="max-w-5xl mx-auto bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-700 h-full overflow-y-auto">
                    <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                        <div>
                            <h1 className="text-2xl font-extrabold text-white">End of Day Report</h1>
                            <p className="text-gray-400 font-bold">{today} | Cashier: {user?.name}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handlePrintEndOfDay} className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-600"><Icons.Printer size={16}/> Print Report</button>
                            <button onClick={handleDownloadDayReport} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700"><Icons.Download size={16}/> CSV</button>
                            <button onClick={handleDownloadEndDayPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-700"><Icons.FileText size={16}/> PDF</button>
                        </div>
                    </div>
                    
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="p-4 bg-gray-900 rounded-xl border border-gray-600 text-center">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Sales</p>
                            <p className="text-2xl font-extrabold text-white">{settings.currency}{totalSales.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-gray-900 rounded-xl border border-gray-600 text-center">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Transactions</p>
                            <p className="text-2xl font-extrabold text-white">{todaysTxs.length}</p>
                        </div>
                        <div className="p-4 bg-gray-900 rounded-xl border border-gray-600 text-center">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cash In Hand</p>
                            <p className="text-2xl font-extrabold text-green-400">{settings.currency}{cashInHand.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-gray-900 rounded-xl border border-gray-600 text-center">
                             <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Average Ticket</p>
                             <p className="text-2xl font-extrabold text-white">{settings.currency}{todaysTxs.length > 0 ? (totalSales / todaysTxs.length).toFixed(2) : '0.00'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        {/* Payment Breakdown */}
                        <div className="lg:col-span-1 border border-gray-700 rounded-xl overflow-hidden">
                            <div className="bg-gray-900/50 p-3 border-b border-gray-700 font-bold text-gray-300">Payment Methods</div>
                            <div className="p-0">
                                <table className="w-full text-sm text-gray-300">
                                    <tbody className="divide-y divide-gray-700">
                                        {Object.entries(paymentBreakdown).map(([method, amount]) => (
                                            <tr key={method}>
                                                <td className="p-3 font-medium">{method}</td>
                                                <td className="p-3 text-right font-bold text-white">{settings.currency}{amount.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-900/30">
                                        <tr>
                                            <td className="p-3 font-bold text-white">Total</td>
                                            <td className="p-3 text-right font-bold text-blue-400">{settings.currency}{totalSales.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                        
                         {/* Inventory Movement */}
                        <div className="lg:col-span-2 border border-gray-700 rounded-xl overflow-hidden flex flex-col">
                            <div className="bg-gray-900/50 p-3 border-b border-gray-700 font-bold text-gray-300">Inventory Movement</div>
                            <div className="overflow-auto max-h-64">
                                <table className="w-full text-left text-sm text-gray-300">
                                    <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs sticky top-0">
                                        <tr>
                                            <th className="p-2">Item</th>
                                            <th className="p-2 text-center">Opening</th>
                                            <th className="p-2 text-center">Sold</th>
                                            <th className="p-2 text-center">Closing</th>
                                            <th className="p-2 text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {Array.from(new Set(todaysTxs.flatMap(t => t.items.map(i => i.id)))).map(itemId => {
                                             const itemTxs = todaysTxs.flatMap(t => t.items).filter(i => i.id === itemId);
                                             const qtySold = itemTxs.reduce((a,b) => a + b.quantity, 0);
                                             const rev = itemTxs.reduce((a,b) => a + (b.quantity * b.sellingPrice), 0);
                                             const product = products.find(p => p.id === itemId);
                                             const currentStock = product ? product.stock : 0;
                                             const openingStock = currentStock + qtySold;
                                             
                                             return (
                                                 <tr key={itemId} className="hover:bg-gray-700/50">
                                                     <td className="p-2 font-bold text-gray-200">{product?.name || 'Unknown Item'}</td>
                                                     <td className="p-2 text-center text-gray-500">{openingStock}</td>
                                                     <td className="p-2 text-center font-bold text-blue-400">{qtySold}</td>
                                                     <td className="p-2 text-center font-bold text-gray-200">{currentStock}</td>
                                                     <td className="p-2 text-right text-green-400 font-bold">{settings.currency}{rev.toFixed(2)}</td>
                                                 </tr>
                                             );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'history' && (
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="font-bold mb-4 text-white">My Transactions</h3>
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="bg-gray-900/50 font-bold text-gray-400"><tr><th className="p-2">ID</th><th className="p-2">Time</th><th className="p-2">Status</th><th className="p-2">Total</th><th className="p-2 text-right">Action</th></tr></thead>
                        <tbody className="divide-y divide-gray-700">{myTransactions.map(t=><tr key={t.id}><td className="p-2 font-mono text-xs text-gray-500">{t.id.slice(0,8)}</td><td className="p-2 text-gray-300">{new Date(t.date).toLocaleTimeString()}</td><td className="p-2"><span className="bg-gray-700 px-2 py-0.5 rounded text-xs text-white">{t.status}</span></td><td className="p-2 font-bold text-white">{t.total.toFixed(2)}</td><td className="p-2 text-right"><button onClick={() => handlePrintReceipt(t)} className="text-gray-400 hover:text-white"><Icons.Printer size={16}/></button></td></tr>)}</tbody>
                    </table>
                </div>
            )}
            
            {activeTab === 'inventory' && (
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full flex flex-col">
                    <h3 className="font-bold mb-4 text-white">Branch Inventory</h3>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="bg-gray-900/50 font-bold sticky top-0 text-gray-400"><tr><th className="p-3">Product</th><th className="p-3 text-center">Stock</th><th className="p-3 text-right">Price</th></tr></thead>
                            <tbody className="divide-y divide-gray-700">{availableProducts.map(p => (
                                <tr key={p.id}>
                                    <td className="p-3 font-medium text-white">{p.name}</td>
                                    <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${p.stock < p.minStockAlert ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>{p.stock}</span></td>
                                    <td className="p-3 text-right">{settings.currency}{p.sellingPrice.toFixed(2)}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {activeTab === 'profile' && (
                <div className="max-w-xl mx-auto bg-gray-800 rounded-xl border border-gray-700 p-8">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-700">
                      <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-gray-400">
                          <Icons.User size={40}/>
                      </div>
                      <div>
                          <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
                          <p className="text-gray-400 capitalize">{user?.role} - {currentBranch?.name}</p>
                      </div>
                  </div>
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
              </div>
            )}
        </div>

        {/* Modals for Debt, Recall, Checkout, Success - Preserved but omitted from this snippet for brevity, assumed fully present in logic */}
        {selectedDebtTx && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-6 rounded-xl w-96 shadow-2xl border border-gray-700">
                    <h3 className="font-bold text-lg mb-4 text-white">Add Payment for {selectedDebtTx.customerName}</h3>
                    <p className="mb-4 text-sm text-gray-400">Remaining Balance: <span className="text-red-400 font-bold">{settings.currency}{(selectedDebtTx.total - selectedDebtTx.amountPaid).toFixed(2)}</span></p>
                    <input type="number" placeholder="Enter Amount" className="w-full border border-gray-600 bg-gray-900 text-white p-2 rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                    <div className="flex gap-2"><button onClick={() => setSelectedDebtTx(null)} className="flex-1 py-2 bg-gray-700 rounded text-gray-300 font-bold hover:bg-gray-600">Cancel</button><button onClick={handleAddDebtPayment} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Confirm</button></div>
                </div>
            </div>
        )}
        
        {isRecallModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-6 rounded-xl w-[500px] max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-700">
                    <h3 className="font-bold text-lg mb-4 flex justify-between items-center text-white"><span>Held Invoices</span><button onClick={()=>setIsRecallModalOpen(false)}><Icons.Close className="text-gray-400 hover:text-white"/></button></h3>
                    {heldTransactions.length === 0 ? <p className="text-gray-500 text-center py-8">No held invoices found.</p> : (
                        <div className="space-y-2">
                            {heldTransactions.map(t => (
                                <div key={t.id} className="border border-gray-700 p-3 rounded flex justify-between items-center bg-gray-700/50 hover:bg-gray-700 cursor-pointer transition" onClick={() => handleRecallInvoice(t)}>
                                    <div><p className="font-bold text-gray-200">{t.customerName}</p><p className="text-xs text-gray-500">{new Date(t.date).toLocaleString()} • {t.items.length} items</p></div>
                                    <span className="font-bold text-blue-400">{settings.currency}{t.total.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {isCheckingOut && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto border border-gray-700">
                    <h2 className="text-xl font-bold mb-4 flex justify-between items-center text-white"><span>Checkout</span><button onClick={()=>setIsCheckingOut(false)}><Icons.Close className="text-gray-400 hover:text-white"/></button></h2>
                    <div className="mb-4 bg-gray-900 p-3 rounded border border-gray-700">
                         <div className="flex justify-between text-sm text-gray-400"><span>Subtotal</span><span>{settings.currency}{cartTotal.toFixed(2)}</span></div>
                         {calculatedDiscount > 0 && <div className="flex justify-between text-sm text-green-400"><span>Discount</span><span>-{settings.currency}{calculatedDiscount.toFixed(2)}</span></div>}
                         <div className="flex justify-between text-lg font-bold mt-1 text-white"><span>Total Due</span><span className="text-blue-400">{settings.currency}{finalTotal.toFixed(2)}</span></div>
                    </div>

                    <div className="mb-4 bg-gray-900 p-3 rounded border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                            <label className="font-bold text-sm text-gray-400 flex items-center gap-1"><Icons.Tag size={14}/> Discount</label>
                            <div className="flex bg-gray-800 rounded border border-gray-600 overflow-hidden">
                                <button onClick={() => setDiscountType('FIXED')} className={`px-3 py-1 text-xs font-bold ${discountType === 'FIXED' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>{settings.currency}</button>
                                <button onClick={() => setDiscountType('PERCENTAGE')} className={`px-3 py-1 text-xs font-bold ${discountType === 'PERCENTAGE' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}><Icons.Percent size={12}/></button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input type="number" placeholder="0" className="flex-1 border border-gray-600 bg-gray-800 text-white p-2 rounded" value={discountInput} onChange={e => setDiscountInput(e.target.value)} />
                            <div className="p-2 bg-gray-700 rounded min-w-[80px] text-right font-bold text-gray-300 flex items-center justify-end">-{settings.currency}{calculatedDiscount.toFixed(2)}</div>
                        </div>
                    </div>

                    <div className="mb-4"><label className="block text-sm font-bold text-gray-400 mb-1">Customer Name (Optional)</label><input type="text" className="w-full border border-gray-600 bg-gray-900 text-white p-2 rounded" value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
                    
                    <div className="flex gap-4 mb-4"><button onClick={() => setIsSplitPayment(false)} className={`flex-1 py-2 rounded font-bold border ${!isSplitPayment ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'}`}>Single Pay</button><button onClick={() => setIsSplitPayment(true)} className={`flex-1 py-2 rounded font-bold border ${isSplitPayment ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'}`}>Split Pay</button></div>
                    
                    {!isSplitPayment ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                                {Object.values(PaymentMethod).filter(m => m !== 'SPLIT').map(m => (
                                    <button 
                                        key={m} 
                                        onClick={() => setSinglePaymentMethod(m)} 
                                        className={`flex flex-col items-center justify-center p-3 rounded border font-bold text-xs ${singlePaymentMethod === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'}`}
                                    >
                                        {getPaymentIcon(m)}
                                        {m}
                                    </button>
                                ))}
                            </div>
                            <input type="number" placeholder="Amount Tendered" className="w-full border border-gray-600 bg-gray-900 text-white p-2 rounded font-bold text-lg" value={amountTendered} onChange={e => setAmountTendered(e.target.value)} />
                            {(singlePaymentMethod === PaymentMethod.CREDIT || parseFloat(amountTendered) < finalTotal) && ( <div className="mt-2"><label className="text-xs font-bold text-gray-500">Due Date (If partial/credit)</label><input type="date" className="w-full border border-gray-600 bg-gray-900 text-white p-2 rounded" value={dueDate} onChange={e => setDueDate(e.target.value)}/></div> )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {splitPayments.map((p, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <select className="w-1/3 border border-gray-600 bg-gray-900 text-white p-2 rounded text-sm" value={p.method} onChange={e => { const newP = [...splitPayments]; newP[i].method = e.target.value as PaymentMethod; setSplitPayments(newP); }}>
                                        {Object.values(PaymentMethod).filter(m => m !== 'SPLIT').map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <input type="number" className="flex-1 border border-gray-600 bg-gray-900 text-white p-2 rounded" value={p.amount} onChange={e => { const newP = [...splitPayments]; newP[i].amount = parseFloat(e.target.value); setSplitPayments(newP); }} />
                                    {i > 0 && <button onClick={() => setSplitPayments(splitPayments.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400"><Icons.Close size={16}/></button>}
                                </div>
                            ))}
                            <div className="flex justify-between items-center mt-2">
                                <button onClick={() => setSplitPayments([...splitPayments, { method: PaymentMethod.CASH, amount: 0 }])} className="text-sm text-blue-400 font-bold hover:underline">+ Add Method</button>
                                <span className="text-sm font-bold text-gray-400">Total Entered: {splitPayments.reduce((a,b)=>a+(parseFloat(b.amount as any)||0),0).toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                    <button onClick={finalizeTransaction} className="w-full mt-6 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-md">Confirm Payment</button>
                </div>
            </div>
        )}

        {showSuccessModal && completedTransaction && (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
                <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center border border-gray-600 animate-in zoom-in-95 duration-200">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                        <Icons.Check size={40} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white mb-2">Payment Successful!</h2>
                    <p className="text-gray-400 mb-8">Transaction ID: <span className="font-mono text-gray-300">{completedTransaction.id.slice(0,8)}</span></p>
                    <p className="text-3xl font-bold text-white mb-8">{settings.currency}{completedTransaction.amountPaid.toFixed(2)}</p>
                    
                    <div className="flex flex-col gap-3">
                        <button onClick={() => handlePrintReceipt(null)} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
                            <Icons.Printer size={20} /> Print Receipt
                        </button>
                        <button onClick={handleNewSale} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition">
                            <Icons.Plus size={20} /> Start New Sale
                        </button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};
