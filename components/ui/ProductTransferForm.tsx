import React, { useState } from 'react';
import { Product, Branch, ProductTransferItem } from '../../types';
import { Icons } from './Icons';

interface ProductTransferFormProps {
  products: Product[];
  branches: Branch[];
  onSubmit: (transfer: {
    toBranchId: string;
    toBranchName: string;
    items: ProductTransferItem[];
    notes?: string;
  }) => void;
  onCancel: () => void;
  currentBranchId?: string;
}

export const ProductTransferForm: React.FC<ProductTransferFormProps> = ({
  products,
  branches,
  onSubmit,
  onCancel,
  currentBranchId
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedItems, setSelectedItems] = useState<ProductTransferItem[]>([]);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter products - show only products without storeId (central inventory) or from current branch
  const availableProducts = products.filter(p => 
    !p.storeId || p.storeId === currentBranchId
  );

  const filteredProducts = availableProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = (product: Product) => {
    const existing = selectedItems.find(item => item.productId === product.id);
    if (existing) {
      setSelectedItems(prev =>
        prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      const newItem: ProductTransferItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice
      };
      setSelectedItems(prev => [...prev, newItem]);
    }
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedItems(prev => prev.filter(item => item.productId !== productId));
    } else {
      const product = products.find(p => p.id === productId);
      if (product && quantity > product.stock) {
        alert(`Cannot transfer more than available stock (${product.stock})`);
        return;
      }
      setSelectedItems(prev =>
        prev.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBranchId) {
      alert('Please select a destination branch');
      return;
    }

    if (selectedItems.length === 0) {
      alert('Please add at least one product to transfer');
      return;
    }

    const selectedBranch = branches.find(b => b.id === selectedBranchId);
    if (!selectedBranch) return;

    onSubmit({
      toBranchId: selectedBranchId,
      toBranchName: selectedBranch.name,
      items: selectedItems,
      notes: notes.trim() || undefined
    });
  };

  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-gray-900 rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Create Product Transfer</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Destination Branch */}
        <div>
          <label className="block text-sm font-bold text-gray-400 mb-2">
            Destination Branch *
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 text-white p-3 rounded-lg"
            required
          >
            <option value="">Select Branch</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>
                {branch.name} - {branch.address}
              </option>
            ))}
          </select>
        </div>

        {/* Product Selection */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4">Select Products</h3>
          
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg mb-4"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="bg-gray-900 border border-gray-700 rounded-lg p-3 hover:border-blue-500 cursor-pointer transition"
                onClick={() => handleAddItem(product)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-bold text-white">{product.name}</p>
                    <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                    <p className="text-xs text-gray-400">Stock: {product.stock} units</p>
                  </div>
                  <button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddItem(product);
                    }}
                  >
                    <Icons.Add size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Items */}
        {selectedItems.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-4">
              Selected Items ({totalItems} units)
            </h3>
            
            <div className="space-y-2">
              {selectedItems.map(item => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <div
                    key={item.productId}
                    className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex items-center gap-4"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-white">{item.productName}</p>
                      <p className="text-xs text-gray-400">SKU: {item.sku}</p>
                      <p className="text-xs text-gray-500">
                        Available: {product?.stock || 0} units
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQuantity(item.productId, parseInt(e.target.value) || 0)}
                        className="w-20 bg-gray-800 border border-gray-600 text-white text-center p-2 rounded"
                        min="1"
                        max={product?.stock || 999}
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.productId)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Icons.Delete size={20} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-bold text-gray-400 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 text-white p-3 rounded-lg"
            rows={3}
            placeholder="Add any notes about this transfer..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold"
            disabled={selectedItems.length === 0 || !selectedBranchId}
          >
            Create Transfer
          </button>
        </div>
      </form>
    </div>
  );
};