
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, CartItem, PaymentMethod, TransactionStatus, Transaction, RefundItem, PaymentPart, Expense, ExpenseStatus } from '../types';
import { Icons } from '../components/ui/Icons';
import { nanoid } from 'nanoid';
import { HeaderTools } from '../components/ui/HeaderTools';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Cashier = () => {
    const { products, user, users, addTransaction, updateTransaction, transactions, settings, logout, processRefund, branches, categories, addNotification, expenses, addExpense, expenseCategories, customers, addCustomer, updateUserPassword } = useStore();
  const [activeTab, setActiveTab] = useState<'pos' | 'dashboard' | 'history' | 'debts' | 'inventory' | 'endofday' | 'returns' | 'profile' | 'expenses'>('pos');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [newCustomerEmail, setNewCustomerEmail] = useState('');
    const branchCustomers = customers.filter(c => c.storeId === user?.storeId);
  
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

  // Expense State
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseReason, setNewExpenseReason] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('');

  // Debt State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedDebtTx, setSelectedDebtTx] = useState<Transaction | null>(null);

  // Alert Control
  const hasAlertedRef = useRef(false);

  // Derived Data
  const currentBranch = branches.find(b => b.id === user?.storeId);
  const availableProducts = products.filter(p => p.storeId === user?.storeId);
  const productCategories = ['All', ...categories.map(c => c.name)];
  
  // STRICT FILTER: Only show transactions made by THIS cashier
  const myTransactions = transactions.filter(t => t.cashierId === user?.id && t.status !== TransactionStatus.HELD);
  
  const heldTransactions = transactions.filter(t => t.storeId === user?.storeId && t.status === TransactionStatus.HELD);
  const myExpenses = expenses.filter(e => e.requestedBy === user?.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const debtTransactions = transactions.filter(t => t.storeId === user?.storeId && (t.status === TransactionStatus.PARTIAL || (t.paymentMethod === PaymentMethod.CREDIT && t.amountPaid < t.total)));
  
  const filteredProducts = availableProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  // Real-time Stock Alerts Effect
  useEffect(() => {
    if (cart.length > 0 && !hasAlertedRef.current) {
         const lowStockItems = filteredProducts.filter(p => p.stock <= p.minStockAlert);
         if (lowStockItems.length > 0) {
             // We can trigger a toast here if desired, but user asked to prevent spam.
             // We'll leave it silent or rely on the transaction completion notification.
             hasAlertedRef.current = true;
         }
    } else if(cart.length === 0) {
        hasAlertedRef.current = false;
    }
  }, [cart, filteredProducts]);

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

  // Play sound when item is added to cart
  const playAddToCartSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      console.log('Audio context not available');
    }
  };

  // --- Handlers ---
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    playAddToCartSound();
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
        // Only check stock when INCREASING quantity, allow decreasing anytime
        if (delta > 0 && product && newQty > product.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(i => i.quantity > 0));
  };
  
  const cartTotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  const discountVal = parseFloat(discountInput) || 0;
  const calculatedDiscount = discountType === 'PERCENTAGE' ? (cartTotal * discountVal) / 100 : discountVal;
  const finalTotal = Math.max(0, cartTotal - calculatedDiscount);

  const handleHoldInvoice = () => {
    const t: Transaction = { id: nanoid(), date: new Date().toISOString(), cashierId: user?.id || 'u', cashierName: user?.name || 'U', storeId: user?.storeId, items: [...cart], subtotal: cartTotal, discount: 0, total: cartTotal, amountPaid: 0, paymentMethod: PaymentMethod.CASH, payments: [], status: TransactionStatus.HELD, customerId: selectedCustomer?.id, customerName: customerName || selectedCustomer?.name || 'Held Invoice', customerPhone: selectedCustomer?.phone };
    addTransaction(t); setCart([]); setCustomerName(''); setSelectedCustomer(null);
  };
  const handleRecallInvoice = (t: Transaction) => {
      setCart(t.items);
    setCustomerName(t.customerName || '');
    setSelectedCustomer(t.customerId ? customers.find(c => c.id === t.customerId) || null : null);
    // Restore discount if it exists
    if (t.discount > 0) {
        const discountPercent = ((t.discount / t.subtotal) * 100);
        if (Math.round(discountPercent * 10) === Math.round((t.discount / t.subtotal) * 100 * 10)) {
            setDiscountType('PERCENTAGE');
            setDiscountInput(discountPercent.toFixed(2));
        } else {
            setDiscountType('FIXED');
            setDiscountInput(t.discount.toFixed(2));
        }
    }
    if (t.status === TransactionStatus.PARTIAL && t.dueDate) {
        setDueDate(t.dueDate);
    }
      setIsRecallModalOpen(false);
  };
  
  const handleCheckout = () => { 
      if (cart.length === 0) return; 
      setIsCheckingOut(true); 
      setAmountTendered(''); 
      setDiscountInput('');
      setDiscountType('FIXED');
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
        payments: finalPayments, status, customerId: selectedCustomer?.id, customerName, customerPhone: selectedCustomer?.phone, dueDate: status === TransactionStatus.PARTIAL ? dueDate : undefined
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
      setCustomerName(''); setSelectedCustomer(null);
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
        status: ExpenseStatus.PENDING,
        requestedBy: user.id,
        requestedByName: user.name,
        storeId: user.storeId,
        date: new Date().toISOString()
    };
    addExpense(expense);
    setNewExpenseAmount('');
    setNewExpenseReason('');
    setNewExpenseCategory('');
  };

  // Returns Logic
  const handleSearchForReturn = () => {
    const found = transactions.find(t => t.id === returnInvoiceId && t.storeId === user?.storeId);
    if (found) { setReturnTransaction(found); setItemsToReturn([]); setReturnCondition('Good'); }
    else { addNotification('Transaction not found', 'error'); }
  };
  const toggleItemReturn = (itemId: string, maxQty: number) => {
      const exists = itemsToReturn.find(i => i.itemId === itemId);
      if (exists) setItemsToReturn(prev => prev.filter(i => i.itemId !== itemId));
      else setItemsToReturn(prev => [...prev, { itemId, qty: maxQty }]);
  };
  const updateReturnQuantity = (itemId: string, newQty: number) => {
      setItemsToReturn(prev => prev.map(i => i.itemId === itemId ? { ...i, qty: Math.max(1, Math.min(newQty, transactions.find(t => t.id === returnTransaction?.id)?.items.find(it => it.id === itemId)?.quantity || 1)) } : i));
  };
  const handleProcessReturn = () => {
      if (!returnTransaction) return;
      processRefund(returnTransaction.id, itemsToReturn.map(i => ({ itemId: i.itemId, quantity: i.qty })), returnReason, returnCondition);
      setReturnTransaction(null); setItemsToReturn([]); setReturnReason(''); setReturnInvoiceId('');
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
            body { margin: 0; padding: 5px; }
          }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 80mm; 
            margin: 0 auto; 
            padding: 5px;
            background: #fff;
            color: #000;
            font-size: 11px;
            line-height: 1.2;
          }
          .header { text-align: center; margin-bottom: 10px; }
          .logo { font-size: 16px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
          .branch { font-size: 12px; font-weight: bold; margin-bottom: 3px; }
          .info { font-size: 10px; margin-bottom: 2px; }
          .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; border-bottom: 1px dashed #000; padding: 2px 0; font-size: 10px; }
          td { padding: 2px 0; vertical-align: top; }
          .right { text-align: right; }
          .center { text-align: center; }
          .total-section { border-top: 1px dashed #000; margin-top: 5px; padding-top: 2px; }
          .total-row { font-weight: bold; font-size: 13px; margin-top: 4px; display: flex; justify-content: space-between; }
          .sub-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; }
          .footer { text-align: center; font-size: 10px; margin-top: 10px; }
          .status { text-align: center; font-weight: bold; border: 1px solid #000; padding: 2px; margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          ${settings.logoUrl ? `<img src="${settings.logoUrl}" style="max-width: 60px; max-height: 60px; margin-bottom: 5px;" />` : ''}
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

        <div style="margin-bottom: 5px;">
          <div style="font-weight: bold; font-size: 10px; margin-bottom: 2px;">PAYMENT DETAILS</div>
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

  const getEndDayData = () => {
    const inventoryMovement = todaysTxs.flatMap(t => t.items).reduce((acc: any, item) => {
        if(!acc[item.name]) acc[item.name] = { qty: 0, val: 0, stock: products.find(p=>p.id===item.id)?.stock || 0 };
        acc[item.name].qty += item.quantity;
        acc[item.name].val += (item.sellingPrice * item.quantity);
        return acc;
    }, {});

    const invRows = Object.entries(inventoryMovement).map(([name, data]: any) => [
        name, 
        (data.qty + data.stock).toString(), // Opening
        data.qty.toString(), // Sold
        data.stock.toString(), // Closing
        `${settings.currency}${data.val.toFixed(2)}`
    ]);
    return invRows;
  };

  const handleDownloadEndDayPDF = () => {
    const doc = new jsPDF();
    const branchName = currentBranch?.name || 'Main Branch';
    
    doc.setFontSize(18); doc.text(`End of Day Report: ${today}`, 14, 20);
    doc.setFontSize(12); doc.text(`Branch: ${branchName} | Cashier: ${user?.name}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleTimeString()}`, 14, 34);

    // Summary Table
    autoTable(doc, {
        head: [['Metric', 'Value']],
        body: [
            ['Total Sales Revenue', `${settings.currency}${totalSales.toFixed(2)}`],
            ['Cash in Hand', `${settings.currency}${cashInHand.toFixed(2)}`],
            ['Transactions Count', todaysTxs.length.toString()],
            ['Expenses Raised', myExpenses.length.toString()]
        ],
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("Payment Method Breakdown", 14, finalY);
    
    // Fix: Convert all payment breakdown values to strings to prevent 'hashing' issues in autoTable
    const breakdownRows = Object.entries(paymentBreakdown).map(([k,v]) => [k, `${settings.currency}${v.toFixed(2)}`]);

    autoTable(doc, {
        head: [['Method', 'Amount']],
        body: breakdownRows,
        startY: finalY + 5,
        theme: 'grid'
    });
    
    finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("Inventory Movement (Sold Today)", 14, finalY);

    const invRows = getEndDayData();

    autoTable(doc, {
        head: [['Item', 'Opening (Est)', 'Sold', 'Closing', 'Total Sales']],
        body: invRows,
        startY: finalY + 5,
        theme: 'grid'
    });

    doc.save(`EOD_${today.replace(/\//g,'-')}_${user?.username}.pdf`);
  };

  const handlePrintEndOfDay = () => {
      const branchName = currentBranch?.name || 'Main Branch';
      const invRows = getEndDayData();
      
      const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>End of Day Report - ${today}</title>
          <style>
              body { font-family: 'Inter', sans-serif; padding: 20px; color: #000; }
              h1 { margin-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .header { margin-bottom: 20px; border-bottom: 2px solid #000; pb: 10px; }
              .right { text-align: right; }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>End of Day Report</h1>
              <p><strong>Branch:</strong> ${branchName} | <strong>Cashier:</strong> ${user?.name}</p>
              <p><strong>Date:</strong> ${today} | <strong>Generated:</strong> ${new Date().toLocaleTimeString()}</p>
          </div>

          <h3>Summary</h3>
          <table>
              <tr><th>Metric</th><th>Value</th></tr>
              <tr><td>Total Sales Revenue</td><td>${settings.currency}${totalSales.toFixed(2)}</td></tr>
              <tr><td>Cash in Hand</td><td>${settings.currency}${cashInHand.toFixed(2)}</td></tr>
              <tr><td>Transactions</td><td>${todaysTxs.length}</td></tr>
              <tr><td>Expenses</td><td>${myExpenses.length}</td></tr>
          </table>

          <h3>Payment Breakdown</h3>
          <table>
              <tr><th>Method</th><th>Amount</th></tr>
              ${Object.entries(paymentBreakdown).map(([k,v]) => `<tr><td>${k}</td><td>${settings.currency}${v.toFixed(2)}</td></tr>`).join('')}
          </table>

          <h3>Inventory Movement</h3>
          <table>
              <tr><th>Item</th><th>Opening</th><th>Sold</th><th>Closing</th><th>Total Sales</th></tr>
              ${invRows.map(row => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td><td>${row[4]}</td></tr>`).join('')}
          </table>
          <script>window.onload = function() { window.print(); window.onafterprint = function(){ window.close(); } };</script>
      </body>
      </html>
      `;
      const win = window.open('','_blank','width=800,height=900');
      if(win) { win.document.write(printHtml); win.document.close(); }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex font-sans">
      <aside className={`bg-gray-800 border-r border-gray-700 flex flex-col fixed h-full z-20 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
           {!isSidebarCollapsed && <h1 className="text-xl font-bold flex items-center gap-2 text-white"><Icons.POS className="text-blue-500"/> Cashier</h1>}
           <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-gray-400 hover:text-white">
               {isSidebarCollapsed ? <Icons.ChevronRight size={20}/> : <Icons.ChevronLeft size={20}/>}
           </button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {[{ id: 'pos', icon: Icons.Terminal, label: 'POS Terminal' }, { id: 'dashboard', icon: Icons.Dashboard, label: 'My Dashboard' }, { id: 'expenses', icon: Icons.Expenses, label: 'Expenses' }, { id: 'returns', icon: Icons.RotateCcw, label: 'Returns & Recall' }, { id: 'history', icon: Icons.History, label: 'Transaction History' }, { id: 'debts', icon: Icons.Wallet, label: 'Debts & Credits' }, { id: 'inventory', icon: Icons.Inventory, label: 'View Inventory' }, { id: 'endofday', icon: Icons.Reports, label: 'End of Day Report' }, { id: 'profile', icon: Icons.User, label: 'My Profile' }].map(item => (
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
        <header className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white capitalize">{activeTab.replace(/([A-Z])/g, ' $1')}</h2>
              <p className="text-gray-400 text-sm">{user?.name} @ {currentBranch?.name}</p>
            </div>
            <div className="flex items-center gap-4">
               <HeaderTools />
               {activeTab === 'pos' && cart.length > 0 && <button onClick={handleHoldInvoice} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Icons.Pause size={16}/> Hold</button>}
            </div>
        </header>

        {activeTab === 'pos' && (
            <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)]">
                {/* Product Grid */}
                <div className="flex-1 flex flex-col bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-700 flex gap-4">
                        <div className="relative flex-1">
                            <Icons.Search className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input type="text" placeholder="Scan SKU or Search..." className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-10 p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                        </div>
                        <button onClick={() => setIsRecallModalOpen(true)} className="bg-orange-600 hover:bg-orange-500 text-white px-4 rounded-lg font-bold flex items-center gap-2"><Icons.Play size={18}/> Recall ({heldTransactions.length})</button>
                    </div>
                    <div className="flex gap-2 p-4 overflow-x-auto border-b border-gray-700 no-scrollbar">
                        {productCategories.map(cat => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{cat}</button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 content-start">
                        {filteredProducts.map(product => (
                            <button key={product.id} onClick={() => addToCart(product)} disabled={product.stock <= 0} className={`text-left p-3 rounded-lg border transition flex flex-col h-full ${product.stock <= 0 ? 'bg-gray-900 border-gray-800 opacity-50 cursor-not-allowed' : 'bg-gray-700 border-gray-600 hover:border-blue-400 hover:shadow-lg'}`}>
                                <div className="h-16 bg-gray-800 rounded mb-2 flex items-center justify-center"><Icons.Inventory size={24} className="text-gray-500" /></div>
                                <h3 className="font-bold text-sm text-gray-100 line-clamp-1">{product.name}</h3>
                                <div className="mt-1">
                                    <span className="inline-block text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-semibold">{product.category}</span>
                                </div>
                                <p className="text-xs text-gray-300 mt-1.5 mb-auto leading-tight line-clamp-3 min-h-[3rem] flex items-center">
                                    {product.description && product.description.trim() ? product.description : <span className="text-gray-500 italic">No description</span>}
                                </p>
                                <div className="mt-2 pt-2 border-t border-gray-600 flex justify-between items-center">
                                    <span className="text-green-400 font-bold text-sm">{settings.currency}{product.sellingPrice.toFixed(2)}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${product.stock < product.minStockAlert ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>Stock: {product.stock}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cart Panel */}
                <div className="w-full md:w-96 bg-gray-800 rounded-xl border border-gray-700 flex flex-col h-full">
                    <div className="p-4 border-b border-gray-700"><h3 className="font-bold text-lg text-white flex items-center gap-2"><Icons.POS /> Current Sale</h3></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                <Icons.POS size={48} className="mb-2 opacity-50" />
                                <p>Cart is empty</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg border border-gray-600 animate-in fade-in slide-in-from-right-4">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-200">{item.name}</h4>
                                        <p className="text-sm text-blue-400">{settings.currency}{item.sellingPrice}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-full bg-gray-600 hover:bg-gray-500 text-white flex items-center justify-center">-</button>
                                        <span className="font-bold w-4 text-center text-white">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center">+</button>
                                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300 ml-2"><Icons.Delete size={18} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-4 bg-gray-900 border-t border-gray-700">
                                                <div className="mb-3">
                                                    <div className="flex gap-2">
                                                        <select className="flex-1 bg-gray-800 border border-gray-600 text-white p-2 rounded text-sm" value={selectedCustomer?.id || ''} onChange={e => { const id = e.target.value; const c = branchCustomers.find(c => c.id === id) || null; setSelectedCustomer(c); setCustomerName(c?.name || ''); }}>
                                                            <option value="">-- No customer --</option>
                                                            {branchCustomers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                                                        </select>
                                                        <button onClick={() => setShowAddCustomerForm(prev => !prev)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded">{showAddCustomerForm ? 'Cancel' : 'Add'}</button>
                                                    </div>
                                                    {showAddCustomerForm && (
                                                        <div className="mt-2 grid grid-cols-1 gap-2">
                                                            <input type="text" placeholder="Customer Name" className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded text-sm" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} />
                                                            <input type="text" placeholder="Customer Phone" className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded text-sm" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} />
                                                            <input type="email" placeholder="Customer Email" className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded text-sm" value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)} />
                                                            <div className="flex gap-2">
                                                                <button onClick={() => {
                                                                    if (!newCustomerName) { addNotification('Customer name is required', 'error'); return; }
                                                                    const created = addCustomer({ name: newCustomerName, phone: newCustomerPhone, email: newCustomerEmail, storeId: user?.storeId });
                                                                    setSelectedCustomer(created);
                                                                    setCustomerName(created.name || newCustomerName);
                                                                    setNewCustomerName(''); setNewCustomerPhone(''); setNewCustomerEmail(''); setShowAddCustomerForm(false);
                                                                }} className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded">Save</button>
                                                                <button onClick={() => setShowAddCustomerForm(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded">Cancel</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                        
                        <div className="flex justify-between mb-2 text-gray-400 text-sm"><span>Subtotal</span><span>{settings.currency}{cartTotal.toFixed(2)}</span></div>
                        <div className="flex justify-between mb-2 text-gray-400 text-sm"><span>Discount</span><span>{settings.currency}{calculatedDiscount.toFixed(2)}</span></div>
                        <div className="flex justify-between mb-4 text-xl font-bold text-white"><span>Total</span><span>{settings.currency}{finalTotal.toFixed(2)}</span></div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={handleClearCart} className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold transition">Clear</button>
                            <button onClick={handleCheckout} disabled={cart.length === 0} className="bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold transition shadow-lg shadow-green-900/50 disabled:bg-gray-700 disabled:text-gray-500 disabled:shadow-none">Checkout</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ... (Other Tabs remain the same) ... */}
        {activeTab === 'dashboard' && (
             <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                         <p className="text-gray-400 text-sm font-bold uppercase">Total Sales Today</p>
                         <h3 className="text-3xl font-extrabold text-white mt-2">{settings.currency}{totalSales.toFixed(2)}</h3>
                     </div>
                     <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                         <p className="text-gray-400 text-sm font-bold uppercase">Transactions</p>
                         <h3 className="text-3xl font-extrabold text-blue-400 mt-2">{todaysTxs.length}</h3>
                     </div>
                     <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                         <p className="text-gray-400 text-sm font-bold uppercase">Cash in Hand</p>
                         <h3 className="text-3xl font-extrabold text-green-400 mt-2">{settings.currency}{cashInHand.toFixed(2)}</h3>
                     </div>
                     <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                         <p className="text-gray-400 text-sm font-bold uppercase">Expenses Raised</p>
                         <h3 className="text-3xl font-extrabold text-orange-400 mt-2">{myExpenses.length}</h3>
                     </div>
                 </div>

                 {/* Recent Transactions Widget */}
                 <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                     <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                         <h3 className="font-bold text-white text-lg">My Recent Transactions</h3>
                         <button onClick={()=>setActiveTab('history')} className="text-blue-400 text-sm font-bold hover:text-blue-300">View All</button>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                             <thead className="bg-gray-900/50 text-gray-400 font-bold"><tr><th className="p-4">Time</th><th className="p-4">Receipt ID</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Status</th></tr></thead>
                             <tbody className="divide-y divide-gray-700">
                                 {myTransactions.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0, 5).map(t => (
                                     <tr key={t.id} className="hover:bg-gray-700/50">
                                         <td className="p-4">{new Date(t.date).toLocaleTimeString()}</td>
                                         <td className="p-4 font-mono text-xs text-gray-400">{t.id.slice(0,8)}</td>
                                         <td className="p-4">{t.items.length}</td>
                                         <td className="p-4 font-bold text-white">{settings.currency}{t.total.toFixed(2)}</td>
                                         <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs ${t.status === TransactionStatus.COMPLETED ? 'bg-green-900 text-green-400' : 'bg-orange-900 text-orange-400'}`}>{t.status}</span></td>
                                     </tr>
                                 ))}
                                 {myTransactions.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No recent transactions found.</td></tr>}
                             </tbody>
                         </table>
                     </div>
                 </div>
             </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
             <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                 <div className="p-6 border-b border-gray-700"><h3 className="font-bold text-white text-lg">My Transaction History</h3></div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-gray-900/50 text-gray-400 font-bold"><tr><th className="p-4">Time</th><th className="p-4">Receipt ID</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Method</th><th className="p-4">Action</th></tr></thead>
                        <tbody className="divide-y divide-gray-700">
                            {myTransactions.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map(t => (
                                <tr key={t.id} className="hover:bg-gray-700/50">
                                    <td className="p-4">{new Date(t.date).toLocaleString()}</td>
                                    <td className="p-4 font-mono text-xs">{t.id.slice(0,8)}</td>
                                    <td className="p-4">{t.items.length}</td>
                                    <td className="p-4 font-bold text-white">{settings.currency}{t.total.toFixed(2)}</td>
                                    <td className="p-4">{t.paymentMethod}</td>
                                    <td className="p-4"><button onClick={()=>handlePrintReceipt(t)} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs font-bold">Reprint</button></td>
                                </tr>
                            ))}
                            {myTransactions.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500">No history available for your account.</td></tr>}
                        </tbody>
                    </table>
                 </div>
             </div>
        )}

        {/* ... (Existing tabs: Debts, Inventory, EndOfDay, Returns, Expenses, Profile - Preserved) ... */}
        {/* DEBTS TAB */}
        {activeTab === 'debts' && (
             <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                 <h3 className="font-bold text-white text-lg mb-4">Manage Debts & Credits</h3>
                 {debtTransactions.length === 0 ? <p className="text-gray-500">No outstanding debts found.</p> : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {debtTransactions.map(t => (
                             <div key={t.id} className="bg-gray-900 border border-gray-700 p-4 rounded-xl">
                                 <div className="flex justify-between mb-2">
                                     <span className="font-bold text-white">{t.customerName}</span>
                                     <span className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</span>
                                 </div>
                                 <div className="mb-2 text-sm text-gray-300">
                                     <p>Total: {settings.currency}{t.total.toFixed(2)}</p>
                                     <p>Paid: <span className="text-green-400">{settings.currency}{t.amountPaid.toFixed(2)}</span></p>
                                     <p>Remaining: <span className="text-red-400 font-bold">{settings.currency}{(t.total - t.amountPaid).toFixed(2)}</span></p>
                                 </div>
                                 <div className="mb-3 text-xs bg-gray-800 p-2 rounded">Due: {t.dueDate || 'No date set'}</div>
                                 <div className="flex gap-2">
                                     <input type="number" className="w-24 bg-gray-800 border border-gray-600 text-white text-xs p-1 rounded" placeholder="Amount" value={selectedDebtTx?.id === t.id ? paymentAmount : ''} onChange={e => { setSelectedDebtTx(t); setPaymentAmount(e.target.value); }} />
                                     <button onClick={handleAddDebtPayment} disabled={selectedDebtTx?.id !== t.id} className="bg-blue-600 text-white text-xs px-3 py-1 rounded font-bold hover:bg-blue-500 disabled:opacity-50">Add Pay</button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
             </div>
        )}
        
        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700"><h3 className="font-bold text-white text-lg">Branch Inventory</h3></div>
                <div className="overflow-auto max-h-[70vh]">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-gray-900/50 text-gray-400 font-bold sticky top-0"><tr><th className="p-4">Product</th><th className="p-4">SKU</th><th className="p-4 text-center">Stock</th><th className="p-4 text-right">Price</th></tr></thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredProducts.map(p => (
                                <tr key={p.id} className="hover:bg-gray-700/50">
                                    <td className="p-4 font-bold text-white">{p.name}</td>
                                    <td className="p-4 text-xs font-mono">{p.sku}</td>
                                    <td className="p-4 text-center"><span className={`px-2 py-0.5 rounded text-xs font-bold ${p.stock<p.minStockAlert?'bg-red-900 text-red-400':'bg-green-900 text-green-400'}`}>{p.stock}</span></td>
                                    <td className="p-4 text-right">{settings.currency}{p.sellingPrice.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* END OF DAY TAB */}
        {activeTab === 'endofday' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white">End of Day Report</h2>
                        <p className="text-gray-400">{today} • {user?.name}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleDownloadEndDayPDF} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Icons.FileText size={18}/> Download PDF</button>
                        <button onClick={handlePrintEndOfDay} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Icons.Printer size={18}/> Print</button>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700"><p className="text-gray-400 text-xs uppercase font-bold">Subtotal</p><h3 className="text-xl font-bold text-white">{settings.currency}{(totalSales + todaysTxs.reduce((a,b) => a + b.discount, 0)).toFixed(2)}</h3></div>
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700"><p className="text-gray-400 text-xs uppercase font-bold">Total Discount</p><h3 className="text-xl font-bold text-red-400">-{settings.currency}{todaysTxs.reduce((a,b) => a + b.discount, 0).toFixed(2)}</h3></div>
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700"><p className="text-gray-400 text-xs uppercase font-bold">Net Revenue</p><h3 className="text-xl font-bold text-white">{settings.currency}{totalSales.toFixed(2)}</h3></div>
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700"><p className="text-gray-400 text-xs uppercase font-bold">Cash In Hand</p><h3 className="text-xl font-bold text-green-400">{settings.currency}{cashInHand.toFixed(2)}</h3></div>
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700"><p className="text-gray-400 text-xs uppercase font-bold">POS</p><h3 className="text-xl font-bold text-yellow-400">{settings.currency}{paymentBreakdown[PaymentMethod.POS].toFixed(2)}</h3></div>
                </div>

                <h3 className="font-bold text-white mb-4 text-lg">Sales Breakdown (Subtotal vs Net Amount After Discount)</h3>
                <div className="overflow-hidden rounded-lg border border-gray-700 mb-8">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-gray-900 text-gray-400 font-bold"><tr><th className="p-3">Transaction ID</th><th className="p-3 text-right">Subtotal</th><th className="p-3 text-right">Discount</th><th className="p-3 text-right">Net Amount</th><th className="p-3">Customer</th><th className="p-3">Payment</th></tr></thead>
                        <tbody className="divide-y divide-gray-700">
                            {todaysTxs.map(tx => (
                                <tr key={tx.id} className="hover:bg-gray-700">
                                    <td className="p-3 font-mono text-gray-200">{tx.id.substring(0, 8)}</td>
                                    <td className="p-3 text-right text-blue-400">{settings.currency}{(tx.subtotal).toFixed(2)}</td>
                                    <td className="p-3 text-right text-red-400">-{settings.currency}{tx.discount.toFixed(2)}</td>
                                    <td className="p-3 text-right font-bold text-white">{settings.currency}{tx.total.toFixed(2)}</td>
                                    <td className="p-3 text-gray-300">{tx.customerName || 'Walk-in'}</td>
                                    <td className="p-3 capitalize text-yellow-400">{tx.paymentMethod === PaymentMethod.SPLIT ? 'Split' : tx.paymentMethod}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <h3 className="font-bold text-white mb-4 text-lg">Inventory Movement & Sales Summary (Sold Today)</h3>
                <div className="overflow-hidden rounded-lg border border-gray-700">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-gray-900 text-gray-400 font-bold"><tr><th className="p-3">Item Name</th><th className="p-3 text-center">Qty Sold</th><th className="p-3 text-right">Unit Price</th><th className="p-3 text-right">Total Amount</th><th className="p-3 text-center">Opening (Est)</th><th className="p-3 text-center">Closing</th></tr></thead>
                        <tbody className="divide-y divide-gray-700">
                            {Object.entries(todaysTxs.flatMap(t => t.items).reduce((acc: any, item) => {
                                if(!acc[item.name]) acc[item.name] = { qty: 0, stock: products.find(p=>p.id===item.id)?.stock || 0, price: item.sellingPrice, total: 0 };
                                acc[item.name].qty += item.quantity;
                                acc[item.name].total += item.sellingPrice * item.quantity;
                                return acc;
                            }, {})).map(([name, data]: any) => (
                                <tr key={name} className="hover:bg-gray-700">
                                    <td className="p-3 font-medium text-white">{name}</td>
                                    <td className="p-3 text-center text-blue-400 font-bold">{data.qty}</td>
                                    <td className="p-3 text-right text-gray-400">{settings.currency}{data.price.toFixed(2)}</td>
                                    <td className="p-3 text-right font-bold text-green-400">{settings.currency}{data.total.toFixed(2)}</td>
                                    <td className="p-3 text-center text-gray-500">{data.qty + data.stock}</td>
                                    <td className="p-3 text-center text-white">{data.stock}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="font-bold text-lg mb-4 text-white">Select Items to Return</h3>
                        <div className="flex-1 overflow-auto border border-gray-600 rounded-lg p-4 mb-4 bg-gray-900">
                            {returnTransaction.items.map(item => {
                                const returnItem = itemsToReturn.find(i => i.itemId === item.id);
                                return (
                                    <div key={item.id} className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-800 mb-2 rounded shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={!!returnItem} onChange={() => toggleItemReturn(item.id, item.quantity)} />
                                            <div>
                                                <span className="font-bold text-gray-300 block">{item.name}</span>
                                                <span className="text-xs text-gray-500">Available: {item.quantity} units</span>
                                            </div>
                                        </div>
                                        {returnItem && (
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    max={item.quantity} 
                                                    value={returnItem.qty}
                                                    onChange={(e) => updateReturnQuantity(item.id, parseInt(e.target.value) || 1)}
                                                    className="w-12 bg-gray-700 border border-gray-600 text-white p-1 rounded text-center text-sm"
                                                />
                                                <span className="text-white text-sm">x</span>
                                            </div>
                                        )}
                                        <span className="font-bold text-white">{settings.currency}{item.sellingPrice}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-1">Condition</label>
                                <select className="w-full border border-gray-600 bg-gray-900 text-white p-3 rounded-lg" value={returnCondition} onChange={e => setReturnCondition(e.target.value)}>
                                    <option value="Good">Good (Restock)</option>
                                    <option value="Damaged">Damaged (No Restock)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-1">Reason</label>
                                <input type="text" placeholder="Defective, wrong item..." className="w-full border border-gray-600 bg-gray-900 text-white p-3 rounded-lg" value={returnReason} onChange={e => setReturnReason(e.target.value)} />
                            </div>
                        </div>
                        <button onClick={handleProcessReturn} disabled={itemsToReturn.length === 0} className="bg-red-600 text-white py-3 rounded-lg font-bold w-full hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed">Confirm Return Process</button>
                    </div>
                )}
             </div>
        )}
        
        {activeTab === 'expenses' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-fit">
                    <h3 className="font-bold text-lg text-white mb-4">New Expense Request</h3>
                    <form onSubmit={handleCreateExpense} className="space-y-4">
                        <div>
                            <label className="text-gray-400 text-xs font-bold uppercase">Category</label>
                            <select className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg mt-1" value={newExpenseCategory} onChange={e=>setNewExpenseCategory(e.target.value)} required>
                                <option value="">Select Category</option>
                                {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-gray-400 text-xs font-bold uppercase">Amount</label>
                            <input type="number" className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg mt-1" value={newExpenseAmount} onChange={e=>setNewExpenseAmount(e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-gray-400 text-xs font-bold uppercase">Description</label>
                            <textarea className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg mt-1" rows={3} value={newExpenseReason} onChange={e=>setNewExpenseReason(e.target.value)} required />
                        </div>
                        <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-500">Submit Request</button>
                    </form>
                </div>
                <div className="md:col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="font-bold text-lg text-white mb-4">My Expenses</h3>
                    <div className="space-y-3">
                        {myExpenses.length === 0 ? <p className="text-gray-500">No expenses recorded.</p> : myExpenses.map(e => (
                            <div key={e.id} className="bg-gray-900 border border-gray-700 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-white">{e.description}</p>
                                    <p className="text-xs text-gray-400">{new Date(e.date).toLocaleDateString()} • {e.categoryName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-white">{settings.currency}{e.amount.toFixed(2)}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${e.status === 'APPROVED' ? 'bg-green-900 text-green-400' : e.status === 'REJECTED' ? 'bg-red-900 text-red-400' : 'bg-orange-900 text-orange-400'}`}>{e.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto">
                <div className="grid grid-cols-2 gap-6">
                    {/* Profile Card */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
                        <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 border-4 border-gray-600"><Icons.User size={48}/></div>
                        <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
                        <p className="text-gray-400">{user?.role} • {currentBranch?.name}</p>
                        
                        <div className="mt-8 space-y-4 text-left">
                             <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                                 <p className="text-gray-400 text-xs uppercase font-bold">Username</p>
                                 <p className="text-white font-medium">{user?.username}</p>
                             </div>
                             <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                                 <p className="text-gray-400 text-xs uppercase font-bold">Expense Limit</p>
                                 <p className="text-white font-medium">{user?.expenseLimit ? `${settings.currency}${user.expenseLimit}` : 'None'}</p>
                             </div>
                             <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                                 <p className="text-gray-400 text-xs uppercase font-bold">Branch Manager</p>
                                 <p className="text-blue-400 font-medium">{users.find(u => u.id === currentBranch?.managerId)?.name || 'N/A'}</p>
                             </div>
                        </div>
                    </div>

                    {/* Password & Security Card */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Icons.Lock size={20} /> Security</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                                <p className="text-gray-400 text-xs uppercase font-bold mb-2">Last Password Change</p>
                                <p className="text-white">Never</p>
                            </div>
                             <button onClick={() => { setIsPasswordModalOpen(true); setNewPassword(''); setConfirmPassword(''); }} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded font-bold flex items-center justify-center gap-2">
                                <Icons.Edit size={16} /> Change Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-xl w-[400px] border border-gray-700">
                  <h2 className="text-xl font-bold text-white mb-4">Change Password</h2>
                  <form onSubmit={(e) => { e.preventDefault(); if (!user) return; if (newPassword.length < 6) { addNotification('Password must be at least 6 characters', 'error'); return; } if (newPassword !== confirmPassword) { addNotification('Passwords do not match', 'error'); return; } updateUserPassword(user.id, newPassword); setIsPasswordModalOpen(false); setNewPassword(''); setConfirmPassword(''); addNotification('Password changed successfully', 'success'); }} className="space-y-4">
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">New Password</label>
                          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" placeholder="Enter new password" minLength={6} required />
                      </div>
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
                          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-white p-2 rounded" placeholder="Confirm new password" minLength={6} required />
                      </div>
                      <div className="flex gap-2 pt-2"><button type="button" onClick={() => { setIsPasswordModalOpen(false); setNewPassword(''); setConfirmPassword(''); }} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button><button type="submit" className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold">Change</button></div>
                  </form>
              </div>
          </div>
      )}

      {/* Checkout/Success/Recall Modals... (omitted, preserved) */}
       {isCheckingOut && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900">
                     <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Icons.Card /> Checkout</h2>
                     <button onClick={() => setIsCheckingOut(false)} className="text-gray-400 hover:text-white"><Icons.Close size={24} /></button>
                 </div>
                 
                 <div className="p-6 overflow-y-auto flex-1 space-y-6">
                     <div className="text-center bg-gray-900 p-4 rounded-xl border border-gray-700">
                         <p className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-1">Total Payable</p>
                         <h3 className="text-4xl font-extrabold text-white">{settings.currency}{finalTotal.toFixed(2)}</h3>
                     </div>

                     <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                         <div className="flex justify-between items-center mb-2">
                             <label className="text-sm font-bold text-gray-300 flex items-center gap-2"><Icons.Percent size={16}/> Apply Discount</label>
                             <div className="flex bg-gray-800 rounded p-1">
                                 <button onClick={()=>setDiscountType('FIXED')} className={`px-3 py-1 text-xs rounded font-bold ${discountType==='FIXED'?'bg-blue-600 text-white':'text-gray-400'}`}>{settings.currency}</button>
                                 <button onClick={()=>setDiscountType('PERCENTAGE')} className={`px-3 py-1 text-xs rounded font-bold ${discountType==='PERCENTAGE'?'bg-blue-600 text-white':'text-gray-400'}`}>%</button>
                             </div>
                         </div>
                         <input type="number" placeholder="Enter discount..." className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={discountInput} onChange={e => setDiscountInput(e.target.value)} />
                     </div>

                     <div className="flex bg-gray-700 p-1 rounded-lg">
                         <button onClick={() => setIsSplitPayment(false)} className={`flex-1 py-2 rounded-md font-bold text-sm transition ${!isSplitPayment ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:text-white'}`}>Single Payment</button>
                         <button onClick={() => setIsSplitPayment(true)} className={`flex-1 py-2 rounded-md font-bold text-sm transition ${isSplitPayment ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:text-white'}`}>Split Payment</button>
                     </div>

                     {!isSplitPayment ? (
                         <div className="space-y-4">
                             <div className="grid grid-cols-3 gap-2">
                                 {[PaymentMethod.CASH, PaymentMethod.POS, PaymentMethod.TRANSFER, PaymentMethod.WALLET, PaymentMethod.CREDIT, PaymentMethod.DEPOSIT].map(method => (
                                     <button key={method} onClick={() => setSinglePaymentMethod(method)} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition ${singlePaymentMethod === method ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}>
                                         {getPaymentIcon(method)}
                                         <span className="text-xs font-bold mt-1">{method}</span>
                                     </button>
                                 ))}
                             </div>
                             <div className="relative">
                                 <Icons.Banknote className="absolute left-3 top-3.5 text-gray-500" size={20} />
                                 <input type="number" placeholder="Amount Tendered" className="w-full bg-gray-900 border border-gray-600 text-white pl-10 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg" value={amountTendered} onChange={e => setAmountTendered(e.target.value)} disabled={singlePaymentMethod === PaymentMethod.CREDIT} />
                             </div>
                             {singlePaymentMethod === PaymentMethod.CREDIT && (
                                 <input type="date" className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-xl" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                             )}
                         </div>
                     ) : (
                         <div className="space-y-3">
                             {splitPayments.map((payment, index) => (
                                 <div key={index} className="flex gap-2">
                                     <select className="bg-gray-700 border border-gray-600 text-white rounded p-2 text-sm w-32" value={payment.method} onChange={(e) => { const newP = [...splitPayments]; newP[index].method = e.target.value as PaymentMethod; setSplitPayments(newP); }}>
                                         {[PaymentMethod.CASH, PaymentMethod.POS, PaymentMethod.TRANSFER, PaymentMethod.CREDIT, PaymentMethod.WALLET].map(m => <option key={m} value={m}>{m}</option>)}
                                     </select>
                                     <input type="number" className="flex-1 bg-gray-900 border border-gray-600 text-white p-2 rounded" placeholder="Amount" value={payment.amount} onChange={(e) => { const newP = [...splitPayments]; newP[index].amount = parseFloat(e.target.value); setSplitPayments(newP); }} />
                                     <button onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-300"><Icons.Close /></button>
                                 </div>
                             ))}
                             <button onClick={() => setSplitPayments([...splitPayments, { method: PaymentMethod.CASH, amount: 0 }])} className="text-sm text-blue-400 font-bold hover:underline">+ Add Method</button>
                             <div className="bg-gray-900 p-3 rounded border border-gray-700 text-right">
                                 <p className="text-sm text-gray-400">Total Covered: <span className="text-white font-bold">{settings.currency}{splitPayments.reduce((s, p) => s + (p.amount || 0), 0).toFixed(2)}</span></p>
                             </div>
                         </div>
                     )}
                 </div>
                 
                 <div className="p-6 border-t border-gray-700 bg-gray-900">
                     <button onClick={finalizeTransaction} className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-900/50 flex items-center justify-center gap-2 transition transform active:scale-95">
                         <Icons.CheckCircle size={24} /> Confirm Payment
                     </button>
                 </div>
             </div>
          </div>
      )}

      {showSuccessModal && completedTransaction && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-md">
              <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full text-center border border-gray-700 shadow-2xl animate-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                      <Icons.Check size={40} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
                  <p className="text-gray-400 mb-8">Transaction has been recorded.</p>
                  <div className="space-y-3">
                      <button onClick={() => handlePrintReceipt(completedTransaction)} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Icons.Printer size={20}/> Print Receipt</button>
                      <button onClick={handleNewSale} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Icons.Plus size={20}/> New Sale</button>
                  </div>
              </div>
          </div>
      )}
      
      {isRecallModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-700 flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                      <h3 className="font-bold text-white">Recall Held Invoice</h3>
                      <button onClick={()=>setIsRecallModalOpen(false)}><Icons.Close className="text-gray-400"/></button>
                  </div>
                  <div className="flex-1 overflow-auto p-4 space-y-3">
                      {heldTransactions.length === 0 ? <p className="text-center text-gray-500">No held invoices.</p> : heldTransactions.map(t => (
                          <div key={t.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center border border-gray-600">
                              <div>
                                  <p className="font-bold text-white">{t.customerName || 'Unnamed'}</p>
                                  <p className="text-xs text-gray-400">{new Date(t.date).toLocaleTimeString()} • {t.items.length} items</p>
                              </div>
                              <div className="flex gap-3 items-center">
                                  <span className="font-bold text-blue-400">{settings.currency}{t.total.toFixed(2)}</span>
                                  <button onClick={()=>handleRecallInvoice(t)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-500">Recall</button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
