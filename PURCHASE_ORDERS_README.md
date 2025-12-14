# Purchase Order Management System

## Overview

The Purchase Order Management System allows Super Admins to manage purchases from suppliers (e.g., from China or other sources). This system enables tracking of imported items with detailed cost breakdown and automatic conversion to inventory.

## Features

### 1. **Create Purchase Orders**
- Add items with the following details:
  - **Serial Number (S/N)**: Unique identifier for each item
  - **Item Name**: Description of the product
  - **Model Number**: Product model for reference
  - **Quantity**: Number of units purchased
  - **Cost Price**: Cost per unit from supplier

### 2. **Cost Tracking**
- **Subtotal**: Automatic calculation of all items' costs
- **Shipping Expense**: Track costs for shipping/transport from supplier (e.g., from China)
- **Total Cost**: Automatic sum of subtotal + shipping expense

### 3. **Order Status Management**
Purchase orders can have the following statuses:
- **PENDING**: Order created, awaiting receipt
- **RECEIVED**: Items have been received
- **CANCELLED**: Order was cancelled

### 4. **Convert to Inventory**
Once items are received, Super Admin can:
- Convert purchase order items to product inventory
- Automatic SKU generation (based on purchase order ID and serial number)
- Default selling price calculation (30% markup on cost price)
- Minimum stock alert set to 20% of quantity

### 5. **Purchase Order Management**
- View all purchase orders with filtering by status
- Edit existing orders
- Delete orders (soft delete)
- Track conversion status to inventory
- View purchase order summary with:
  - Total number of orders
  - Total cost across all orders
  - Total shipping expenses
  - Number of converted orders

## User Interface

### Navigation
The **Purchases** tab is available in the Super Admin sidebar, positioned between:
- Global Inventory
- Transactions

### Main Purchase Orders Screen

#### Top Controls
- **Status Filter**: Filter orders by PENDING, RECEIVED, CANCELLED, or ALL
- **Clear Button**: Reset filters
- **New Purchase Order Button**: Create a new purchase order

#### Purchase Orders Table
Displays:
| Column | Description |
|--------|-------------|
| Date | When the order was created |
| Items | Number of items in the order |
| Total Cost | Final cost (subtotal + shipping) |
| Shipping | Shipping/transport expense |
| Status | Current order status |
| Created By | Name of Super Admin who created it |
| Actions | Edit, Convert to Inventory, or Delete |

#### Summary Section (Bottom)
Shows key metrics:
- **Total Orders**: Count of all orders in current filter
- **Total Cost**: Sum of all order costs
- **Shipping Expense**: Sum of all shipping costs
- **Converted to Inventory**: Count of orders already converted

## Creating a Purchase Order

### Step 1: Open Form
Click **New Purchase Order** button

### Step 2: Add Items
For each item:
1. Enter **Serial Number**
2. Enter **Item Name**
3. Enter **Model Number**
4. Enter **Quantity**
5. Enter **Cost Price** (per unit)
6. Click **Add Item** button

The system automatically calculates:
- `Total Cost Price = Quantity × Cost Price`

### Step 3: Add Order Expenses
- **Shipping Expense**: Enter total shipping cost from supplier
- The system automatically calculates:
  - `Subtotal = Sum of all items' total cost prices`
  - `Total Cost = Subtotal + Shipping Expense`

### Step 4: Set Status & Notes (Optional)
- Select order **Status** (PENDING, RECEIVED, or CANCELLED)
- Add optional **Notes** for reference

### Step 5: Submit
Click **Create Purchase Order** to save

## Converting to Inventory

### Process
1. Ensure order status is **RECEIVED**
2. Click **Convert** button on the purchase order row
3. System will:
   - Create product records for each item
   - Generate SKU: `PO-[OrderID]-[SerialNumber]`
   - Set selling price to 30% markup
   - Set minimum stock alert to 20% of quantity
   - Mark order as converted

### Result
- Items appear in **Global Inventory**
- Order shows "Converted" status
- Can no longer be converted again

## Data Storage

All purchase orders are stored in browser localStorage under the key:
- `alkanchipay_purchase_orders`

Backup and restore functionality includes purchase orders automatically.

## Cost Calculation Example

```
Item 1: iPhone 13 (Model: A2631)
  Quantity: 5
  Cost Price: $600 per unit
  Total: 5 × $600 = $3,000

Item 2: Screen Protector (Model: SP-001)
  Quantity: 100
  Cost Price: $2 per unit
  Total: 100 × $2 = $200

Subtotal: $3,200
Shipping Expense: $500 (delivery from China)
─────────────────
Total Cost: $3,700
```

## Converting to Inventory Example

The purchase order above will create:

**Product 1:**
- Name: iPhone 13
- SKU: PO-[ORDER-ID]-A2631
- Cost Price: $600
- Selling Price: $780 (30% markup)
- Stock: 5 units
- Min Alert: 1 unit

**Product 2:**
- Name: Screen Protector
- SKU: PO-[ORDER-ID]-SP-001
- Cost Price: $2
- Selling Price: $2.60 (30% markup)
- Stock: 100 units
- Min Alert: 20 units

## Related Features

- **Global Inventory**: View all products including those converted from purchases
- **Transactions**: Process sales of purchased items
- **Activity Logs**: Track all purchase order actions
- **Data Backup**: Purchase orders included in system backup/restore

## Permissions

Currently available to:
- **SUPER_ADMIN**: Full access to create, edit, delete, and convert purchase orders

## Troubleshooting

### Order not saving?
- Ensure at least one item is added
- Check all required fields are filled
- Check browser console for errors

### Can't convert to inventory?
- Ensure order status is RECEIVED
- Check if order is already converted (marked as "Converted")
- Ensure at least 1 item in the order

### Data disappeared?
- Check if localStorage is enabled in browser
- Try creating a backup and restoring
- Check browser's storage quota

## Future Enhancements

Potential improvements:
1. Multiple supplier tracking
2. Purchase order approval workflow
3. Receiving inspection checklist
4. Supplier ratings and performance metrics
5. Historical price tracking
6. Purchase order templates for bulk items
7. CSV import for bulk order creation
8. Email notifications for order status changes
