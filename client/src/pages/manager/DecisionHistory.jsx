import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import {
  History,
  RefreshCw,
  UserCheck,
  Shield,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  Package,
  Truck,
  PackageCheck,
  ArrowRight,
} from 'lucide-react';

export const DecisionHistory = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.getDecisionHistory();
      if (res.success) {
        setEvents(res.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load decision history audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getActionBadge = (action) => {
    switch (action) {
      case 'APPROVED':
        return <Badge variant="emerald" dot>Manager Approved</Badge>;
      case 'EDITED':
        return <Badge variant="blue" dot>Manager Edited &amp; Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="rose" dot>Manager Rejected</Badge>;
      case 'PICKED':
        return <Badge variant="teal" dot>Warehouse Picked</Badge>;
      case 'PACKED':
        return <Badge variant="indigo" dot>Warehouse Packed</Badge>;
      case 'DISPATCHED':
        return <Badge variant="purple" dot>Dispatched in Transit</Badge>;
      case 'RECEIVED':
        return <Badge variant="emerald" dot>Store Received &amp; Stock Added</Badge>;
      default:
        return <Badge variant="gray">{action}</Badge>;
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    try {
      const date = new Date(ts);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  if (loading) return <LoadingSpinner text="Retrieving decision traceability log from PostgreSQL..." />;
  if (error) return <ErrorState message={error} onRetry={fetchHistory} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Decision History &amp; Traceability</h1>
            <Badge variant="emerald" dot>PostgreSQL Immutable Audit Trail</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end operational lifecycle: from ML inference &amp; PuLP optimization to manager review, picking, dispatch, and retail store stock addition.
          </p>
        </div>

        <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchHistory}>
          Refresh Audit Trail
        </Button>
      </div>

      {/* 7-Stage Process Lifecycle Flow Visualization */}
      <Card className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Autonomous to Physical Workflow Stages
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          {[
            { step: '1', title: 'ML Forecast', desc: 'GBR Time-Series', icon: Sparkles, color: 'text-purple-400' },
            { step: '2', title: 'PuLP Solver', desc: 'MILP Allocation', icon: Zap, color: 'text-blue-400' },
            { step: '3', title: 'Manager Decision', desc: 'Accept / Edit', icon: CheckCircle2, color: 'text-emerald-400' },
            { step: '4', title: 'Warehouse Pick', desc: 'Physical Batch', icon: Package, color: 'text-teal-400' },
            { step: '5', title: 'Order Pack', desc: 'Container Seal', icon: Shield, color: 'text-indigo-400' },
            { step: '6', title: 'Dispatch', desc: 'Route In-Transit', icon: Truck, color: 'text-amber-400' },
            { step: '7', title: 'Store Receive', desc: 'PostgreSQL Influx', icon: PackageCheck, color: 'text-emerald-400' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center">
                <Icon className={`w-5 h-5 ${s.color} mb-1.5`} />
                <span className="text-[11px] font-bold text-white block">{s.title}</span>
                <span className="text-[10px] text-slate-400">{s.desc}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* History Table */}
      <Card noPadding>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Recorded Audit Events ({events.length})</h2>
          <Badge variant="blue">Real User &amp; System Attribution</Badge>
        </div>

        {events.length === 0 ? (
          <EmptyState
            icon={History}
            title="No decision events recorded yet"
            description="Audit events will appear here as managers approve recommendations and warehouse teams execute transfers."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Transfer / Reference</th>
                  <th className="py-3 px-4">Product &amp; Route</th>
                  <th className="py-3 px-4">Action Taken</th>
                  <th className="py-3 px-4">Operator / Role</th>
                  <th className="py-3 px-4">Justification &amp; Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((ev) => {
                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {formatTimestamp(ev.timestamp)}
                      </td>

                      {/* Transfer Reference */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {ev.transfer_number || (ev.transfer_id ? `TR-${ev.transfer_id}` : 'AI-SYSTEM')}
                        {ev.transfer_quantity && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Qty: {ev.transfer_quantity} units
                          </span>
                        )}
                      </td>

                      {/* Product & Route */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{ev.product_name || 'FMCG SKU'}</span>
                        {(ev.warehouse_name || ev.store_name) && (
                          <span className="block text-[10px] text-slate-400">
                            {ev.warehouse_name || 'WH'} → {ev.store_name || 'Store'}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4">{getActionBadge(ev.action)}</td>

                      {/* User */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{ev.user_name || 'Central Manager'}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {ev.user_role || 'DISTRIBUTION_MANAGER'}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                        {ev.reason || 'Executed as per multi-echelon optimization recommendation'}
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

export default DecisionHistory;
