import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bell, AlertTriangle, AlertCircle, ShieldAlert, Sparkles,
  ArrowRight, RefreshCw, CheckCircle, Clock, Package, Filter,
  ExternalLink, Zap
} from 'lucide-react';
import aiService from '../../services/aiService';

export const AlertCenter = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({ critical: 0, high: 0, medium: 0, low: 0 });
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await aiService.getAlerts();
      if (res?.success) {
        setAlerts(res.alerts || []);
        setSummary(res.summary || { critical: 0, high: 0, medium: 0, low: 0 });
      }
    } catch (err) {
      console.error('Failed to load intelligence alerts:', err);
      setError('Failed to fetch real-time intelligence alerts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const filteredAlerts = alerts.filter(a => {
    if (activeFilter === 'ALL') return true;
    return a.severity === activeFilter;
  });

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleAction = (alert) => {
    if (alert.type === 'STOCKOUT_RISK' || alert.type === 'ACTION_REQUIRED') {
      navigate('/manager/recommendations');
    } else if (alert.type === 'EXPIRY_RISK') {
      navigate('/manager/recommendations');
    } else if (alert.type === 'EXCESS_INVENTORY') {
      navigate('/manager/simulation');
    } else {
      navigate('/manager/recommendations');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
              Real-Time Telemetry
            </span>
            <span className="text-xs text-slate-400">• Autonomous Anomaly & Risk Detection</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Bell className="w-7 h-7 text-rose-600" />
            Intelligence Alerts & Action Center
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Proactive early-warning signals across stockout threats, expiring batches, and distribution imbalances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/manager/simulation')}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Simulate Crisis Scenario
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition disabled:opacity-50"
            title="Refresh Alerts"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          {error}
        </div>
      )}

      {/* ─── Severity Filter Bar ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Alerts ({alerts.length})
        </button>

        <button
          onClick={() => setActiveFilter('CRITICAL')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
            activeFilter === 'CRITICAL'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
          }`}
        >
          Critical ({summary.critical})
        </button>

        <button
          onClick={() => setActiveFilter('HIGH')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
            activeFilter === 'HIGH'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
          }`}
        >
          High ({summary.high})
        </button>

        <button
          onClick={() => setActiveFilter('MEDIUM')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
            activeFilter === 'MEDIUM'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
          }`}
        >
          Medium ({summary.medium})
        </button>
      </div>

      {/* ─── Alerts Feed ─── */}
      {filteredAlerts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-900">All Systems Nominal</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No active {activeFilter !== 'ALL' ? activeFilter.toLowerCase() : ''} risk alerts currently detected in the operational network.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`p-5 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                alert.severity === 'CRITICAL' ? 'border-l-4 border-l-rose-500' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-700'
                      : alert.severity === 'HIGH'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {alert.type === 'STOCKOUT_RISK' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : alert.type === 'EXPIRY_RISK' ? (
                    <Clock className="w-5 h-5" />
                  ) : alert.type === 'EXCESS_INVENTORY' ? (
                    <Package className="w-5 h-5" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityBadge(
                        alert.severity
                      )}`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {alert.type}
                    </span>
                    <span className="text-[11px] text-slate-400">• Just now</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    {alert.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {alert.message}
                  </p>
                  <div className="mt-2 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block border border-emerald-100">
                    💡 Suggested: {alert.action}
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-end md:self-auto">
                <button
                  onClick={() => handleAction(alert)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                >
                  <span>Resolve Alert</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertCenter;
