import React, { useState, useEffect } from 'react';
import { storeService } from '../../services/storeService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  RefreshCw,
  Package,
  AlertTriangle,
  ArrowRight,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export const StoreDemandForecast = () => {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHorizon, setSelectedHorizon] = useState('14d'); // '7d', '14d', '30d'

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storeService.getDemandForecast();
      if (res && res.success) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.forecasts || []);
        setForecasts(list);
      } else {
        setForecasts([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load store demand forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  if (loading) return <LoadingSpinner text="Computing store demand projections from sales history..." />;
  if (error) return <ErrorState message={error} onRetry={fetchForecast} />;

  // Dynamic calculations based on selected horizon
  const totalDemand = forecasts.reduce((sum, f) => {
    const val = selectedHorizon === '7d' ? (f.forecast7d || 0) : selectedHorizon === '30d' ? (f.forecast30d || 0) : (f.forecast14d || 0);
    return sum + val;
  }, 0);

  const urgentCount = forecasts.filter((f) => f.status === 'REORDER_URGENT' || (f.replenishmentNeed || 0) > 0).length;
  const avgVelocity = forecasts.length > 0
    ? (forecasts.reduce((sum, f) => sum + (f.averageDailySales || 0), 0) / forecasts.length).toFixed(1)
    : '0.0';

  const horizonDays = selectedHorizon === '7d' ? 7 : selectedHorizon === '30d' ? 30 : 14;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store Demand Projections</h1>
            <Badge variant="emerald" dot>Live Sales Telemetry</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Product-level consumption velocity, stock coverage runway, and horizon demand projections
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Horizon Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {[
              { id: '7d', label: '7 Days' },
              { id: '14d', label: '14 Days' },
              { id: '30d', label: '30 Days' },
            ].map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelectedHorizon(h.id)}
                className={`text-xs py-1.5 px-3 rounded-lg font-semibold transition-all ${
                  selectedHorizon === h.id
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>

          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchForecast}>
            Refresh
          </Button>

          <Link to="/store/requirements">
            <Button size="sm" variant="primary" icon={Package}>
              Order Replenishment
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projected Demand */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {horizonDays}-Day Projected Demand
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalDemand.toLocaleString()}</span>
            <span className="text-xs text-slate-400">units</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium">
            Projected customer consumption across shelf SKUs
          </div>
        </div>

        {/* Average Daily Velocity */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Avg Daily Velocity
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Flame className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{avgVelocity}</span>
            <span className="text-xs text-slate-400">units/day</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Calculated over 30 days POS transaction history
          </div>
        </div>

        {/* Replenishment Alerts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Items Below Reorder
            </span>
            <span className={`p-2 rounded-xl ${urgentCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {urgentCount > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${urgentCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {urgentCount}
            </span>
            <span className="text-xs text-slate-400">products</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {urgentCount > 0 ? 'Replenishment order recommended' : 'All shelf stock levels healthy'}
          </div>
        </div>

        {/* Catalog Monitored */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Catalog Products Monitored
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Package className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{forecasts.length}</span>
            <span className="text-xs text-slate-400">active SKUs</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Automated reorder point tracking active
          </div>
        </div>
      </div>

      {/* Demand Telemetry Grid */}
      <Card noPadding>
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Product Consumption Velocity &amp; Demand Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live consumption rates, remaining days of shelf supply, and recommended reorder units
            </p>
          </div>
          <Badge variant="blue">{horizonDays}-Day Horizon Applied</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Daily Velocity</th>
                <th className="py-3 px-4 text-right">{horizonDays}D Demand</th>
                <th className="py-3 px-4 text-center">Stock Runway</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forecasts.map((f, idx) => {
                const projectedVal = selectedHorizon === '7d' ? (f.forecast7d || 0) : selectedHorizon === '30d' ? (f.forecast30d || 0) : (f.forecast14d || 0);
                const isUrgent = f.status === 'REORDER_URGENT' || f.currentStock <= f.reorderPoint;
                const runway = f.stockCoverageDays || 0;

                return (
                  <tr key={f.productId || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{f.productName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">SKU: {f.sku}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <Badge variant="gray">{f.category}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {f.currentStock} {f.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">
                      {f.averageDailySales} /day
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-600">
                      {projectedVal} units
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                          runway <= 7
                            ? 'bg-rose-50 text-rose-700 font-bold'
                            : runway <= 14
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {runway} days
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isUrgent ? (
                        <Badge variant="rose" dot>Reorder Urgent</Badge>
                      ) : (
                        <Badge variant="emerald" dot>Stock Adequate</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link to="/store/requirements">
                        <Button size="xs" variant={isUrgent ? 'primary' : 'outline'}>
                          Order Stock
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
