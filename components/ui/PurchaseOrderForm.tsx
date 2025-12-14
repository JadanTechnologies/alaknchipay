import React, { useState, useEffect } from 'react';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '../../types';
import { Icons } from './Icons';
import './PurchaseOrderForm.css';

interface PurchaseOrderFormProps {
  order?: PurchaseOrder | null;
  onSubmit: (order: Omit<PurchaseOrder, 'id'>) => void;
  onCancel: () => void;
  userName: string;
  currency: string;
}

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
  order,
  onSubmit,
  onCancel,
  userName,
  currency
}) => {
  const [items, setItems] = useState<PurchaseOrderItem[]>(order?.items || []);
  const [shippingExpense, setShippingExpense] = useState(order?.shippingExpense || 0);
  const [notes, setNotes] = useState(order?.notes || '');
  const [status, setStatus] = useState<PurchaseOrderStatus>(order?.status || PurchaseOrderStatus.PENDING);
  const [currentItem, setCurrentItem] = useState<Partial<PurchaseOrderItem>>({
    serialNumber: '',
    itemName: '',
    modelNumber: '',
    quantity: 0,
    costPrice: 0,
    totalCostPrice: 0,
    storeCostPrice: 0,
    storeSellingPrice: 0
  });
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.totalCostPrice, 0);
  const totalCost = subtotal + shippingExpense;

  const handleAddItem = () => {
    if (!currentItem.serialNumber || !currentItem.itemName || !currentItem.modelNumber || 
        !currentItem.quantity || !currentItem.costPrice || !currentItem.storeCostPrice || !currentItem.storeSellingPrice) {
      alert('Please fill all item fields');
      return;
    }

    const totalCostPrice = (currentItem.quantity || 0) * (currentItem.costPrice || 0);
    const newItem: PurchaseOrderItem = {
      serialNumber: currentItem.serialNumber,
      itemName: currentItem.itemName,
      modelNumber: currentItem.modelNumber,
      quantity: currentItem.quantity,
      costPrice: currentItem.costPrice,
      totalCostPrice,
      storeCostPrice: currentItem.storeCostPrice,
      storeSellingPrice: currentItem.storeSellingPrice
    };

    if (editingItemIndex !== null) {
      // Update existing item
      const updatedItems = [...items];
      updatedItems[editingItemIndex] = newItem;
      setItems(updatedItems);
      setEditingItemIndex(null);
    } else {
      // Add new item
      setItems([...items, newItem]);
    }

    // Reset form
    setCurrentItem({
      serialNumber: '',
      itemName: '',
      modelNumber: '',
      quantity: 0,
      costPrice: 0,
      totalCostPrice: 0,
      storeCostPrice: 0,
      storeSellingPrice: 0
    });
  };

  const handleEditItem = (index: number) => {
    setCurrentItem(items[index]);
    setEditingItemIndex(index);
  };

  const handleDeleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const purchaseOrder: Omit<PurchaseOrder, 'id'> = {
      date: order?.date || new Date().toISOString(),
      createdBy: order?.createdBy || 'system',
      createdByName: order?.createdByName || userName,
      items,
      subtotal,
      shippingExpense,
      totalCost,
      status,
      notes: notes || undefined,
      storeId: order?.storeId,
      convertedToInventory: order?.convertedToInventory,
      convertedAt: order?.convertedAt
    };

    onSubmit(purchaseOrder);
  };

  return (
    <form onSubmit={handleSubmit} className="purchase-order-form">
      <div className="form-section">
        <h3>Purchase Order Items</h3>
        
        <div className="item-input-section">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="serialNumber">Serial Number (S/N)</label>
              <input
                id="serialNumber"
                type="text"
                value={currentItem.serialNumber || ''}
                onChange={(e) => setCurrentItem({ ...currentItem, serialNumber: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="itemName">Item Name</label>
              <input
                id="itemName"
                type="text"
                value={currentItem.itemName || ''}
                onChange={(e) => setCurrentItem({ ...currentItem, itemName: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="modelNumber">Model Number</label>
              <input
                id="modelNumber"
                type="text"
                value={currentItem.modelNumber || ''}
                onChange={(e) => setCurrentItem({ ...currentItem, modelNumber: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quantity">Quantity</label>
              <input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={currentItem.quantity || 0}
                onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 0 })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="costPrice">Cost Price (from supplier)</label>
              <input
                id="costPrice"
                type="number"
                min="0"
                step="0.01"
                value={currentItem.costPrice || 0}
                onChange={(e) => setCurrentItem({ ...currentItem, costPrice: parseFloat(e.target.value) || 0 })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="storeCostPrice">Store Cost Price</label>
              <input
                id="storeCostPrice"
                type="number"
                min="0"
                step="0.01"
                value={currentItem.storeCostPrice || 0}
                onChange={(e) => setCurrentItem({ ...currentItem, storeCostPrice: parseFloat(e.target.value) || 0 })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="storeSellingPrice">Store Selling Price</label>
              <input
                id="storeSellingPrice"
                type="number"
                min="0"
                step="0.01"
                value={currentItem.storeSellingPrice || 0}
                onChange={(e) => setCurrentItem({ ...currentItem, storeSellingPrice: parseFloat(e.target.value) || 0 })}
                className="form-input"
              />
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="btn-add-item"
            >
              {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </div>

        {/* Items Table */}
        {items.length > 0 && (
          <div className="items-table-wrapper">
            <table className="items-table">
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>Item Name</th>
                  <th>Model</th>
                  <th>Qty</th>
                  <th>Unit Cost</th>
                  <th>Total Cost</th>
                  <th>Store Cost</th>
                  <th>Store Selling</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className={editingItemIndex === index ? 'editing' : ''}>
                    <td>{item.serialNumber}</td>
                    <td>{item.itemName}</td>
                    <td>{item.modelNumber}</td>
                    <td>{item.quantity}</td>
                    <td>{currency}{item.costPrice.toFixed(2)}</td>
                    <td>{currency}{item.totalCostPrice.toFixed(2)}</td>
                    <td>{currency}{item.storeCostPrice.toFixed(2)}</td>
                    <td>{currency}{item.storeSellingPrice.toFixed(2)}</td>
                    <td className="actions">
                      <button
                        type="button"
                        onClick={() => handleEditItem(index)}
                        className="btn-icon edit"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(index)}
                        className="btn-icon delete"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="form-section">
        <h3>Order Details</h3>

        <div className="form-row">
          <div className="form-group">
            <label>Subtotal (Sum of all items)</label>
            <div className="summary-value">{currency}{subtotal.toFixed(2)}</div>
          </div>

          <div className="form-group">
            <label htmlFor="shipping">Shipping Expense (from China/Supplier)</label>
            <input
              type="number"
              id="shipping"
              placeholder="Shipping/Transport Cost"
              min="0"
              step="0.01"
              value={shippingExpense}
              onChange={(e) => setShippingExpense(parseFloat(e.target.value) || 0)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Total Cost</label>
            <div className="summary-value total">{currency}{totalCost.toFixed(2)}</div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group full-width">
            <label htmlFor="status">Order Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
              className="form-input"
            >
              <option value={PurchaseOrderStatus.PENDING}>Pending</option>
              <option value={PurchaseOrderStatus.RECEIVED}>Received</option>
              <option value={PurchaseOrderStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group full-width">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              placeholder="Additional notes about this purchase order"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input"
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-cancel">
          Cancel
        </button>
        <button type="submit" className="btn-submit">
          {order ? 'Update Purchase Order' : 'Create Purchase Order'}
        </button>
      </div>
    </form>
  );
};
