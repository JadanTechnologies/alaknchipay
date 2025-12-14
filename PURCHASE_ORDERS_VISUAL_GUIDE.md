# Purchase Order System - Visual Guide & Workflows

## 🎨 User Interface Layout

### Purchase Orders Screen
```
┌─────────────────────────────────────────────────────────────┐
│  SUPER ADMIN DASHBOARD > Purchases                          │
└─────────────────────────────────────────────────────────────┘

┌─ FILTER & CONTROLS ──────────────────────────────────────────┐
│                                                              │
│  [Status Filter ▼] [Clear Button] [+ New Purchase Order]   │
│   - All Orders                                               │
│   - Pending                                                  │
│   - Received                                                 │
│   - Cancelled                                                │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌─ PURCHASE ORDERS TABLE ──────────────────────────────────────┐
│                                                              │
│ Date      │ Items │ Total Cost │ Shipping │ Status  │Actions│
├───────────┼───────┼────────────┼──────────┼─────────┼───────┤
│ 12/14/25  │  2    │   ₦650     │  ₦150    │ PENDING │ ⚙️ 🗑️ │
│ 12/13/25  │  5    │  ₦1,500    │  ₦300    │ RECEIVED│ 🔄⚙️🗑️ │
│ 12/12/25  │  3    │   ₦900     │  ₦200    │RECEIVED │ ✓ ⚙️🗑️ │
│                                                              │
│  (empty rows for more orders...)                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌─ SUMMARY DASHBOARD ──────────────────────────────────────────┐
│                                                              │
│ Total Orders: 3  │  Total Cost: ₦3,050  │  Shipping: ₦650  │
│ Converted: 1     │                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Purchase Order Form
```
┌────────────────────────────────────────────────────────────────┐
│  Create New Purchase Order                                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  PURCHASE ORDER ITEMS                                         │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ S/N: [CASE-001]  Name: [iPhone Cases]  Model: [Universal]│ │
│  │ Qty: [50]  Cost: [₦10]  [Add Item]                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ITEMS TABLE                                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ S/N     │ Name          │ Qty │ Cost  │ Total  │Actions │ │
│  ├─────────┼───────────────┼─────┼───────┼────────┼────────┤ │
│  │CASE-001 │iPhone Cases   │ 50  │ ₦10   │ ₦500   │ ✎ ✕   │ │
│  │SCREEN001│Screen Protect │100  │ ₦2    │ ₦200   │ ✎ ✕   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ORDER DETAILS                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Subtotal (auto): ₦700                                    │ │
│  │ Shipping Expense: [₦300]                                 │ │
│  │ Total Cost (auto): ₦1,000                                │ │
│  │ Status: [PENDING ▼]                                      │ │
│  │ Notes: [_________________________________]               │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  [Cancel Button]           [Create Purchase Order Button]    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Workflow Diagrams

### Creating a Purchase Order
```
START
  │
  ├─► Click "+ New Purchase Order"
  │
  ├─► Form Opens
  │
  ├─► Add Item 1
  │   ├─ Serial Number: CASE-001
  │   ├─ Item Name: iPhone Cases
  │   ├─ Model: Universal
  │   ├─ Quantity: 50
  │   ├─ Cost Price: ₦10
  │   └─ Click "Add Item"
  │
  ├─► Add Item 2 (if needed)
  │   └─ Repeat process
  │
  ├─► Enter Shipping: ₦300
  │
  ├─► Select Status: PENDING
  │
  ├─► Click "Create Purchase Order"
  │
  ├─► System Calculates:
  │   ├─ Item 1 Total: 50 × ₦10 = ₦500
  │   ├─ Item 2 Total: 100 × ₦2 = ₦200
  │   ├─ Subtotal: ₦700
  │   └─ Total Cost: ₦700 + ₦300 = ₦1,000
  │
  ├─► ✅ Notification: "Purchase order created successfully"
  │
  └─► Order appears in list
```

### Converting to Inventory
```
PURCHASE ORDER (RECEIVED STATUS)
  │
  ├─► Check status = "RECEIVED"
  │
  ├─► Click "Convert" Button
  │
  ├─► System Creates Products:
  │   │
  │   ├─► Product 1 from Item 1
  │   │   ├─ Name: iPhone Cases
  │   │   ├─ SKU: PO-abc123def-CASE-001 (auto-generated)
  │   │   ├─ Cost Price: ₦10
  │   │   ├─ Selling Price: ₦13 (₦10 × 1.30)
  │   │   ├─ Stock: 50
  │   │   └─ Min Alert: 10 (50 × 0.20)
  │   │
  │   └─► Product 2 from Item 2
  │       ├─ Name: Screen Protector
  │       ├─ SKU: PO-abc123def-SCREEN-001 (auto-generated)
  │       ├─ Cost Price: ₦2
  │       ├─ Selling Price: ₦2.60 (₦2 × 1.30)
  │       ├─ Stock: 100
  │       └─ Min Alert: 20 (100 × 0.20)
  │
  ├─► Update Order:
  │   ├─ convertedToInventory = true
  │   └─ convertedAt = timestamp
  │
  ├─► ✅ Notification: "Purchase order converted. 2 product(s) added"
  │
  └─► Items now in Global Inventory
```

### Selling Converted Items
```
PRODUCT IN INVENTORY
  │
  ├─► Cashier creates transaction
  │
  ├─► Searches for product by SKU: PO-abc123def-CASE-001
  │
  ├─► Adds to cart
  │   ├─ Quantity: 10
  │   ├─ Price: ₦13 (auto-filled)
  │   └─ Total: ₦130
  │
  ├─► Customer pays ₦130
  │
  ├─► ✅ Sale complete
  │
  ├─► System calculates profit:
  │   ├─ Revenue: ₦130
  │   ├─ Cost: ₦10 × 10 = ₦100
  │   └─ Profit: ₦30
  │
  └─► Stock reduced by 10
      └─ Alert triggers if stock < 10 (minimum alert)
```

---

## 📊 Cost Calculation Examples

### Example 1: Simple Order
```
┌─────────────────────────────┐
│ PURCHASE ORDER              │
├─────────────────────────────┤
│                             │
│ Item 1: Cables              │
│   Qty: 100                  │
│   Cost: ₦50 each            │
│   Total: ₦5,000             │
│                             │
│ Shipping: ₦1,000            │
│ ─────────────────           │
│ TOTAL: ₦6,000               │
│                             │
└─────────────────────────────┘

AFTER CONVERSION:
  Product: Cables
  Cost Price: ₦50
  Selling Price: ₦65 (₦50 × 1.30)
  Stock: 100
  Profit Potential: ₦15 × 100 = ₦1,500
```

### Example 2: Multi-Item Order
```
┌──────────────────────────────────────┐
│ PURCHASE ORDER                       │
├──────────────────────────────────────┤
│                                      │
│ Item 1: Cases (50 @ ₦8)      ₦400   │
│ Item 2: Protectors (100 @ ₦2) ₦200  │
│ Item 3: Chargers (25 @ ₦15)  ₦375   │
│ ────────────────────────────         │
│ Subtotal:                    ₦975   │
│ Shipping (from China):       ₦300   │
│ ────────────────────────────         │
│ TOTAL COST:                  ₦1,275 │
│                                      │
└──────────────────────────────────────┘

CONVERSION CREATES 3 PRODUCTS:
  ├─ Cases
  │   Cost: ₦8 → Sell: ₦10.40 → Profit: ₦2.40 × 50 = ₦120
  ├─ Protectors
  │   Cost: ₦2 → Sell: ₦2.60 → Profit: ₦0.60 × 100 = ₦60
  └─ Chargers
      Cost: ₦15 → Sell: ₦19.50 → Profit: ₦4.50 × 25 = ₦112.50

TOTAL PROFIT POTENTIAL: ₦292.50 (if all sold)
```

---

## 🎯 User Journeys

### Journey 1: First-Time User
```
Day 1:
├─ Login as Super Admin
├─ Navigate to Purchases tab
├─ Read quick start guide (1 min)
├─ Create test order (5 min)
├─ Add sample items (3 min)
├─ Submit order (1 min)
└─ ✅ First order created

Day 2:
├─ Review order in list
├─ Edit order status to RECEIVED
├─ Click Convert button
├─ See products in inventory (1 min)
├─ Adjust prices if needed (2 min)
└─ ✅ Ready to sell
```

### Journey 2: Regular Supplier Order
```
Monday:
├─ Supplier sends invoice
├─ Create new purchase order
├─ Add all items from invoice (15 min)
├─ Enter total shipping cost
├─ Save order as PENDING
└─ ✅ Order logged

Friday:
├─ Goods arrive from supplier
├─ Count and verify items
├─ Update order status to RECEIVED
├─ Click Convert to Inventory
└─ ✅ Items ready for sale

Saturday-Sunday:
├─ Sell converted items
├─ Track profits
└─ ✅ Revenue generated
```

### Journey 3: Monthly Reconciliation
```
End of Month:
├─ Filter all RECEIVED orders
├─ Sum total cost: ₦50,000
├─ Sum total shipping: ₦5,000
├─ Count converted items: 200 items
├─ Filter Global Inventory for converted items
├─ Calculate total sold
├─ Calculate total profit
└─ ✅ Financial reports ready
```

---

## 💡 Action Buttons & Icons

```
┌─────────────────────────────────────────────┐
│  BUTTON GUIDE                               │
├─────────────────────────────────────────────┤
│                                             │
│ [+ New Purchase Order]                      │
│  └─ Creates new order                       │
│                                             │
│ [Status Filter ▼]                           │
│  └─ Filter by status                        │
│                                             │
│ [Clear]                                     │
│  └─ Reset filters                           │
│                                             │
│ 🔄 Convert                                  │
│  └─ Convert order to inventory              │
│     (only if status = RECEIVED)             │
│                                             │
│ ⚙️ Edit (Settings icon)                     │
│  └─ Opens form to edit order                │
│                                             │
│ 🗑️ Delete                                   │
│  └─ Removes order permanently               │
│                                             │
│ ✓ Converted                                 │
│  └─ Shows order already converted           │
│                                             │
│ [Add Item]                                  │
│  └─ Adds item to form                       │
│                                             │
│ [Update Item]                               │
│  └─ Saves edited item                       │
│                                             │
│ ✎ (Edit in table)                          │
│  └─ Edit item in list                       │
│                                             │
│ ✕ (Delete in table)                        │
│  └─ Remove item from order                  │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎓 Data Flow Summary

```
INPUT (User)
    ↓
FORM VALIDATION
    ↓
CALCULATIONS
    ├─ Item Total = Qty × Cost
    ├─ Subtotal = Sum of items
    └─ Total = Subtotal + Shipping
    ↓
SAVE TO STORAGE
    ├─ Create/Update order
    └─ localStorage.setItem()
    ↓
UPDATE UI
    ├─ Refresh table
    ├─ Update summary
    └─ Show notification
    ↓
CONVERSION (Optional)
    ├─ Generate SKU
    ├─ Create products
    ├─ Apply markup
    └─ Add to inventory
    ↓
OUTPUT (Ready for Sale)
    └─ Items available to sell
```

---

## 🔍 Status Progression

```
PENDING (Created)
  ├─ Order created but goods not received
  ├─ Can edit all fields
  ├─ Cannot convert yet
  │
  ↓ (Goods arrive)
  │
RECEIVED (Confirmed)
  ├─ Order received and verified
  ├─ Can still edit
  ├─ CAN NOW CONVERT ✅
  │
  ↓ (Click Convert)
  │
CONVERTED TO INVENTORY ✓
  ├─ Products created
  ├─ Available for sale
  ├─ Cannot re-convert
  ├─ Can still edit order
  │
  └─ FINAL STATE
```

---

## 📱 Mobile Responsive Design

### Mobile View (Phone)
```
┌─────────────────────────────┐
│  Purchases                  │
├─────────────────────────────┤
│  [Filter ▼] [+ New Order]   │
│                             │
│  Order #1                   │
│  ├─ Date: 12/14/25          │
│  ├─ Items: 2                │
│  ├─ Cost: ₦650              │
│  ├─ Status: PENDING         │
│  └─ [Convert] [Edit] [Del]  │
│                             │
│  Order #2                   │
│  ├─ Date: 12/13/25          │
│  ├─ Items: 5                │
│  ├─ Cost: ₦1,500            │
│  ├─ Status: RECEIVED        │
│  └─ [Convert] [Edit] [Del]  │
│                             │
│  ─────────────────────────  │
│  Orders: 2  Cost: ₦2,150    │
│                             │
└─────────────────────────────┘
```

---

## 🎉 Complete Visual Reference

This guide shows:
- ✅ UI layouts
- ✅ Workflows
- ✅ Data flows
- ✅ Cost calculations
- ✅ User journeys
- ✅ Button functions
- ✅ Status progression
- ✅ Mobile design

**Use with PURCHASE_ORDERS_QUICKSTART.md for complete understanding.**

---

**Visual Guide Version**: 1.0  
**Updated**: December 2025  
**Status**: Complete
