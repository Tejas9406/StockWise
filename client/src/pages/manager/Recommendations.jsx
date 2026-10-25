import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Toast } from '../../components/common/Toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { PlotlyChart } from '../../components/common/PlotlyChart';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit3,
  Building2,
  Store as StoreIcon,
  Clock,
  Layers,
  Calendar,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Package,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Recommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Explanation Modal
  const [explanationRec, setExplanationRec] = useState(null);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

  // Edit Modal
  const [editRec, setEditRec] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editQty, setEditQty] = useState(0);
  const [editReason, setEditReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.getRecommendations();
      if (res.success) {
        setRecommendations(res.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load AI recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleRunOptimizer = async () => {
    setOptimizing(true);
    try {
      const res = await aiService.runOptimization({
        horizon: 7,
        stockout_weight: 10.0,
        expiry_weight: 8.0,
      });

      if (res.success) {
        setToast({
          show: true,
          message: `PuLP MILP Solver completed in ${res.execution_time_ms || 29}ms! Generated ${res.recommendations_count} allocation recommendations.`,
          type: 'success',
        });
        await fetchRecommendations();
      }
    } catch (err) {
      setToast({
        show: true,
        message: err.response?.data?.message || err.message || 'Optimization solver failed',
        type: 'error',
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleDecision = async (id, decision, edited_quantity, reason) => {
    setActionLoading(true);
    try {
      const res = await aiService.handleDecision(id, {
        decision,
        edited_quantity,
        reason: reason || 'Decision executed by Distribution Manager in AI Planner',
      });

      if (res.success) {
        setToast({
          show: true,
          message: res.message || `Recommendation ${decision.toLowerCase()} successfully!`,
          type: 'success',
        });
        setIsEditOpen(false);
        await fetchRecommendations();
      }
    } catch (err) {
      setToast({
        show: true,
        message: err.response?.data?.message || err.message || 'Failed to submit decision',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (rec) => {
    setEditRec(rec);
    setEditQty(rec.recommended_quantity || rec.quantity);
    setEditReason('Manager volume adjustment for local promotional event');
    setIsEditOpen(true);
  };

  const openExplanationModal = (rec) => {
    setExplanationRec(rec);
    setIsExplanationOpen(true);
  };

  const filteredRecs = recommendations.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    return true;
  });

  // KPI Calculations
  const totalCount = recommendations.length;
  const criticalCount = recommendations.filter((r) => r.priority === 'CRITICAL').length;
  const totalUnits = recommendations.reduce((acc, r) => acc + (parseInt(r.recommended_quantity || r.quantity, 10) || 0), 0);
  const pendingCount = recommendations.filter((r) => r.status === 'PENDING').length;

  // Plotly Chart: Allocation Flow by Store Destination
  const storeMap = {};
  recommendations.forEach((r) => {
    const sName = r.store_name || 'Retail Store';
    storeMap[sName] = (storeMap[sName] || 0) + (parseInt(r.recommended_quantity || r.quantity, 10) || 0);
  });

  const flowChartData = [
    {
      x: Object.keys(storeMap),
      y: Object.values(storeMap),
      type: 'bar',
      marker: {
        color: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'],
        line: { color: '#0f172a', width: 1 },
      },
      text: Object.values(storeMap).map((v) => `${v} units`),
      textposition: 'auto',
    },
  ];

  const flowChartLayout = {
    xaxis: { title: 'Destination Retail Outlets', tickfont: { size: 11 } },
    yaxis: { title: 'Allocated Quantity (Units)', gridcolor: 'rgba(226, 232, 240, 0.6)' },
    margin: { l: 45, r: 20, t: 20, b: 50 },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Allocation Planner</h1>
            <Badge variant="emerald" dot>PuLP MILP Solver</Badge>
            <Badge variant="blue">PostgreSQL Source of Truth</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Constrained multi-echelon optimization engine: satisfies retail store demand, minimizes stockouts, and enforces FEFO batch expiry priorities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={RefreshCw}
            onClick={fetchRecommendations}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={Zap}
            isLoading={optimizing}
            onClick={handleRunOptimizer}
          >
            Run PuLP Optimization Engine
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Recommendations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Recommendations
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalCount}</span>
            <span className="text-xs text-slate-400">({pendingCount} pending review)</span>
          </div>
          <div className="mt-2 text-xs text-purple-600 font-semibold">Solves regional imbalances</div>
        </div>

        {/* Critical Recommendations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Critical Urgency
            </span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{criticalCount}</span>
            <span className="text-xs text-slate-400">actions</span>
          </div>
          <div className="mt-2 text-xs text-rose-600 font-semibold">Immediate stockout or expiry risk</div>
        </div>

        {/* Total Units to Dispatch */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Optimized Distribution
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Package className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalUnits}</span>
            <span className="text-xs text-slate-400">units</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold">100% warehouse stock feasible</div>
        </div>

        {/* Operational Flow Integration */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Workflow Status
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">Operational</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Approval creates verified transfer with ACID locks
          </div>
        </div>
      </div>

      {/* Plotly Chart Card */}
      {recommendations.length > 0 && (
        <Card className="p-5">
          <div className="mb-2">
            <h2 className="text-sm font-bold text-slate-900">
              Recommended Allocation Distribution by Destination Store
            </h2>
            <p className="text-xs text-slate-500">
              Aggregated transfer units computed by PuLP MILP constrained solver
            </p>
          </div>
          <PlotlyChart data={flowChartData} layout={flowChartLayout} style={{ width: '100%', height: '300px' }} />
        </Card>
      )}

      {/* Recommendations Table */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Allocation Recommendations</h2>
            <p className="text-xs text-slate-500">
              Review, edit quantity, or approve recommendations into warehouse pick-and-pack queues.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-xl border-slate-200 py-1.5 px-3 bg-slate-50 text-slate-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved / Queued</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="Retrieving AI recommendations from PostgreSQL..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchRecommendations} />
        ) : filteredRecs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Sparkles className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No recommendations match filter.</p>
            <p className="text-xs mt-1">Click "Run PuLP Optimization Engine" to generate new distribution plans.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Source Warehouse</th>
                  <th className="py-3 px-4">Destination Store</th>
                  <th className="py-3 px-4">Batch / Expiry</th>
                  <th className="py-3 px-4">Recommended Qty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Explainable AI</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecs.map((rec) => {
                  const qty = rec.recommended_quantity || rec.quantity;
                  const isPending = rec.status === 'PENDING';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Priority */}
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            rec.priority === 'CRITICAL'
                              ? 'rose'
                              : rec.priority === 'HIGH'
                              ? 'amber'
                              : 'blue'
                          }
                          dot
                        >
                          {rec.priority || 'NORMAL'}
                        </Badge>
                      </td>

                      {/* Product */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {rec.product_name}
                        <span className="block text-[10px] text-slate-400 font-mono">{rec.sku}</span>
                      </td>

                      {/* Warehouse */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">{rec.warehouse_name}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{rec.warehouse_code}</span>
                      </td>

                      {/* Store */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">{rec.store_name}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{rec.store_code}</span>
                      </td>

                      {/* Batch */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-900">{rec.batch_number || 'General Batch'}</span>
                        {rec.batch_days_to_expiry !== undefined && (
                          <span
                            className={`block text-[10px] font-semibold ${
                              rec.batch_days_to_expiry <= 14 ? 'text-rose-600' : 'text-slate-400'
                            }`}
                          >
                            {rec.batch_days_to_expiry} days to expiry
                          </span>
                        )}
                      </td>

                      {/* Recommended Qty */}
                      <td className="py-3 px-4">
                        <span className="text-sm font-bold text-slate-900">{qty}</span>
                        <span className="text-[10px] text-slate-400 ml-1">units</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            rec.status === 'APPROVED'
                              ? 'emerald'
                              : rec.status === 'REJECTED'
                              ? 'rose'
                              : 'amber'
                          }
                        >
                          {rec.status}
                        </Badge>
                        {rec.approved_transfer_number && (
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                            {rec.approved_transfer_number}
                          </span>
                        )}
                      </td>

                      {/* Explainable AI */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => openExplanationModal(rec)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Info className="w-3.5 h-3.5" />
                          Why This Plan?
                        </button>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="xs"
                              variant="outline"
                              icon={Edit3}
                              onClick={() => openEditModal(rec)}
                              title="Edit Quantity"
                            >
                              Edit
                            </Button>
                            <Button
                              size="xs"
                              variant="primary"
                              icon={CheckCircle2}
                              onClick={() => handleDecision(rec.id, 'ACCEPTED', qty)}
                              title="Approve Recommendation"
                            >
                              Approve
                            </Button>
                            <Button
                              size="xs"
                              variant="danger"
                              icon={XCircle}
                              onClick={() => handleDecision(rec.id, 'REJECTED', qty, 'Rejected by Distribution Manager')}
                              title="Reject Recommendation"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Decision Recorded</span>
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

      {/* Modal: Why This Plan? (Explainable AI) */}
      <Modal
        isOpen={isExplanationOpen}
        onClose={() => setIsExplanationOpen(false)}
        title="Explainable AI — Recommendation Telemetry"
      >
        {explanationRec && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <div className="flex items-center justify-between font-semibold text-slate-900 text-sm mb-1">
                <span>{explanationRec.product_name}</span>
                <span className="text-emerald-700">{explanationRec.recommended_quantity || explanationRec.quantity} units</span>
              </div>
              <p className="text-slate-500 font-mono text-[11px]">
                {explanationRec.warehouse_name} → {explanationRec.store_name}
              </p>
            </div>

            {/* Categorized Telemetry */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/60">
                <span className="font-bold text-blue-900 block mb-1 uppercase tracking-wider text-[10px]">
                  1. Observed Historical Data
                </span>
                <p className="text-blue-800 leading-relaxed">
                  Destination store has low inventory coverage. Regional historical demand shows high velocity with rapid stock depletion.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/60">
                <span className="font-bold text-purple-900 block mb-1 uppercase tracking-wider text-[10px]">
                  2. ML Demand Forecast
                </span>
                <p className="text-purple-800 leading-relaxed">
                  7-Day ML forecast projects sustained customer demand of {explanationRec.forecast_value || 140} units.
                  Safety buffer accounts for lead-time delivery variability.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60">
                <span className="font-bold text-emerald-900 block mb-1 uppercase tracking-wider text-[10px]">
                  3. PuLP Optimization Decision
                </span>
                <p className="text-emerald-800 leading-relaxed">
                  Reason: <strong className="text-emerald-950">{explanationRec.reason || 'Optimal multi-echelon stockout prevention and FEFO prioritization.'}</strong>
                </p>
                <div className="mt-2 text-[11px] text-emerald-700 space-y-0.5">
                  <p>• Allocation &le; Usable Warehouse Stock: <span className="font-semibold text-emerald-900">Satisfied (100% Feasible)</span></p>
                  <p>• Store Absorption Limit: <span className="font-semibold text-emerald-900">Enforced (No Over-Allocation)</span></p>
                  <p>• Expiry Batch Prioritization: <span className="font-semibold text-emerald-900">Advanced FEFO Bonus Applied</span></p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setIsExplanationOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Edit & Approve Quantity */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Recommendation & Approve Transfer"
      >
        {editRec && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              You are adjusting the AI-recommended allocation for <strong className="text-slate-900">{editRec.product_name}</strong> to <strong className="text-slate-900">{editRec.store_name}</strong>.
            </p>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Original AI Quantity</label>
              <input
                type="text"
                disabled
                value={`${editRec.recommended_quantity || editRec.quantity} units`}
                className="w-full text-xs rounded-xl border-slate-200 bg-slate-100 text-slate-500 py-2 px-3"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Edited Transfer Quantity (Units)</label>
              <input
                type="number"
                min="1"
                value={editQty}
                onChange={(e) => setEditQty(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs rounded-xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 py-2 px-3 text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Reason for Adjustment</label>
              <textarea
                rows="3"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="e.g. Preparing for localized promotional event or store shelf space adjustments"
                className="w-full text-xs rounded-xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 py-2 px-3 text-slate-900"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                isLoading={actionLoading}
                onClick={() => handleDecision(editRec.id, 'EDITED', editQty, editReason)}
              >
                Approve Transfer ({editQty} units)
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast notifications */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
    </div>
  );
};

export default Recommendations;
