import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { PlotlyChart } from '../../components/common/PlotlyChart';
import {
  AlertTriangle,
  AlertOctagon,
  Clock,
  TrendingDown,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Archive,
  RefreshCw,
  Layers,
  Store as StoreIcon,
  Building2,
  Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const RiskAlerts = () => {
  const [riskData, setRiskData] = useState(null);
  const [expiryData, setExpiryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'STOCKOUT', 'EXCESS', 'EXPIRY'

  const fetchRisks = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [riskRes, expRes] = await Promise.all([
        aiService.getRiskAssessment(),
        aiService.getExpiryIntelligence(),
      ]);

      if (riskRes.success) setRiskData(riskRes);
      if (expRes.success) setExpiryData(expRes);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load risk intelligence');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRisks();
  }, []);

  if (loading) return <LoadingSpinner text="Computing predictive stockout risk, excess inventory, and expiry exposure..." />;
  if (error) return <ErrorState message={error} onRetry={() => fetchRisks()} />;

  const stockoutRisks = riskData?.assessments || riskData?.stockout_risks || [];
  const excessInventory = stockoutRisks.filter((a) => a.excess_quantity > 0 || (a.excess_severity && a.excess_severity !== 'NONE'));
  const expiryBatches = expiryData?.batches || expiryData?.fefo_ranking || [];

  // Filter items
  const filteredStockouts = stockoutRisks.filter((item) => {
    const sev = item.stockout_severity || item.severity || 'LOW';
    if (severityFilter !== 'ALL' && sev !== severityFilter) return false;
    return true;
  });

  // Plotly Scatter Chart: Coverage Days vs Predictive Stockout Risk Score
  const scatterTraces = [
    {
      x: stockoutRisks.map((i) => i.coverage_days),
      y: stockoutRisks.map((i) => i.stockout_risk_score ?? i.stockout_probability_score ?? 0),
      text: stockoutRisks.map(
        (i) => `${i.product_name} (${i.store_name})<br>Stock: ${i.current_stock} | Coverage: ${i.coverage_days}d | Score: ${i.stockout_risk_score || 0}`
      ),
      mode: 'markers',
      type: 'scatter',
      marker: {
        size: 14,
        color: stockoutRisks.map((i) => {
          const sev = i.stockout_severity || i.severity;
          return sev === 'CRITICAL' ? '#ef4444' : sev === 'HIGH' ? '#f59e0b' : '#3b82f6';
        }),
        line: { color: '#ffffff', width: 2 },
      },
      name: 'Retail SKU Risk Position',
    },
  ];

  const scatterLayout = {
    xaxis: {
      title: 'Coverage Days Remaining (Current Stock / Daily Velocity)',
      gridcolor: 'rgba(226, 232, 240, 0.6)',
    },
    yaxis: {
      title: 'Predictive Stockout Risk Score (0–100)',
      range: [0, 105],
      gridcolor: 'rgba(226, 232, 240, 0.6)',
    },
    margin: { l: 50, r: 20, t: 20, b: 45 },
    hovermode: 'closest',
  };

  // Plotly Bar Chart: Expiry Risk & Shelf Life Remaining
  const expiryTraces = [
    {
      x: expiryBatches.map((b) => `${b.batch_number}<br>(${b.product_name || 'SKU'})`),
      y: expiryBatches.map((b) => b.days_until_expiry),
      type: 'bar',
      marker: {
        color: expiryBatches.map((b) =>
          b.days_until_expiry <= 14 ? '#ef4444' : b.days_until_expiry <= 30 ? '#f59e0b' : '#10b981'
        ),
      },
      text: expiryBatches.map((b) => `${b.quantity} units`),
      textposition: 'auto',
      name: 'Days to Expiry',
    },
  ];

  const expiryLayout = {
    xaxis: { title: 'Batch Identifier', tickangle: -20, tickfont: { size: 10 } },
    yaxis: { title: 'Days Until Expiry', gridcolor: 'rgba(226, 232, 240, 0.6)' },
    margin: { l: 45, r: 20, t: 20, b: 65 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Risk Intelligence</h1>
            <Badge variant="emerald" dot>Predictive &amp; Deterministic Engine</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-echelon risk telemetry: stockout vulnerability, excess capital tie-up, and FEFO expiry tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={RefreshCw}
            isLoading={refreshing}
            onClick={() => fetchRisks(true)}
          >
            Re-evaluate Risks
          </Button>
          <Link to="/manager/recommendations">
            <Button size="sm" variant="primary" icon={Sparkles}>
              Solve via PuLP Optimizer
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Stockouts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Critical Stockouts
            </span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertOctagon className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">
              {riskData?.summary?.critical_stockouts ?? stockoutRisks.filter((i) => (i.stockout_severity || i.severity) === 'CRITICAL').length}
            </span>
            <span className="text-xs text-slate-400">SKUs &lt; 1 day coverage</span>
          </div>
          <div className="mt-2 text-xs text-rose-600 font-semibold">Immediate transfer required</div>
        </div>

        {/* High Risk Items */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              High Stockout Risk
            </span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">
              {riskData?.summary?.high_stockouts ?? stockoutRisks.filter((i) => (i.stockout_severity || i.severity) === 'HIGH').length}
            </span>
            <span className="text-xs text-slate-400">SKUs &lt; lead time</span>
          </div>
          <div className="mt-2 text-xs text-amber-600 font-semibold">Order replenishment</div>
        </div>

        {/* Excess Inventory */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Excess Inventory
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Archive className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{excessInventory.length}</span>
            <span className="text-xs text-slate-400">positions</span>
          </div>
          <div className="mt-2 text-xs text-blue-600 font-semibold">
            {excessInventory.reduce((acc, i) => acc + (i.excess_quantity || 0), 0)} units surplus
          </div>
        </div>

        {/* Expiry Risk Batches */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Near-Expiry Batches
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-600">
              {expiryBatches.filter((b) => b.days_until_expiry <= 30).length}
            </span>
            <span className="text-xs text-slate-400">batches &le; 30d</span>
          </div>
          <div className="mt-2 text-xs text-purple-600 font-semibold">Prioritized by FEFO engine</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <PlotlyChart data={scatterTraces} layout={scatterLayout} style={{ width: '100%', height: '340px' }} />
        </Card>

        <Card className="p-5">
          <PlotlyChart data={expiryTraces} layout={expiryLayout} style={{ width: '100%', height: '340px' }} />
        </Card>
      </div>

      {/* Tabs and Risk Table */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            {[
              { id: 'ALL', label: 'All Stockout Risks' },
              { id: 'EXCESS', label: 'Excess Inventory' },
              { id: 'EXPIRY', label: 'Expiry & FEFO Batches' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'ALL' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="text-xs rounded-xl border-slate-200 py-1.5 px-3 bg-slate-50 text-slate-800"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="HIGH">High Only</option>
                <option value="MEDIUM">Medium Only</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Stockouts Table */}
        {activeTab === 'ALL' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Retail Store</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Sales Velocity</th>
                  <th className="py-3 px-4">Coverage</th>
                  <th className="py-3 px-4">Predictive Score</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStockouts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400">
                      No stockout risks matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStockouts.map((item, idx) => {
                    const sev = item.stockout_severity || item.severity || 'LOW';
                    const score = Math.round(item.stockout_risk_score ?? item.stockout_probability_score ?? 0);
                    const velocity = item.daily_demand || item.daily_sales_velocity || 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <Badge
                            variant={sev === 'CRITICAL' ? 'rose' : sev === 'HIGH' ? 'amber' : 'blue'}
                            dot
                          >
                            {sev}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {item.product_name}
                          <span className="block text-[10px] text-slate-400 font-mono">{item.sku}</span>
                        </td>
                        <td className="py-3 px-4">{item.store_name}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{item.current_stock} units</td>
                        <td className="py-3 px-4">{velocity} units/day</td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              item.coverage_days <= 1.0 ? 'text-rose-600' : 'text-amber-600'
                            }`}
                          >
                            {item.coverage_days} days
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  score >= 80 ? 'bg-rose-500' : score >= 50 ? 'bg-amber-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(100, score)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-semibold">{score}</span>
                          </div>
                        </td>
                      <td className="py-3 px-4 text-right">
                        <Link to="/manager/recommendations">
                          <Button size="xs" variant="outline" icon={Sparkles}>
                            Allocate
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Excess Inventory Table */}
        {activeTab === 'EXCESS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Warehouse Location</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Usable Inventory</th>
                  <th className="py-3 px-4">Projected Demand</th>
                  <th className="py-3 px-4">Calculated Excess</th>
                  <th className="py-3 px-4">Coverage Days</th>
                  <th className="py-3 px-4 text-right">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {excessInventory.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No surplus warehouse inventory detected.
                    </td>
                  </tr>
                ) : (
                  excessInventory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{item.warehouse_name}</td>
                      <td className="py-3 px-4">{item.product_name}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{item.usable_inventory} units</td>
                      <td className="py-3 px-4">{item.expected_demand} units</td>
                      <td className="py-3 px-4 font-bold text-blue-600">+{item.excess_quantity} units</td>
                      <td className="py-3 px-4">{item.coverage_days} days</td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant="blue">Available for Allocation</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Expiry & FEFO Batches Table */}
        {activeTab === 'EXPIRY' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Current Location</th>
                  <th className="py-3 px-4">Batch Quantity</th>
                  <th className="py-3 px-4">Days to Expiry</th>
                  <th className="py-3 px-4">FEFO Priority</th>
                  <th className="py-3 px-4">Store Absorption Feasibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {expiryBatches.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No active batches found in PostgreSQL.
                    </td>
                  </tr>
                ) : (
                  expiryBatches.map((batch, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{batch.batch_number}</td>
                      <td className="py-3 px-4">{batch.product_name}</td>
                      <td className="py-3 px-4">{batch.warehouse_name || batch.store_name || 'Central WH'}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{batch.quantity} units</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            batch.days_until_expiry <= 14
                              ? 'text-rose-600'
                              : batch.days_until_expiry <= 30
                              ? 'text-amber-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {batch.days_until_expiry} days
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            batch.days_until_expiry <= 14
                              ? 'rose'
                              : batch.days_until_expiry <= 30
                              ? 'amber'
                              : 'emerald'
                          }
                        >
                          {batch.days_until_expiry <= 14
                            ? 'CRITICAL FEFO'
                            : batch.days_until_expiry <= 30
                            ? 'EXPEDITE'
                            : 'STABLE'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-700 font-medium">
                          ✓ High velocity store absorption feasible
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RiskAlerts;
