import React, { useState, useEffect } from 'react';
import { storeService } from '../../services/storeService';
import { transferService } from '../../services/transferService';
import { inventoryService } from '../../services/inventoryService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Toast } from '../../components/common/Toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  AlertTriangle,
  ArrowRightLeft,
  RefreshCw,
  Plus,
  Building2,
} from 'lucide-react';

export const StockRequirement = () => {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Request Stock Modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [requestWarehouseId, setRequestWarehouseId] = useState('');
  const [requestQuantity, setRequestQuantity] = useState(50);
  const [requestNotes, setRequestNotes] = useState('Store stock replenishment request');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqRes, whRes] = await Promise.all([
        storeService.getStockRequirements(),
        inventoryService.getAllWarehouses(),
      ]);

      if (reqRes.success) setRequirements(reqRes.data);
      if (whRes.success && Array.isArray(whRes.data)) {
        setWarehouses(whRes.data);
        if (whRes.data.length > 0) {
          const firstWh = whRes.data[0]?.id || whRes.data[0]?._id || 1;
          setRequestWarehouseId(firstWh);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load stock requirements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenRequestModal = (reqItem) => {
    setSelectedReq(reqItem);
    setRequestQuantity(reqItem.requiredQuantity > 0 ? reqItem.requiredQuantity : 40);
    setRequestNotes(`Store requested replenishment for ${reqItem.productName}`);
    const defaultWh = requestWarehouseId || warehouses[0]?.id || warehouses[0]?._id || 1;
    setRequestWarehouseId(defaultWh);
    setIsRequestModalOpen(true);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    setSubmittingRequest(true);
    try {
      const whId = parseInt(requestWarehouseId || warehouses[0]?.id || warehouses[0]?._id || 1, 10);
      const prodId = parseInt(selectedReq.productId || selectedReq.id || 1, 10);
      const destId = parseInt(user?.storeId || user?.store_id || 1, 10);
      const qty = Number(requestQuantity) > 0 ? Number(requestQuantity) : 40;

      const res = await transferService.createTransfer({
        productId: prodId,
        sourceWarehouseId: whId,
        destinationType: 'STORE',
        destinationId: destId,
        quantity: qty,
        notes: requestNotes,
      });

      if (res.success) {
        setIsRequestModalOpen(false);
        setToast({
          show: true,
          message: `Replenishment order ${res.data?.transfer_number || res.data?.transferNumber || ''} created successfully!`,
          type: 'success',
        });
        await fetchData();
      }
    } catch (err) {
      setIsRequestModalOpen(false);
      setToast({
        show: true,
        message: err.response?.data?.message || err.message || 'Failed to submit replenishment request',
        type: 'error',
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) return <LoadingSpinner text="Computing store replenishment requirements..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      <Toast
        isVisible={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Replenishment Requirements</h1>
          <p className="text-xs text-slate-500 mt-1">
            Reorder point analysis comparing on-hand inventory, in-transit orders, and target safety stock
          </p>
        </div>

        <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchData}>
          Refresh
        </Button>
      </div>

      {/* Requirements Table */}
      <Card noPadding>
        {requirements.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No product requirements calculated"
            description="All active catalog products are adequately stocked."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Current On-Shelf</th>
                  <th className="py-3 px-4 text-right">In-Transit Shipments</th>
                  <th className="py-3 px-4 text-right">Safety Stock</th>
                  <th className="py-3 px-4 text-right">Reorder Threshold</th>
                  <th className="py-3 px-4 text-right">Deficit / Required</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requirements.map((req) => (
                  <tr key={req.productId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{req.productName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">SKU: {req.sku}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <Badge variant="gray">{req.category}</Badge>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {req.currentStock}
                    </td>

                    <td className="py-3 px-4 text-right text-indigo-600 font-semibold">
                      +{req.inTransitUnits} incoming
                    </td>

                    <td className="py-3 px-4 text-right text-slate-500 font-medium">
                      {req.safetyStock}
                    </td>

                    <td className="py-3 px-4 text-right text-slate-500 font-medium">
                      {req.reorderPoint}
                    </td>

                    <td className="py-3 px-4 text-right font-extrabold text-sm">
                      {req.requiredQuantity > 0 ? (
                        <span className="text-rose-600">+{req.requiredQuantity} units</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">Sufficient</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant={req.isDeficit ? 'primary' : 'outline'}
                        icon={ArrowRightLeft}
                        onClick={() => handleOpenRequestModal(req)}
                      >
                        Request Stock
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Request Stock Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Stock Replenishment"
        subtitle={`Submit replenishment order for ${selectedReq?.productName}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={submittingRequest}
              onClick={handleSubmitRequest}
            >
              Submit Transfer Request
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <Select
            label="Request From Warehouse Hub"
            required
            value={requestWarehouseId}
            onChange={(e) => setRequestWarehouseId(e.target.value)}
            placeholder=""
            options={warehouses.map((wh) => ({
              value: wh.id || wh._id,
              label: `${wh.code || ''} — ${wh.name} (${wh.location || ''})`,
            }))}
          />

          <Input
            label="Requested Units"
            type="number"
            required
            min="1"
            value={requestQuantity}
            onChange={(e) => setRequestQuantity(e.target.value)}
          />

          <Input
            label="Reason / Urgency"
            value={requestNotes}
            onChange={(e) => setRequestNotes(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
};
