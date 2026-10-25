import React, { useState, useEffect } from 'react';
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
import {
  ArrowRightLeft,
  Plus,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Truck,
  Building2,
  Store,
  RefreshCw,
  Clock,
  Package,
} from 'lucide-react';

export const Transfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stores, setStores] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    productId: '',
    sourceWarehouseId: '',
    destinationType: 'STORE',
    destinationId: '',
    quantity: 50,
    batchId: '',
    notes: '',
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Detail Modal
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [transferTimeline, setTransferTimeline] = useState([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, pRes, wRes, sRes, bRes] = await Promise.all([
        transferService.getAllTransfers(),
        inventoryService.getAllProducts(),
        inventoryService.getAllWarehouses(),
        inventoryService.getAllStores(),
        inventoryService.getAllBatches(),
      ]);

      if (tRes.success) setTransfers(tRes.data);
      if (pRes.success) setProducts(pRes.data);
      if (wRes.success) setWarehouses(wRes.data);
      if (sRes.success) setStores(sRes.data);
      if (bRes.success) setBatches(bRes.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDetail = async (transferId) => {
    setIsDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await transferService.getTransferById(transferId);
      if (res.success) {
        setSelectedTransfer(res.data.transfer);
        setTransferTimeline(res.data.timeline || []);
      }
    } catch (err) {
      setToast({ show: true, message: 'Failed to load transfer detail', type: 'error' });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    setSubmittingCreate(true);
    try {
      const res = await transferService.createTransfer({
        productId: createForm.productId,
        sourceWarehouseId: createForm.sourceWarehouseId,
        destinationType: createForm.destinationType,
        destinationId: createForm.destinationId,
        quantity: Number(createForm.quantity),
        batchId: createForm.batchId || null,
        notes: createForm.notes,
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        setToast({ show: true, message: `Transfer ${res.data.transferNumber} created!`, type: 'success' });
        await fetchData();
      }
    } catch (err) {
      setToast({ show: true, message: err.response?.data?.message || err.message || 'Creation failed', type: 'error' });
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleApprove = async (transferId) => {
    try {
      const res = await transferService.approveTransfer(transferId, { reason: 'Direct manager approval' });
      if (res.success) {
        setToast({ show: true, message: 'Transfer approved for warehouse picking!', type: 'success' });
        setIsDetailModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      setToast({ show: true, message: err.response?.data?.message || err.message || 'Approval failed', type: 'error' });
    }
  };

  const handleReject = async (transferId) => {
    const reason = prompt('Reason for cancelling transfer:', 'Replenishment plan modified');
    if (reason === null) return;

    try {
      const res = await transferService.rejectTransfer(transferId, { reason });
      if (res.success) {
        setToast({ show: true, message: 'Transfer cancelled.', type: 'info' });
        setIsDetailModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      setToast({ show: true, message: err.response?.data?.message || err.message || 'Cancellation failed', type: 'error' });
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      PENDING: { variant: 'amber', label: 'Pending Approval' },
      APPROVED: { variant: 'blue', label: 'Approved' },
      PICKED: { variant: 'teal', label: 'Picked' },
      PACKED: { variant: 'indigo', label: 'Packed' },
      DISPATCHED: { variant: 'purple', label: 'Dispatched' },
      RECEIVED: { variant: 'emerald', label: 'Received' },
      CANCELLED: { variant: 'rose', label: 'Cancelled' },
    };
    const s = map[status] || { variant: 'gray', label: status };
    return <Badge variant={s.variant} dot>{s.label}</Badge>;
  };

  const filteredTransfers = transfers.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      const numMatch = t.transferNumber?.toLowerCase().includes(term);
      const prodMatch = t.productId?.name?.toLowerCase().includes(term);
      const srcMatch = t.sourceWarehouseId?.name?.toLowerCase().includes(term);
      const destMatch = t.destinationId?.name?.toLowerCase().includes(term);
      if (!numMatch && !prodMatch && !srcMatch && !destMatch) return false;
    }
    return true;
  });

  const availableBatches = batches.filter(
    (b) =>
      b.productId?._id === createForm.productId &&
      b.warehouseId?._id === createForm.sourceWarehouseId
  );

  const stepsOrder = ['PENDING', 'APPROVED', 'PICKED', 'PACKED', 'DISPATCHED', 'RECEIVED'];

  if (loading) return <LoadingSpinner text="Loading transfer records..." />;
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Transfer Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end multi-facility dispatch, transit, and receipt confirmation pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchData}>
            Refresh
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={Plus}
            onClick={() => {
              setCreateForm({
                productId: products[0]?._id || '',
                sourceWarehouseId: warehouses[0]?._id || '',
                destinationType: 'STORE',
                destinationId: stores[0]?._id || '',
                quantity: 50,
                batchId: '',
                notes: 'Manual replenishment request',
              });
              setIsCreateModalOpen(true);
            }}
          >
            Create Transfer
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-6 text-xs font-semibold overflow-x-auto">
        {['ALL', 'PENDING', 'APPROVED', 'PICKED', 'PACKED', 'DISPATCHED', 'RECEIVED', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`pb-3 px-1.5 border-b-2 transition-all ${
              statusFilter === st
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {st === 'ALL' ? 'All Transfers' : st}
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
              {st === 'ALL' ? transfers.length : transfers.filter((t) => t.status === st).length}
            </span>
          </button>
        ))}
      </div>

      {/* Transfers Table Card */}
      <Card noPadding>
        {filteredTransfers.length === 0 ? (
          <EmptyState
            icon={ArrowRightLeft}
            title="No transfers match filter"
            description="No transfer records found for the current search or status filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Transfer Number</th>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Source Hub</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Initiated Date</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransfers.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      {t.transferNumber}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">{t.productId?.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        SKU: {t.productId?.sku} {t.batchId ? `• Batch: ${t.batchId.batchNumber}` : ''}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>{t.sourceWarehouseId?.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{t.sourceWarehouseId?.code}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-purple-500" />
                        <span>{t.destinationId?.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{t.destinationId?.code}</span>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {t.quantity.toLocaleString()}
                    </td>

                    <td className="py-3 px-4">{getStatusBadge(t.status)}</td>

                    <td className="py-3 px-4 text-slate-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Eye}
                        onClick={() => handleOpenDetail(t._id)}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Manual Transfer Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Transfer Order"
        subtitle="Route stock replenishment from warehouse to retail store"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={submittingCreate}
              onClick={handleCreateTransfer}
            >
              Initiate Transfer
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateTransfer} className="space-y-4">
          <Select
            label="Product"
            required
            value={createForm.productId}
            onChange={(e) => setCreateForm({ ...createForm, productId: e.target.value, batchId: '' })}
            options={products.map((p) => ({
              value: p._id,
              label: `${p.name} (${p.sku})`,
            }))}
          />

          <Select
            label="Origin Warehouse"
            required
            value={createForm.sourceWarehouseId}
            onChange={(e) =>
              setCreateForm({ ...createForm, sourceWarehouseId: e.target.value, batchId: '' })
            }
            options={warehouses.map((wh) => ({
              value: wh._id,
              label: `${wh.code} — ${wh.name} (${wh.location})`,
            }))}
          />

          <Select
            label="Destination Store"
            required
            value={createForm.destinationId}
            onChange={(e) => setCreateForm({ ...createForm, destinationId: e.target.value })}
            options={stores.map((st) => ({
              value: st._id,
              label: `${st.code} — ${st.name} (${st.location})`,
            }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Transfer Quantity"
              type="number"
              required
              min="1"
              value={createForm.quantity}
              onChange={(e) => setCreateForm({ ...createForm, quantity: e.target.value })}
            />

            <Select
              label="Specific Batch (FEFO)"
              value={createForm.batchId}
              onChange={(e) => setCreateForm({ ...createForm, batchId: e.target.value })}
              options={availableBatches.map((b) => ({
                value: b._id,
                label: `${b.batchNumber} (Expires: ${new Date(b.expiryDate).toLocaleDateString()})`,
              }))}
              placeholder="Auto-allocate or Select Batch"
            />
          </div>

          <Input
            label="Transfer Instructions / Notes"
            placeholder="e.g. Expedited weekend replenishment"
            value={createForm.notes}
            onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
          />
        </form>
      </Modal>

      {/* Transfer Detail & Audit Timeline Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        maxWidth="max-w-2xl"
        title={`Transfer Tracking: ${selectedTransfer?.transferNumber || ''}`}
        subtitle="Lifecycle stages, transit status, and immutable audit events"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {selectedTransfer?.status === 'PENDING' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={XCircle}
                    onClick={() => handleReject(selectedTransfer._id)}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={CheckCircle2}
                    onClick={() => handleApprove(selectedTransfer._id)}
                  >
                    Approve Transfer
                  </Button>
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        {loadingDetail || !selectedTransfer ? (
          <LoadingSpinner text="Retrieving transfer timeline..." />
        ) : (
          <div className="space-y-6">
            {/* Step-by-step Visual Progress Tracker */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                FMCG Fulfillment Lifecycle
              </h4>

              <div className="flex items-center justify-between relative">
                {stepsOrder.map((step, idx) => {
                  const currentIdx = stepsOrder.indexOf(selectedTransfer.status);
                  const isCompleted = currentIdx >= idx;
                  const isCurrent = selectedTransfer.status === step;

                  return (
                    <div key={step} className="flex flex-col items-center z-10 relative">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                            : isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white border-2 border-slate-300 text-slate-400'
                        }`}
                      >
                        {isCompleted && !isCurrent ? '✓' : idx + 1}
                      </div>
                      <span
                        className={`text-[10px] mt-1.5 font-medium ${
                          isCurrent
                            ? 'text-emerald-700 font-bold'
                            : isCompleted
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Transfer Attributes */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Product</span>
                <span className="font-bold text-slate-900 text-sm">{selectedTransfer.productId?.name}</span>
                <span className="text-slate-500 block font-mono">SKU: {selectedTransfer.productId?.sku}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Quantity</span>
                <span className="font-extrabold text-emerald-600 text-lg">
                  {selectedTransfer.quantity} <span className="text-xs font-normal text-slate-500">units</span>
                </span>
                {selectedTransfer.batchId && (
                  <span className="text-slate-500 block text-[10px]">
                    Batch: {selectedTransfer.batchId?.batchNumber}
                  </span>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Origin Hub</span>
                <span className="font-semibold text-slate-800">{selectedTransfer.sourceWarehouseId?.name}</span>
                <span className="text-slate-500 block text-[10px]">{selectedTransfer.sourceWarehouseId?.location}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Destination</span>
                <span className="font-semibold text-slate-800">{selectedTransfer.destinationId?.name}</span>
                <span className="text-slate-500 block text-[10px]">{selectedTransfer.destinationId?.location}</span>
              </div>
            </div>

            {/* Carrier & Vehicle information if dispatched */}
            {(selectedTransfer.carrier || selectedTransfer.vehicleNumber) && (
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-blue-600 uppercase font-bold block">Logistics Carrier</span>
                  <span className="font-semibold text-blue-900">{selectedTransfer.carrier || 'Standard Freight'}</span>
                </div>
                {selectedTransfer.vehicleNumber && (
                  <div className="text-right">
                    <span className="text-[10px] text-blue-600 uppercase font-bold block">Vehicle Number</span>
                    <span className="font-mono font-bold text-blue-900">{selectedTransfer.vehicleNumber}</span>
                  </div>
                )}
              </div>
            )}

            {/* Audit Trail Timeline */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Immutable Decision History & Event Audit Log
              </h4>

              <div className="space-y-3">
                {transferTimeline.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No events logged yet.</p>
                ) : (
                  transferTimeline.map((ev, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200/80 text-xs shadow-sm"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{ev.action}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(ev.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{ev.reason || 'Action processed'}</p>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Actor: <strong>{ev.userId?.name || 'System'}</strong> ({ev.userId?.role || 'Service'})
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
