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
  Truck,
  PackageCheck,
  Box,
  Store,
  RefreshCw,
  Archive,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const Dispatch = () => {
  const [dispatchQueue, setDispatchQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dispatch Modal
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [carrier, setCarrier] = useState('SpeedLogix Freight Express');
  const [vehicleNumber, setVehicleNumber] = useState('DL-01-AX-8821');
  const [dispatchNotes, setDispatchNotes] = useState('Loaded in refrigerated freight container');
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await warehouseService.getDispatchQueue();
      if (res.success) {
        setDispatchQueue(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load dispatch queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handlePack = async (transferId, transferNum) => {
    try {
      const res = await transferService.markPacked(transferId, { notes: 'Boxed and barcoded' });
      if (res.success) {
        setToast({
          show: true,
          message: `Transfer ${transferNum} packed and ready for carrier vehicle!`,
          type: 'success',
        });
        await fetchQueue();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update pack status');
    }
  };

  const handleOpenDispatchModal = (item) => {
    setSelectedTransfer(item);
    setIsDispatchModalOpen(true);
  };

  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    if (!selectedTransfer) return;

    setSubmittingDispatch(true);
    try {
      const res = await transferService.markDispatched(selectedTransfer._id, {
        carrier,
        vehicleNumber,
        notes: dispatchNotes,
      });

      if (res.success) {
        setIsDispatchModalOpen(false);
        setToast({
          show: true,
          message: `Transfer ${selectedTransfer.transferNumber} DISPATCHED! Warehouse inventory decremented.`,
          type: 'success',
        });
        await fetchQueue();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to dispatch shipment');
    } finally {
      setSubmittingDispatch(false);
    }
  };

  if (loading) return <LoadingSpinner text="Retrieving outbound freight staging queue..." />;
  if (error) return <ErrorState message={error} onRetry={fetchQueue} />;

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Packing & Freight Dispatch Console</h1>
          <p className="text-xs text-slate-500 mt-1">
            Two-stage outbound fulfillment: Pack verified orders and record vehicle dispatch to stores
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchQueue}>
            Refresh
          </Button>
          <Link to="/warehouse/history">
            <Button size="sm" variant="ghost" icon={Archive}>
              Dispatch History
            </Button>
          </Link>
        </div>
      </div>

      {/* Workflow Guidance Card */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-600" />
          <span>
            <strong>Fulfillment Workflow:</strong> PICKED → Click <em>Pack & Stage</em> (PACKED) → Click <em>Dispatch Consignment</em> (DISPATCHED).
          </span>
        </div>
        <span className="font-semibold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
          Atomic Stock Mutation Active
        </span>
      </div>

      {/* Queue Table */}
      <Card noPadding>
        {dispatchQueue.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Dispatch staging queue is empty"
            description="No picked orders awaiting packaging or dispatch. Check Pick List to prepare approved transfers."
            actionText="Go to Pick List"
            onAction={() => (window.location.href = '/warehouse/pick-list')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Transfer Number</th>
                  <th className="py-3 px-4">Consignment Contents</th>
                  <th className="py-3 px-4">Destination Store</th>
                  <th className="py-3 px-4 text-right">Volume</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4 text-center">Fulfillment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dispatchQueue.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      {item.transferNumber}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{item.productId?.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        SKU: {item.productId?.sku} {item.batchId ? `• Batch: ${item.batchId.batchNumber}` : ''}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-purple-500" />
                        <span>{item.destinationId?.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{item.destinationId?.location}</span>
                    </td>

                    <td className="py-3 px-4 text-right font-extrabold text-emerald-600 text-sm">
                      {item.quantity.toLocaleString()} units
                    </td>

                    <td className="py-3 px-4">
                      {item.status === 'PICKED' ? (
                        <Badge variant="teal" dot>PICKED (Needs Packing)</Badge>
                      ) : (
                        <Badge variant="indigo" dot>PACKED (Ready to Truck)</Badge>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {item.status === 'PICKED' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Box}
                          onClick={() => handlePack(item._id, item.transferNumber)}
                        >
                          Pack & Stage
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={Truck}
                          onClick={() => handleOpenDispatchModal(item)}
                        >
                          Dispatch Consignment
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Dispatch Modal */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title="Freight Consignment Dispatch"
        subtitle={`Assign logistics carrier and vehicle for ${selectedTransfer?.transferNumber}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsDispatchModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={submittingDispatch}
              onClick={handleConfirmDispatch}
            >
              Confirm Vehicle Departure & Dispatch
            </Button>
          </>
        }
      >
        <form onSubmit={handleConfirmDispatch} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Product:</span>
              <span className="font-bold text-slate-900">{selectedTransfer?.productId?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Consignment Quantity:</span>
              <span className="font-bold text-emerald-600">{selectedTransfer?.quantity} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Destination:</span>
              <span className="font-semibold text-slate-800">{selectedTransfer?.destinationId?.name}</span>
            </div>
          </div>

          <Input
            label="Logistics Carrier"
            required
            placeholder="e.g. SpeedLogix Express, DHL Supply Chain"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          />

          <Input
            label="Truck / Vehicle License Plate Number"
            required
            placeholder="e.g. DL-01-AB-1234"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
          />

          <Input
            label="Dispatch Handover Notes"
            placeholder="Driver name, seal number, departure condition..."
            value={dispatchNotes}
            onChange={(e) => setDispatchNotes(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
};
