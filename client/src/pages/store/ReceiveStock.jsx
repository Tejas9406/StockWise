import React, { useState, useEffect } from 'react';
import { storeService } from '../../services/storeService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { PackageCheck, Truck, CheckCircle2, Clock, MapPin, AlertTriangle } from 'lucide-react';

export const ReceiveStock = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchIncoming = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storeService.getIncomingTransfers();
      if (res.success) {
        // Only show dispatched transfers awaiting receipt
        const all = res.data?.transfers || [];
        setTransfers(all.filter((t) => t.status === 'DISPATCHED'));
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load incoming transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncoming();
  }, []);

  const handleConfirmReceipt = async (transferId) => {
    setConfirmLoading(true);
    try {
      const res = await storeService.confirmReceiveStock(transferId);
      if (res.success) {
        setSuccessMsg(res.message || 'Stock received! Inventory updated.');
        setSelectedTransfer(null);
        fetchIncoming();
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm receipt');
    } finally {
      setConfirmLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading incoming deliveries..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Receive Stock</h1>
          <p className="text-xs text-slate-500 mt-1">
            Confirm receipt of dispatched shipments to update store inventory
          </p>
        </div>
        <Badge variant="indigo" className="text-xs self-start sm:self-auto">
          {transfers.length} Awaiting Receipt
        </Badge>
      </div>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={fetchIncoming} />}

      {/* Success */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Transfer Cards */}
      {!error && transfers.length === 0 ? (
        <EmptyState
          title="No Pending Deliveries"
          description="All dispatched shipments have been received. New deliveries will appear here once dispatched from the warehouse."
          icon={PackageCheck}
        />
      ) : (
        <div className="grid gap-4">
          {transfers.map((transfer) => (
            <Card key={transfer._id}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">
                        {transfer.transferNumber || `TRF-${transfer._id.slice(-6).toUpperCase()}`}
                      </span>
                      <Badge variant="amber" className="text-xs">DISPATCHED</Badge>
                    </div>

                    {/* Product & Quantity */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                        {transfer.productId?.name || 'Product'} × {transfer.quantity} units
                      </span>
                      {transfer.productId?.sku && (
                        <span className="text-xs text-slate-400">SKU: {transfer.productId.sku}</span>
                      )}
                    </div>

                    {/* Source & time */}
                    <div className="mt-1.5 space-y-0.5">
                      <p className="text-xs text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        From:{' '}
                        <strong>
                          {transfer.sourceWarehouseId?.name || transfer.sourceWarehouseId?.code || 'Warehouse'}
                        </strong>
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Dispatched:{' '}
                        {transfer.dispatchedAt
                          ? new Date(transfer.dispatchedAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={CheckCircle2}
                    onClick={() => setSelectedTransfer(transfer)}
                  >
                    Confirm Receipt
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedTransfer && (
        <Modal
          isOpen={!!selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
          title="Confirm Stock Receipt"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Confirming receipt will permanently update your store inventory. Ensure physical
                quantities match before proceeding.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl divide-y divide-slate-200 border border-slate-200 overflow-hidden text-sm">
              {[
                ['Transfer No.', selectedTransfer.transferNumber || '—'],
                [
                  'Product',
                  `${selectedTransfer.productId?.name} (${selectedTransfer.productId?.sku || 'SKU'})`,
                ],
                ['Quantity', `${selectedTransfer.quantity} units`],
                [
                  'From Warehouse',
                  selectedTransfer.sourceWarehouseId?.name ||
                    selectedTransfer.sourceWarehouseId?.code ||
                    '—',
                ],
                [
                  'Dispatched At',
                  selectedTransfer.dispatchedAt
                    ? new Date(selectedTransfer.dispatchedAt).toLocaleString()
                    : 'N/A',
                ],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between px-4 py-2.5 bg-white">
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                  <span className="text-xs font-semibold text-slate-800">{val}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => setSelectedTransfer(null)}
                disabled={confirmLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={PackageCheck}
                isLoading={confirmLoading}
                onClick={() => handleConfirmReceipt(selectedTransfer._id)}
              >
                Confirm & Update Inventory
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
