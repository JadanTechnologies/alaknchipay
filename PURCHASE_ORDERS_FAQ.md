# Purchase Order System - FAQs & Troubleshooting

## ❓ Frequently Asked Questions

### General Questions

**Q: Who can access the Purchase Orders feature?**
A: Only Super Admin users can create, edit, and manage purchase orders. Branch managers and cashiers cannot access this feature.

**Q: Where is the Purchases tab located?**
A: In the Super Admin sidebar, between "Global Inventory" and "Transactions".

**Q: Can I edit a purchase order after converting it?**
A: Yes, you can still edit it. However, the converted products in inventory are independent copies. Editing the purchase order won't affect already-converted inventory items.

**Q: What happens if I delete a purchase order?**
A: The order is removed from the system. If it was already converted, the products remain in inventory. If not converted, the order is permanently deleted (no undo).

**Q: Can I convert the same purchase order multiple times?**
A: No, once converted it shows "Converted" status and the button is replaced with a "Converted" label to prevent accidental duplicates.

---

### Costs & Calculations

**Q: How is the total cost calculated?**
A: `Total Cost = Subtotal + Shipping Expense`
Where `Subtotal = Sum of (Quantity × Cost Price) for all items`

**Q: What's included in "Shipping Expense"?**
A: All costs to bring goods to you:
- Actual shipping/freight charges
- Handling fees
- Customs/import duties
- Insurance
- Port fees
- Any other supplier-related transport costs

**Q: Why is a 30% markup applied automatically?**
A: This is the default profit margin. You can adjust individual product prices in the Global Inventory after conversion if needed.

**Q: How do I calculate my profit?**
A: `Profit = Selling Price - Cost Price`
Example: Item costs $10, sells for $13 → Profit = $3 per unit

**Q: Can I change the markup percentage?**
A: The system applies a fixed 30% markup during conversion. To change profit margins, edit individual products in Global Inventory after conversion.

---

### Purchase Order Management

**Q: What's the difference between the statuses?**
A: 
- **PENDING**: Order created, waiting for goods from supplier
- **RECEIVED**: Goods have arrived and are in your warehouse
- **CANCELLED**: Order was cancelled with supplier

**Q: Can I have both pending and received orders?**
A: Yes, orders can be in different statuses simultaneously.

**Q: What information do I need from my supplier?**
A: For each item:
- Serial number or product code (S/N)
- Item name/description
- Model number
- Quantity ordered
- Unit price/cost per item

Plus for the order:
- Total shipping cost to your location

**Q: Do I need to use Serial Numbers?**
A: Highly recommended. They help:
- Track items from specific suppliers
- Identify problems with specific batches
- Generate unique product SKUs
- Manage warranties

**Q: Can I add notes to a purchase order?**
A: Yes, there's a Notes field for:
- Supplier order numbers
- Payment terms
- Delivery dates
- Special instructions
- Quality notes

---

### Converting to Inventory

**Q: When should I convert to inventory?**
A: After:
1. Goods physically received in warehouse
2. Items counted and verified
3. Quality check passed
4. Status changed to "RECEIVED"

**Q: What happens during conversion?**
A: The system:
1. Creates a new product record for each item
2. Generates unique SKU: `PO-[OrderID]-[SerialNumber]`
3. Sets cost price to supplier cost
4. Sets selling price at 30% markup
5. Sets stock quantity to items ordered
6. Sets minimum alert to 20% of stock
7. Marks order as "Converted"

**Q: Can I convert to specific branch?**
A: Currently products are created in the global inventory. You can later assign to specific branches by editing the product.

**Q: What if I need different prices for different branches?**
A: After conversion, create separate products for each branch with adjusted prices in Global Inventory.

**Q: What if items have defects?**
A: Options:
1. Adjust stock quantity in Global Inventory
2. Contact supplier for replacement
3. Mark difference in purchase order notes

---

### Data & Storage

**Q: Where is the data stored?**
A: In your browser's localStorage. This means:
- ✅ Data survives page refresh
- ✅ Data persists across sessions
- ✅ Included in system backups
- ⚠️ Stays on this computer only
- ⚠️ Cleared if browser cache is cleared

**Q: Will I lose data if I clear browser cache?**
A: Yes. Regular backups prevent this:
1. Purchases tab → Export
2. Or use System Backup feature
3. Save file to safe location

**Q: Can I access purchase orders on a different computer?**
A: Only if you restore from a backup file.

**Q: Is my data encrypted?**
A: Currently no. For production use, consider:
1. Database backend instead of localStorage
2. SSL/HTTPS encryption
3. Backup encryption

**Q: How much storage space do purchase orders use?**
A: Approximately 0.5-2 KB per order depending on number of items.

---

### Troubleshooting

**Q: I can't see the Purchases tab**
A: 
- Ensure you're logged in as Super Admin
- Check browser console for errors (F12)
- Reload the page
- Try clearing browser cache and reload

**Q: The form won't submit**
A:
- Ensure at least 1 item is added
- Check all item fields are filled
- Verify numbers are valid (no text in qty/price)
- Check browser console for error messages

**Q: Items not appearing in the table**
A:
- Click "Add Item" button after filling fields
- Verify all fields have values
- Check for red error indicators
- Refresh page to reload data

**Q: Can't convert order to inventory**
A:
- Order must have status "RECEIVED"
- Order must have at least 1 item
- Try refreshing page if button doesn't work
- Check browser console for errors

**Q: Products not showing in Inventory after conversion**
A:
- Refresh Global Inventory tab
- Check filter settings (not filtering them out)
- Verify notification said "converted successfully"
- Check that order shows "Converted" status

**Q: Edit button doesn't open form**
A:
- Try clicking directly on order row first
- Refresh page and retry
- Check browser console (F12) for errors

**Q: Delete button not working**
A:
- Confirm deletion popup may not be visible
- Check if order is already converted (might be restricted)
- Try refreshing page and retrying

---

### Performance & Limits

**Q: How many purchase orders can I create?**
A: Theoretically unlimited, but:
- Browser storage limit: ~5-10 MB typically
- Estimated: 2,000-5,000 orders before storage issues
- Recommendation: Archive/backup old orders

**Q: Is the system slow with many orders?**
A: Generally no:
- <100 orders: No noticeable lag
- 100-1000 orders: Still responsive
- 1000+ orders: Consider database backend

**Q: Should I delete old purchase orders?**
A: Depends on needs:
- ✅ Keep for audit trail
- ✅ Back up before deleting
- ✅ Archive yearly
- ⚠️ Deletion is permanent (unless backed up)

---

### Integration Questions

**Q: How are purchase orders linked to products?**
A: Via auto-generated SKU:
```
SKU = PO-[PurchaseOrderID]-[SerialNumber]
```
This links the product back to its purchase source.

**Q: Can I track profit by purchase order?**
A: Yes, using the SKU:
1. Note the SKU of converted products
2. Search for those products in transactions
3. Calculate: Units sold × (Selling Price - Cost Price)

**Q: How do purchase costs affect financial reports?**
A: Currently:
- Purchase costs not separately tracked in reports
- Future: Add purchase cost analytics
- Workaround: Use notes/notes field in orders

**Q: Can I create bulk orders?**
A: Currently one order at a time. Future enhancement could add:
- CSV import
- Template orders
- Supplier order bundles

---

## 🐛 Common Issues & Solutions

### Issue: "Order not saving"
**Possible Causes:**
1. ❌ No items added
2. ❌ Incomplete item fields
3. ❌ Invalid data types (text in number fields)
4. ❌ Browser localStorage full

**Solutions:**
- ✅ Add at least one complete item
- ✅ Fill all required fields
- ✅ Use valid data (numbers for prices/quantities)
- ✅ Clear cache or use different browser

---

### Issue: "Can't find the Purchases menu"
**Possible Causes:**
1. ❌ Not logged in as Super Admin
2. ❌ Browser cache not updated
3. ❌ JavaScript not loaded properly

**Solutions:**
- ✅ Log out and log back in
- ✅ Clear browser cache (Ctrl+Shift+Delete)
- ✅ Refresh page (Ctrl+F5)
- ✅ Try different browser

---

### Issue: "Convert button missing"
**Possible Causes:**
1. ❌ Order status not set to "RECEIVED"
2. ❌ Order already converted
3. ❌ No items in order

**Solutions:**
- ✅ Edit order, change status to "RECEIVED"
- ✅ Use different order if this one already converted
- ✅ Add items to order and save

---

### Issue: "Products not appearing in inventory"
**Possible Causes:**
1. ❌ Conversion didn't complete
2. ❌ Products filtered out in Global Inventory
3. ❌ Page not refreshed after conversion

**Solutions:**
- ✅ Refresh Global Inventory page (F5)
- ✅ Remove any active filters
- ✅ Check if products with same name already exist
- ✅ Verify conversion notification appeared

---

### Issue: "Shipping cost not saving"
**Possible Causes:**
1. ❌ Not entered as a number
2. ❌ Field lost focus before saving
3. ❌ Browser localStorage issue

**Solutions:**
- ✅ Enter as number only (no currency symbol)
- ✅ Click another field after entering
- ✅ Click outside form to ensure focus out
- ✅ Clear browser cache and retry

---

### Issue: "Can't edit after converting"
**Possible Causes:**
1. ✅ This is by design to prevent accidents
2. ❌ Misunderstanding of feature

**Solutions:**
- ✅ Edit products directly in Global Inventory
- ✅ Create new purchase order if needed
- ✅ Keep order for historical reference

---

## 📞 Getting Help

### Before Asking for Help:
1. Check the documentation:
   - PURCHASE_ORDERS_README.md (full reference)
   - PURCHASE_ORDERS_QUICKSTART.md (quick guide)
   
2. Check this FAQ for your question

3. Try basic troubleshooting:
   - Refresh page (F5)
   - Clear browser cache
   - Log out and log back in
   - Try different browser

4. Check browser console (F12):
   - Look for error messages
   - Note any red text

### Reporting Issues:
Include:
- [ ] Steps you took
- [ ] What you expected to happen
- [ ] What actually happened
- [ ] Browser and OS version
- [ ] Error messages from console
- [ ] Screenshots if possible

---

## 📚 Related Resources

- **PURCHASE_ORDERS_README.md** - Complete feature documentation
- **PURCHASE_ORDERS_QUICKSTART.md** - Quick reference guide
- **PURCHASE_ORDERS_IMPLEMENTATION.md** - Technical implementation details
- **PURCHASE_ORDERS_ARCHITECTURE.md** - System architecture and data flow

---

**Last Updated**: December 2025  
**Version**: 1.0  
**Status**: Production Ready
