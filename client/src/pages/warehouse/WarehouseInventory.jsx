import React, { useState, useEffect } from 'react';
import { warehouseService } from '../../services/warehouseService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Boxes, RefreshCw, Clock, UploadCloud } from 'lucide-react';
import { QuickUploadModal } from '../../components/common/QuickUploadModal';

export const WarehouseInventory = () => {
  const [inventories, setInventories] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await warehouseService.getInventory();
      if (res.success) {
        setInventories(res.data.inventories || []);
        setBatches(res.data.batches || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load warehouse inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  if (loading) return <LoadingSpinner text="Loading facility inventory balances..." />;
  if (error) return <ErrorState message={error} onRetry={fetchInventory} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Warehouse Facility Inventory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time shelf inventory, reserved allocations, and active batch expiration dates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchInventory}>
            Refresh
          </Button>
          <Button size="sm" variant="primary" icon={UploadCloud} onClick={() => setShowUploadModal(true)}>
            Upload Inbound CSV
          </Button>
        </div>
      </div>

      <QuickUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        role="WAREHOUSE"
        onUploadSuccess={() => fetchInventory()}
      />

      {/* On-hand Products Grid */}
      <Card noPadding title="Stock by Product SKU">
        {inventories.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No inventory records in this warehouse"
            description="Stock records assigned to your facility will be listed here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU / Unit</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Physical Quantity</th>
                  <th className="py-3 px-4 text-right">Reserved (Committed)</th>
                  <th className="py-3 px-4 text-right">Available for Dispatch</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventories.map((inv) => {
                  const available = inv.availableQuantity;
                  const safety = inv.productId?.minSafetyStock || 20;

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
                        {inv.quantity.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-amber-600">
                        {inv.reservedQuantity ? inv.reservedQuantity.toLocaleString() : '0'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {available.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {available === 0 ? (
                          <Badge variant="rose" dot>Out of Stock</Badge>
                        ) : available <= safety ? (
                          <Badge variant="amber" dot>Low Stock</Badge>
                        ) : (
                          <Badge variant="emerald" dot>Healthy</Badge>
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

      {/* Active Batches Table */}
      <Card noPadding title="Active Warehouse Batches (FEFO Tracking)" subtitle="Stored lots with expiration dates">
        {batches.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No active batches registered.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Batch Code</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-right">Batch Units</th>
                  <th className="py-3 px-4">Manufacturing Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Shelf-Life Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => {
                  const daysLeft = Math.ceil(
                    (new Date(b.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                      <td className="py-3 px-4 text-slate-800">{b.productId?.name}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{b.quantity}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(b.manufacturingDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {new Date(b.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {daysLeft <= 0 ? (
                          <Badge variant="rose" dot>Expired</Badge>
                        ) : daysLeft <= 30 ? (
                          <Badge variant="rose" dot>{daysLeft} days left (Critical)</Badge>
                        ) : daysLeft <= 60 ? (
                          <Badge variant="amber" dot>{daysLeft} days left</Badge>
                        ) : (
                          <Badge variant="emerald" dot>{daysLeft} days left</Badge>
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
    </div>
  );
};
