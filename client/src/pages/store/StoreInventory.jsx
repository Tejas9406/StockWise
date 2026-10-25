import React, { useState, useEffect } from 'react';
import { storeService } from '../../services/storeService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Link } from 'react-router-dom';
import { Boxes, RefreshCw, ShoppingCart, Truck, UploadCloud } from 'lucide-react';
import { QuickUploadModal } from '../../components/common/QuickUploadModal';

export const StoreInventory = () => {
  const [inventories, setInventories] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storeService.getInventory();
      if (res.success) {
        setInventories(res.data.inventories || []);
        setBatches(res.data.batches || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load store inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  if (loading) return <LoadingSpinner text="Retrieving retail store inventory..." />;
  if (error) return <ErrorState message={error} onRetry={fetchInventory} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store Shelf Inventory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time on-hand stock and active retail product batches
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchInventory}>
            Refresh
          </Button>
          <Button size="sm" variant="secondary" icon={UploadCloud} onClick={() => setShowUploadModal(true)}>
            Upload Store CSV
          </Button>
          <Link to="/store/receive">
            <Button size="sm" variant="primary" icon={Truck}>
              Receive Stock
            </Button>
          </Link>
        </div>
      </div>

      <QuickUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        role="STORE_MANAGER"
        onUploadSuccess={() => fetchInventory()}
      />

      <Card noPadding title="Current On-Shelf Stock">
        {inventories.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No inventory records found for this store"
            description="Incoming stock received from warehouse transfers will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU / Unit</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Available Stock</th>
                  <th className="py-3 px-4 text-center">Safety Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventories.map((inv) => {
                  const safety = inv.productId?.minSafetyStock || 20;
                  const qty = inv.quantity || 0;

                  return (
                    <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{inv.productId?.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {inv.productId?.sku} • {inv.productId?.unit}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <Badge variant="gray">{inv.productId?.category}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        ${inv.productId?.sellingPrice || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900 text-sm">
                        {qty.toLocaleString()} units
                      </td>
                      <td className="py-3 px-4 text-center">
                        {qty === 0 ? (
                          <Badge variant="rose" dot>Stockout</Badge>
                        ) : qty <= safety ? (
                          <Badge variant="amber" dot>Critical Low (&lt; {safety})</Badge>
                        ) : (
                          <Badge variant="emerald" dot>Safe</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Batches Table */}
      {batches.length > 0 && (
        <Card noPadding title="Store Batches & Expiry Dates">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                    <td className="py-3 px-4 text-slate-800">{b.productId?.name}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{b.quantity}</td>
                    <td className="py-3 px-4 text-slate-600">{new Date(b.expiryDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <Badge variant="emerald" dot>Active Shelf Life</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
