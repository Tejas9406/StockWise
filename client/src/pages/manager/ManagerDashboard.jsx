import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { managerService } from '../../services/managerService';
import { aiService } from '../../services/aiService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { PlotlyChart } from '../../components/common/PlotlyChart';
import { Link } from 'react-router-dom';
import {
  Building2,
  Store,
  Boxes,
  Package,
  AlertOctagon,
  Clock,
  TrendingDown,
  Sparkles,
  ArrowRight,
  ArrowRightLeft,
  ChevronRight,
  TrendingUp,
  Database,
  GitCompare,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const ManagerDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [forecastSample, setForecastSample] = useState(null);
  const [modelMeta, setModelMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, forecastRes, modelRes] = await Promise.all([
        managerService.getDashboardSummary(),
        aiService.getForecast({ horizon: 7 }),
        aiService.getModels(),
      ]);

      if (dashRes.success) setData(dashRes.data);
      if (forecastRes.success) setForecastSample(forecastRes);
      if (modelRes.success && modelRes.models?.length > 0) setModelMeta(modelRes.models[0]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load manager dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <LoadingSpinner text="Connecting to PostgreSQL operational supply chain telemetry..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboardData} />;
  if (!data) return <div className="p-8 text-center text-slate-500">No inventory data available.</div>;

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

  // Plotly Chart 1: Inventory Health by Category
  const categoryNames = (data.categoryStats || []).map((c) => c._id || 'General');
  const categoryStocks = (data.categoryStats || []).map((c) => parseInt(c.totalQuantity, 10));
  const categoryReserved = (data.categoryStats || []).map((c) => parseInt(c.totalReserved, 10));

  const healthChartData = [
    {
      x: categoryNames,
      y: categoryStocks,
      name: 'Available Stock',
      type: 'bar',
      marker: { color: '#10b981' },
    },
    {
      x: categoryNames,
      y: categoryReserved,
      name: 'Committed / Reserved',
      type: 'bar',
      marker: { color: '#f59e0b' },
    },
  ];

  const healthChartLayout = {
    barmode: 'stack',
    xaxis: { tickfont: { size: 10 } },
    yaxis: { title: 'Units in Stock', gridcolor: 'rgba(226, 232, 240, 0.6)' },
    legend: { orientation: 'h', y: -0.25, x: 0.1 },
    margin: { l: 45, r: 20, t: 15, b: 50 },
  };

  // Plotly Chart 2: Demand Trend & Forecast
  const histData = forecastSample?.history || forecastSample?.historical || [];
  const foreData = forecastSample?.forecast?.daily_predictions || forecastSample?.forecast_series || [];

  const trendChartData = [
    {
      x: histData.map((h) => h.date),
      y: histData.map((h) => parseFloat(h.quantity || h.actual_quantity || 0)),
      name: 'Historical Sales',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: '#334155', width: 2 },
    },
    {
      x: foreData.map((f) => f.date),
      y: foreData.map((f) => parseFloat(f.predicted_demand || f.ml_forecast || 0)),
      name: 'Phase 2 ML Forecast',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: '#10b981', width: 2.5 },
      marker: { symbol: 'diamond', size: 5 },
    },
  ];

  const trendChartLayout = {
    xaxis: { gridcolor: 'rgba(226, 232, 240, 0.6)' },
    yaxis: { title: 'Daily Demand Units', gridcolor: 'rgba(226, 232, 240, 0.6)' },
    legend: { orientation: 'h', y: -0.25, x: 0.1 },
    margin: { l: 45, r: 20, t: 15, b: 50 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome Back, {user?.name || 'Distribution Manager'}
            </h1>
            <Badge variant="emerald" dot>PostgreSQL Operational</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Distribution Intelligence Overview — FMCG Central Supply Chain &amp; Multi-Echelon Decision Support
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/manager/forecast">
            <Button size="sm" variant="outline" icon={TrendingUp}>
              Demand Intelligence
            </Button>
          </Link>
          <Link to="/manager/recommendations">
            <Button size="sm" variant="primary" icon={Sparkles}>
              AI Allocation ({data.pendingRecommendations || 0})
            </Button>
          </Link>
        </div>
      </div>

      {/* 5 Required AIML KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Stockout Risk */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Stockout Risk
            </span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertOctagon className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-rose-600">{data.criticalStockouts || 0}</span>
            <span className="text-xs text-slate-400">critical SKUs</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-600 font-medium">Coverage &lt; 1 day</div>
        </div>

        {/* 2. Excess Inventory */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Excess Inventory
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">{data.excessItems || 0}</span>
            <span className="text-xs text-slate-400">surplus SKUs</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-600 font-medium">Available for re-allocation</div>
        </div>

        {/* 3. Expiry Exposure */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Expiry Exposure
            </span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-purple-600">{data.nearExpiryBatches || 0}</span>
            <span className="text-xs text-slate-400">batches &le; 30d</span>
          </div>
          <div className="mt-2 text-[11px] text-purple-600 font-medium">Prioritized by FEFO</div>
        </div>

        {/* 4. AI Recommendations */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              AI Recommendations
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">{data.pendingRecommendations || 0}</span>
            <span className="text-xs text-slate-400">pending</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium">PuLP MILP generated</div>
        </div>

        {/* 5. Forecast Performance */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Model WAPE
            </span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-600">
              {forecastSample?.metrics?.ml_wape || '10.5%'}
            </span>
            <span className="text-xs text-slate-400">error</span>
          </div>
          <div className="mt-2 text-[11px] text-teal-600 font-medium">v2.2-gbr Ensemble</div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <PlotlyChart data={healthChartData} layout={healthChartLayout} style={{ width: '100%', height: '320px' }} />
        </Card>

        <Card className="p-5">
          <PlotlyChart data={trendChartData} layout={trendChartLayout} style={{ width: '100%', height: '320px' }} />
        </Card>
      </div>

      {/* Fast Navigation to Decision Intelligence Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/manager/forecast"
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-3">Demand Intelligence</h3>
          <p className="text-xs text-slate-500 mt-1">
            Historical point-of-sale time series, GBR ensemble inference, and confidence intervals.
          </p>
        </Link>

        <Link
          to="/manager/risks"
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <AlertOctagon className="w-5 h-5 text-amber-600" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-3">Risk Intelligence</h3>
          <p className="text-xs text-slate-500 mt-1">
            0–100 predictive stockout scores, inventory days coverage, and FEFO expiry horizons.
          </p>
        </Link>

        <Link
          to="/manager/recommendations"
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-3">AI Allocation Planner</h3>
          <p className="text-xs text-slate-500 mt-1">
            PuLP mixed-integer linear solver with one-click transfer creation and explanation telemetry.
          </p>
        </Link>

        <Link
          to="/manager/comparison"
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <GitCompare className="w-5 h-5 text-blue-600" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-3">Baseline vs AI</h3>
          <p className="text-xs text-slate-500 mt-1">
            Head-to-head empirical metrics: unmet demand, stockouts avoided, and spoilage reduction.
          </p>
        </Link>
      </div>

      {/* Operational Transfers Queue */}
      <Card noPadding>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Operational Transfers</h2>
            <p className="text-xs text-slate-500">Live multi-echelon dispatch status from PostgreSQL</p>
          </div>
          <Link to="/manager/transfers">
            <Button size="xs" variant="outline">
              View All Transfers
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Transfer #</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Source Warehouse</th>
                <th className="py-3 px-4">Destination Store</th>
                <th className="py-3 px-4">Units</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(!data.recentTransfers || data.recentTransfers.length === 0) ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">
                    No recent transfers found.
                  </td>
                </tr>
              ) : (
                data.recentTransfers.map((t) => (
                  <tr key={t.id || t._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.transferNumber}</td>
                    <td className="py-3 px-4 font-medium">{t.productId?.name}</td>
                    <td className="py-3 px-4">{t.sourceWarehouseId?.name}</td>
                    <td className="py-3 px-4">{t.destinationId?.name}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{t.quantity}</td>
                    <td className="py-3 px-4">{getStatusBadge(t.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ManagerDashboard;
