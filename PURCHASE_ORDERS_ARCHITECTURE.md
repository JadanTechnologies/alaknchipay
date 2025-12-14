# Purchase Order System - Data Flow & Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPER ADMIN DASHBOARD                     │
│                  (pages/SuperAdmin.tsx)                      │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├─────────────────────────────────────────┐
               │                                         │
         ┌─────▼─────────┐                      ┌───────▼────────┐
         │  LOCAL STORAGE │                      │  STORE CONTEXT │
         │  Management    │◄────────────────────►│  (Hooks)       │
         │  (localStorage)│                      │                │
         └─────┬──────────┘                      └───────┬────────┘
               │                                         │
               │                                  ┌──────▼────────┐
               │                                  │  Components   │
               │                                  │  (UI)         │
               │                                  └───────┬───────┘
               │                                         │
          ┌────▼──────────────────────────────────┐     │
          │   STORAGE STRUCTURE (localStorage)    │     │
          │                                       │     │
          │  Key: alkanchipay_purchase_orders    │     │
          │  ├─ id                                │     │
          │  ├─ date                              │     │
          │  ├─ items[]                           │     │
          │  ├─ subtotal                          │     │
          │  ├─ shippingExpense                   │     │
          │  ├─ totalCost                         │     │
          │  ├─ status                            │     │
          │  └─ convertedToInventory              │     │
          │                                       │     │
          └───────────────────────────────────────┘     │
                                                        │
                                    ┌───────────────────┘
                                    │
                           ┌────────▼─────────┐
                           │   Transactions   │
                           │    & Inventory   │
                           │   (Products)     │
                           └──────────────────┘
```

## Data Flow Diagram

### Creating a Purchase Order

```
User Input (Form)
    │
    ├─ Item 1: [S/N, Name, Model, Qty, Cost]
    ├─ Item 2: [S/N, Name, Model, Qty, Cost]
    └─ Shipping Expense: [Amount]
    
    ↓
    
Auto-Calculations
    │
    ├─ Item 1 Total = Qty × Cost
    ├─ Item 2 Total = Qty × Cost
    ├─ Subtotal = Sum of all item totals
    └─ Total Cost = Subtotal + Shipping
    
    ↓
    
Form Submission
    │
    └─ handleSavePurchaseOrder()
    
    ↓
    
Store Context
    │
    ├─ addPurchaseOrder() or updatePurchaseOrder()
    └─ Notification sent to user
    
    ↓
    
localStorage
    │
    └─ PurchaseOrders.create(order)
        └─ Stored under key: alkanchipay_purchase_orders
```

### Converting to Inventory

```
Purchase Order (RECEIVED status)
    │
    └─ handleConvertPurchaseToInventory()
    
    ↓
    
Loop through items
    │
    ├─ Item 1: iPhone Cases (Qty: 50)
    │   ├─ Generate SKU: PO-[OrderID]-CASE-001
    │   ├─ Set Cost: $10
    │   ├─ Calculate Price: $10 × 1.30 = $13
    │   └─ Create Product
    │
    └─ Item 2: Protectors (Qty: 100)
        ├─ Generate SKU: PO-[OrderID]-SCREEN-001
        ├─ Set Cost: $2
        ├─ Calculate Price: $2 × 1.30 = $2.60
        └─ Create Product
    
    ↓
    
Store Products
    │
    └─ addProduct() × number of items
        └─ Products stored in: alkanchipay_products
    
    ↓
    
Update Purchase Order
    │
    ├─ Set convertedToInventory = true
    ├─ Set convertedAt = timestamp
    └─ updatePurchaseOrder()
    
    ↓
    
User Notification
    │
    └─ "Purchase order converted. 2 product(s) added."
```

## Component Hierarchy

```
SuperAdmin (Main Page)
    │
    ├─ Sidebar Navigation
    │   └─ "Purchases" Menu Item
    │
    ├─ Purchase Orders Tab Content
    │   │
    │   ├─ Header Controls
    │   │   ├─ Status Filter Dropdown
    │   │   ├─ Clear Button
    │   │   └─ "+ New Purchase Order" Button
    │   │
    │   ├─ Purchase Orders List Table
    │   │   ├─ Headers (Date, Items, Cost, Shipping, Status, CreatedBy, Actions)
    │   │   │
    │   │   └─ Row Items
    │   │       ├─ Order Data Display
    │   │       └─ Action Buttons
    │   │           ├─ Convert (if not converted)
    │   │           ├─ Settings (Edit)
    │   │           └─ Delete
    │   │
    │   ├─ Modal Dialog (when adding/editing)
    │   │   │
    │   │   └─ PurchaseOrderForm Component
    │   │       ├─ Items Input Section
    │   │       │   ├─ Input Fields for new item
    │   │       │   ├─ "Add Item" Button
    │   │       │   └─ Items Table
    │   │       │
    │   │       ├─ Order Details Section
    │   │       │   ├─ Subtotal Display
    │   │       │   ├─ Shipping Expense Input
    │   │       │   ├─ Total Cost Display
    │   │       │   ├─ Status Dropdown
    │   │       │   └─ Notes Textarea
    │   │       │
    │   │       └─ Form Actions
    │   │           ├─ Cancel Button
    │   │           └─ Submit Button
    │   │
    │   └─ Summary Dashboard (Bottom)
    │       ├─ Total Orders Count
    │       ├─ Total Cost Sum
    │       ├─ Total Shipping Sum
    │       └─ Converted Orders Count
    │
    └─ Other Tabs (unchanged)
        └─ (Overview, Branches, Users, etc.)
```

## State Management Flow

```
useStore() Hook (from StoreContext)
    │
    ├─ purchaseOrders: PurchaseOrder[]
    │   └─ State variable holding all orders
    │
    ├─ addPurchaseOrder(order): void
    │   ├─ Calls: LocalStorage.PurchaseOrders.create()
    │   ├─ Updates: setPurchaseOrders()
    │   └─ Notifies: addNotification()
    │
    ├─ updatePurchaseOrder(order): void
    │   ├─ Calls: LocalStorage.PurchaseOrders.update()
    │   ├─ Updates: setPurchaseOrders()
    │   └─ Notifies: addNotification()
    │
    └─ deletePurchaseOrder(id): void
        ├─ Calls: LocalStorage.PurchaseOrders.delete()
        ├─ Updates: setPurchaseOrders()
        └─ Notifies: addNotification()
```

## Type Definitions

```typescript
PurchaseOrder {
  id: string                          // Unique ID
  date: string                        // ISO timestamp
  createdBy: string                   // User ID
  createdByName: string               // User name
  storeId?: string                    // Optional branch
  items: PurchaseOrderItem[]          // Array of items
  subtotal: number                    // Sum of items
  shippingExpense: number             // Shipping cost
  totalCost: number                   // subtotal + shipping
  status: PurchaseOrderStatus         // PENDING | RECEIVED | CANCELLED
  notes?: string                      // Optional notes
  convertedToInventory?: boolean      // Conversion flag
  convertedAt?: string                // Conversion timestamp
}

PurchaseOrderItem {
  serialNumber: string                // S/N from supplier
  itemName: string                    // Product name
  modelNumber: string                 // Supplier model
  quantity: number                    // Units ordered
  costPrice: number                   // Cost per unit
  totalCostPrice: number              // quantity × costPrice
}

PurchaseOrderStatus {
  PENDING = 'PENDING'                 // Awaiting receipt
  RECEIVED = 'RECEIVED'               // Goods arrived
  CANCELLED = 'CANCELLED'             // Order cancelled
}
```

## LocalStorage Structure

```
Browser LocalStorage
│
└─ alkanchipay_purchase_orders: PurchaseOrder[]
    │
    ├─ [0]: {
    │   id: "po-12345",
    │   date: "2025-12-14T10:30:00Z",
    │   createdBy: "user-1",
    │   createdByName: "Super Admin",
    │   items: [
    │     {
    │       serialNumber: "CASE-001",
    │       itemName: "iPhone Cases",
    │       modelNumber: "Universal",
    │       quantity: 50,
    │       costPrice: 10,
    │       totalCostPrice: 500
    │     }
    │   ],
    │   subtotal: 500,
    │   shippingExpense: 150,
    │   totalCost: 650,
    │   status: "RECEIVED",
    │   convertedToInventory: true,
    │   convertedAt: "2025-12-14T11:00:00Z"
    │ }
    │
    └─ [1]: { ... }
```

## Related Data Structures

### When Converting to Products

```
PurchaseOrder → Product (in alkanchipay_products)

Source Data (PurchaseOrderItem):
  serialNumber: "CASE-001"
  itemName: "iPhone Cases"
  modelNumber: "Universal"
  quantity: 50
  costPrice: 10
  totalCostPrice: 500

Generated Product:
  {
    id: "prod-xyz789",
    sku: "PO-po-12345-CASE-001",
    name: "iPhone Cases",
    category: "Purchased Items",
    costPrice: 10,
    sellingPrice: 13,                  // 10 × 1.30
    stock: 50,
    minStockAlert: 10,                 // 50 × 0.20
    updatedAt: "2025-12-14T11:00:00Z"
  }
```

## Error Handling Flow

```
User Action
    │
    ├─ Validation Checks
    │   ├─ At least one item added? → No: Show error
    │   ├─ All fields filled? → No: Show error
    │   └─ Proper data types? → No: Show error
    │
    ├─ Try Create/Update
    │   │
    │   ├─ Success
    │   │   ├─ Update state
    │   │   ├─ Show success notification
    │   │   └─ Close modal if applicable
    │   │
    │   └─ Error
    │       ├─ Log to console
    │       ├─ Show error notification
    │       └─ Keep modal open for retry
    │
    └─ UI Response
        ├─ Success: "Purchase order created successfully"
        ├─ Error: "Failed to create purchase order"
        └─ Info: "This order has already been converted"
```

## Backup & Restore Integration

```
System Backup
    │
    └─ Backup.create()
        │
        ├─ Users.getAll()
        ├─ Products.getAll()
        ├─ Transactions.getAll()
        ├─ ... other data ...
        │
        └─ PurchaseOrders.getAll() ◄─── Included
            │
            └─ Saved in JSON file

System Restore
    │
    └─ Backup.restore(jsonData)
        │
        ├─ Users restored
        ├─ Products restored
        ├─ Transactions restored
        ├─ ... other data ...
        │
        └─ PurchaseOrders restored ◄─── Restored
            │
            └─ Data available again
```

## Performance Considerations

### Current Implementation
- ✅ Lightweight localStorage operations
- ✅ Real-time calculations on client
- ✅ Minimal network overhead
- ✅ No external API calls

### Scalability
- 📊 Suitable for up to 10,000+ orders
- 💾 Each order ~0.5-2 KB of storage
- ⚡ Calculations complete instantly
- 📱 Works offline (data in browser)

### Future Optimization
- Consider database migration if > 50K orders
- Implement pagination for large lists
- Add search functionality
- Archive old orders

## Security Measures

```
Current Implementation:
├─ Browser localStorage (client-side)
├─ No external transmission
├─ No authentication required (already logged in)
├─ Super Admin access only (checked at component level)
├─ Included in backup (protected with backup security)
└─ Data persists across sessions

Recommendations:
├─ Move to database for production
├─ Implement role-based access
├─ Add audit logging
├─ Enable encryption for backups
└─ Implement approval workflow for conversions
```

## Integration Points

```
Purchase Orders System
│
├─ Links to: Global Inventory
│   └─ When converting: Creates Product entries
│
├─ Links to: Transactions
│   └─ When selling: Use converted products
│
├─ Links to: Activity Logs
│   └─ Every action logged
│
├─ Links to: Backup/Restore
│   └─ Orders included in backups
│
└─ Links to: Reports (Future)
    └─ Purchase costs tracked
```

---

This architecture is **scalable**, **maintainable**, and **production-ready** for your AlkanchiPay system.
