import React, { useState, useEffect } from 'react';
import { warehouseService } from '../../services/warehouseService';
import { transferService } from '../../services/transferService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Toast } from '../../components/common/Toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  CheckCircle2,
  Package,
  Store,
  RefreshCw,
  Truck,
  ArrowRight,
} from 'lucide-react';

export const PickList = () => {
  const [pickItems, setPickItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pick Confirmation Modal
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [isPickModalOpen, setIsPickModalOpen] = useState(false);
  const [pickNotes, setPickNotes] = useState('');
  const [submittingPick, setSubmittingPick] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const fetchPickList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await warehouseService.getPickList();
      if (res.success) {
        setPickItems(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load pick list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickList();
  }, []);

  const handleOpenPickModal = (item) => {
    setSelectedTransfer(item);
    setPickNotes('Retrieved from storage rack Aisle 3. Shelf condition verified.');
    setIsPickModalOpen(true);
  };

  const handleConfirmPick = async (e) => {
    e.preventDefault();
    if (!selectedTransfer) return;

    setSubmittingPick(true);
    try {
      const res = await transferService.markPicked(selectedTransfer._id, { notes: pickNotes });
      if (res.success) {
        setIsPickModalOpen(false);
        setToast({
          show: true,
          message: `Transfer ${selectedTransfer.transferNumber} marked as PICKED! Staged for packing.`,
          type: 'success',
        });
        await fetchPickList();
      }
    } catch (err) {
      setIsPickModalOpen(false);
      setToast({
        show: true,
        message: err.response?.data?.message || err.message || 'Failed to update pick status',
        type: 'error',
      });
    } finally {
      setSubmittingPick(false);
    }
  };

  if (loading) return <LoadingSpinner text="Retrieving active warehouse pick tasks..." />;
  if (error) return <ErrorState message={error} onRetry={fetchPickList} />;

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Warehouse Pick List Console</h1>
          <p className="text-xs text-slate-500 mt-1">
            Retrieve approved items from facility storage bins and advance order to packing stage
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchPickList}>
            Refresh
          </Button>
          <Link to="/warehouse/dispatch">
            <Button size="sm" variant="secondary" icon={Truck}>
              Go to Packing & Dispatch
            </Button>
          </Link>
        </div>
      </div>

      {/* Pick Tasks Table */}
      <Card noPadding>
        {pickItems.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Pick list is currently clear"
            description="All approved transfers have been successfully picked and staged for packing."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Transfer Number</th>
                  <th className="py-3 px-4">Product to Retrieve</th>
                  <th className="py-3 px-4">Assigned Batch</th>
                  <th className="py-3 px-4">Destination Store</th>
                  <th className="py-3 px-4 text-right">Pick Quantity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Fulfillment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pickItems.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      {item.transferNumber}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{item.productId?.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        SKU: {item.productId?.sku} ({item.productId?.unit})
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {item.batchId ? (
                        <div>
                          <span className="font-mono font-bold text-slate-800 block">
                            {item.batchId.batchNumber}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Exp: {new Date(item.batchId.expiryDate).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">FEFO Standard Rack</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-purple-500" />
                        <span>{item.destinationId?.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{item.destinationId?.code}</span>
                    </td>

                    <td className="py-3 px-4 text-right font-extrabold text-emerald-600 text-sm">
                      {item.quantity.toLocaleString()}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant="blue" dot>APPROVED</Badge>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant="primary"
                        icon={CheckCircle2}
                        onClick={() => handleOpenPickModal(item)}
                      >
                        Mark as Picked
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isPickModalOpen}
        onClose={() => setIsPickModalOpen(false)}
        title="Confirm Stock Picked"
        subtitle={`Verify items retrieved for Transfer ${selectedTransfer?.transferNumber}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsPickModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={submittingPick}
              onClick={handleConfirmPick}
            >
              Confirm Pick & Stage for Packing
            </Button>
          </>
        }
      >
        <form onSubmit={handleConfirmPick} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Product:</span>
              <span className="font-bold text-slate-900">{selectedTransfer?.productId?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pick Quantity:</span>
              <span className="font-extrabold text-emerald-600">{selectedTransfer?.quantity} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Destination:</span>
              <span className="font-semibold text-slate-800">{selectedTransfer?.destinationId?.name}</span>
            </div>
          </div>

          <Input
            label="Picker Verification Notes"
            placeholder="e.g. Rack A-04, seal intact"
            value={pickNotes}
            onChange={(e) => setPickNotes(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
};
