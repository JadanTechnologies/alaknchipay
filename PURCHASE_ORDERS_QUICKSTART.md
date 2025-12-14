# Purchase Order Management - Quick Start Guide

## 📍 Where to Find It

In the **Super Admin Dashboard**, look for the **Purchases** menu item in the left sidebar, positioned between:
- Global Inventory ↑
- **Purchases** ← You are here
- Transactions ↓

## 🎯 Main Actions

### 1️⃣ Create New Purchase Order
**Button**: `+ New Purchase Order` (top right)

**Process**:
```
Click Button → Fill Item Details → Add Items → Enter Shipping Cost → Submit
```

**Item Fields**:
- Serial Number (S/N) - Unique ID for tracking
- Item Name - What you're buying (e.g., "iPhone Case")
- Model Number - Supplier's model code (e.g., "CASE-001")
- Quantity - How many units
- Cost Price - Price per unit from supplier

**Order Fields**:
- Shipping Expense - Total cost to ship from supplier
- Status - PENDING / RECEIVED / CANCELLED
- Notes - Optional comments

### 2️⃣ View Purchase Orders
All your purchase orders display in a table showing:
- **Date**: When order was created
- **Items**: How many different items
- **Total Cost**: Subtotal + Shipping
- **Shipping**: Transport cost
- **Status**: Current state
- **Created By**: Which admin created it

### 3️⃣ Filter Purchase Orders
**Dropdown**: Sort by status
- `All Orders` - Show everything
- `Pending` - Waiting to receive
- `Received` - Items arrived
- `Cancelled` - Cancelled orders

### 4️⃣ Convert to Inventory
**Button**: `Convert` (on each order row)

⚠️ **Requirements**:
- Order status must be "RECEIVED"
- Order must have at least 1 item
- Only converts once

**What Happens**:
- Creates new products in inventory
- Generates SKU automatically
- Sets 30% markup on selling price
- Marks order as "Converted"
- Items ready for sale

### 5️⃣ Edit Purchase Order
**Button**: ⚙️ (settings icon on order row)

Opens the same form to modify:
- Items
- Quantities
- Prices
- Shipping expense
- Status
- Notes

### 6️⃣ Delete Purchase Order
**Button**: 🗑️ (delete icon on order row)

Removes the order from system.

## 📊 Dashboard Summary

Bottom of the screen shows quick stats:
```
┌─────────────┬──────────┬─────────────┬──────────────────┐
│ Total       │ Total    │ Shipping    │ Converted to     │
│ Orders      │ Cost     │ Expense     │ Inventory        │
├─────────────┼──────────┼─────────────┼──────────────────┤
│ 5           │ ₦25,000  │ ₦2,000      │ 3                │
└─────────────┴──────────┴─────────────┴──────────────────┘
```

## 💰 Cost Calculation Example

**You buy from China:**

```
┌─ Item 1: Phone Cases ─────────────┐
│ Quantity: 50 units                │
│ Cost Price: $10 per unit          │
│ Total: 50 × $10 = $500            │
└───────────────────────────────────┘

┌─ Item 2: Screen Protectors ───────┐
│ Quantity: 100 units               │
│ Cost Price: $2 per unit           │
│ Total: 100 × $2 = $200            │
└───────────────────────────────────┘

    Subtotal (Item 1 + Item 2): $700
    Shipping from China: $150
    ───────────────────────────────
    TOTAL COST: $850
```

## 🔄 Inventory Conversion Example

After marking as "RECEIVED" and clicking "Convert":

```
BEFORE (Purchase Order):
├─ Item 1: Phone Cases (50 units @ $10 cost)
└─ Item 2: Protectors (100 units @ $2 cost)

AFTER (In Inventory):
├─ Product: Phone Cases
│  ├─ SKU: PO-abc123def-CASE01
│  ├─ Cost Price: $10
│  ├─ Selling Price: $13 (30% markup)
│  ├─ Stock: 50
│  └─ Min Alert: 10 (20% of stock)
│
└─ Product: Screen Protectors
   ├─ SKU: PO-abc123def-SCREEN01
   ├─ Cost Price: $2
   ├─ Selling Price: $2.60 (30% markup)
   ├─ Stock: 100
   └─ Min Alert: 20 (20% of stock)
```

## 🛠️ Form Usage Tips

### Adding Items
1. Fill all item fields
2. Click `Add Item` button
3. Item appears in table below
4. Add more items by repeating
5. Edit items: Click edit icon → Update item
6. Delete items: Click delete icon

### Item Table Shows
| S/N | Item Name | Model | Qty | Unit Cost | Total Cost | Actions |
|-----|-----------|-------|-----|-----------|-----------|---------|
| CASE-001 | Phone Cases | Universal | 50 | $10 | $500 | ✎ ✕ |

### Automatic Calculations
```
Total Cost Price = Quantity × Unit Cost Price
Subtotal = Sum of all Total Cost Prices
Total Order Cost = Subtotal + Shipping Expense
```

## ⚠️ Important Notes

### Can Only Convert Once
Once converted to inventory, that button disappears and shows "Converted"

### Status Meanings
- **PENDING** 🟡 - Waiting for goods to arrive
- **RECEIVED** 🟢 - Goods have arrived
- **CANCELLED** 🔴 - Order cancelled

### Auto-Generated Selling Price
- Default markup: **30%** of cost price
- Can be adjusted manually in inventory after conversion
- Example: Cost $10 → Default Price $13

### Data Storage
- All purchase orders saved in browser storage
- Survives page refresh
- Included in system backups
- One purchase order per form submission

## 📝 Common Workflows

### Workflow 1: Buying from Supplier
```
1. Click "New Purchase Order"
2. Add all items from purchase invoice
3. Enter shipping cost
4. Set status to "PENDING"
5. Click "Create Purchase Order"
6. Receive notification: "✓ Purchase order created"
```

### Workflow 2: Receiving Goods
```
1. Items arrive from supplier
2. Find order in Purchases tab
3. Click settings (⚙️) to edit
4. Change status to "RECEIVED"
5. Click update
6. Stock goods in warehouse
```

### Workflow 3: Adding to Inventory
```
1. Goods confirmed and stored
2. Click "Convert" on order
3. System creates product entries
4. Notification: "✓ Purchase order converted. 10 product(s) added"
5. Items now available in Global Inventory for sales
```

### Workflow 4: Selling Purchased Items
```
1. Go to "Transactions" or "Cashier" tab
2. Search for products (created from purchases)
3. Add to transaction
4. Customers purchase at selling price
5. Profit = Selling Price - Cost Price
```

## ✅ Checklist Before Converting

- [ ] Purchase order status is "RECEIVED"
- [ ] All items have serial numbers
- [ ] Quantities are correct
- [ ] Cost prices match supplier invoice
- [ ] Shipping expense is recorded
- [ ] Items are physically in warehouse

## 🚀 Next Steps

After conversion, the items:
- ✅ Appear in **Global Inventory** tab
- ✅ Can be sold in **Transactions**
- ✅ Are tracked in **Activity Logs**
- ✅ Show in financial **Reports**
- ✅ Are included in **Backup/Restore**

---

**Need Help?** Check the full documentation in `PURCHASE_ORDERS_README.md`
