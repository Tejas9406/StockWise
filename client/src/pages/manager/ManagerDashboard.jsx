import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { managerService } from '../../services/managerService';
import { aiService } from '../../services/aiService';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Calendar,
  Plus,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Send,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRightLeft,
  ChevronDown,
  RefreshCw,
  Mail,
  MessageSquare,
  Package,
} from 'lucide-react';
import { FeatureExplainer } from '../../components/common/FeatureExplainer';

export const ManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [automationStats, setAutomationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [timeHorizon, setTimeHorizon] = useState('Monthly');
  const [activeDateRange, setActiveDateRange] = useState('Current Cycle (Oct 2026)');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashRes, autoRes] = await Promise.allSettled([
        managerService.getDashboardSummary(),
        axios.get('/api/automation/stats'),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.success) {
        setData(dashRes.value.data);
      }
      if (autoRes.status === 'fulfilled' && autoRes.value.data?.success) {
        setAutomationStats(autoRes.value.data.data);
      }
    } catch (err) {
      console.error('[Dashboard Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAutoScan = async () => {
    setScanLoading(true);
    try {
      const res = await axios.post('/api/automation/scan-expiry');
      if (res.data?.success) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('[Auto-Scan Error]:', err);
    } finally {
      setScanLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading StockWise supply network telemetry...</p>
      </div>
    );
  }

  // Derive metrics
  const totalUnits = data?.totalInventory || 2420;
  const availableUnits = data?.availableInventory || 2300;
  const criticalCount = automationStats?.batchExpiryDistribution?.critical14Days || data?.criticalStockouts || 1;
  const warningCount = automationStats?.batchExpiryDistribution?.warning30Days || data?.nearExpiryBatches || 1;
  const safeCount = automationStats?.batchExpiryDistribution?.safeBatches || 4;

  const emailDispatches = automationStats?.dispatchesByChannel?.find((c) => c.channel === 'EMAIL')?.count || 4;
  const waDispatches = automationStats?.dispatchesByChannel?.find((c) => c.channel === 'WHATSAPP')?.count || 2;

  // Monthly velocity data for the pill-striped bar chart (Quixotic style)
  const barData = [
    { month: 'JUN', value: 2400, height: '48%' },
    { month: 'JUL', value: 3800, height: '70%' },
    { month: 'AUG', value: 3100, height: '60%' },
    { month: 'SEP', value: 4900, height: '95%', active: true, badge: '+17.8%' },
    { month: 'OCT', value: 3600, height: '68%' },
    { month: 'NOV', value: 4200, height: '78%' },
  ];

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      {/* 1. Header: Welcome Hero & Global Controls (Matching Quixotic top row) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome Back, <span className="text-emerald-700">{user?.name?.split(' ')[0] || 'Manager'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time multi-echelon network balance, expiry alerts, and autonomous FEFO dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector Pill */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-full border border-slate-200/80 shadow-sm text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>{activeDateRange}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Quick Action Button */}
          <button
            onClick={() => navigate('/manager/recommendations')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full text-xs font-bold shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Transfer</span>
          </button>
        </div>
      </div>

      {/* Plain-English Feature Guide */}
      <FeatureExplainer
        storageKey="manager_dashboard"
        badge="Command Center"
        title="Distribution Operations & Inventory Optimization Command"
        purpose="Provides a single real-time executive cockpit for your entire FMCG supply chain. Monitor live inventory valuations, monthly sales velocity, perishable batch expiry countdowns, and automated dispatch logs across all warehouses and retail stores."
        whyItMatters="FMCG distribution involves rapid stock turnover. Having total visibility prevents warehouse bottlenecks, highlights low-stock retail stores before stockouts happen, and ensures expiring stock is transferred to high-velocity stores using FEFO principles."
        suggestedAction="Inspect near-expiry batches below, review auto-triggered alerts, or upload new retailer lists in the Data Hub to dynamically update the entire system."
        actionLink="/manager/data-health"
        actionText="Upload Retailer Dataset"
      />

      {/* 2. Top Metric Cards Grid (3 Columns matching Quixotic Dashboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Column 1: Credit Card / Asset Value Widget (quixotic-green-card) */}
        <div className="lg:col-span-4 flex flex-col justify-between quixotic-card p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inventory Valuation</p>
              <p className="text-xs text-slate-500">Live Asset Position</p>
            </div>
            <Link
              to="/manager/inventory"
              className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Green Card Widget (Quixotic VISA card style) */}
          <div className="quixotic-green-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[160px] group">
            {/* Subtle background glow */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>

            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm tracking-wider text-emerald-100">STOCKWISE FMCG</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-200/90 bg-white/15 px-2 py-0.5 rounded-full">
                ACTIVE DC
              </span>
            </div>

            <div className="my-3">
              <span className="text-xs text-emerald-200/90 block">Estimated Asset Value</span>
              <span className="text-3xl font-extrabold tracking-tight text-white">
                ${(totalUnits * 32.5).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-emerald-200/80 font-mono">
              <span>•••• {totalUnits} UNITS</span>
              <span>EXP: 2026-11</span>
            </div>
          </div>

          {/* Under-card Metric */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Weekly Throughput</p>
              <p className="text-lg font-extrabold text-slate-900">+{data?.totalInventory || 2420} Units</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">
              +12.8%
            </span>
          </div>
        </div>

        {/* Column 2: Engagement Rate / Demand Velocity Chart (Striped Pill Bar Chart) */}
        <div className="lg:col-span-5 quixotic-card p-6 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-slate-900">Demand Velocity</span>
            </div>

            {/* Monthly / Annually Pill Switch */}
            <div className="flex items-center bg-slate-100 p-1 rounded-full text-xs font-semibold">
              <button
                onClick={() => setTimeHorizon('Monthly')}
                className={`px-3 py-1 rounded-full transition-all ${
                  timeHorizon === 'Monthly'
                    ? 'bg-emerald-800 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setTimeHorizon('Annually')}
                className={`px-3 py-1 rounded-full transition-all ${
                  timeHorizon === 'Annually'
                    ? 'bg-emerald-800 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Annually
              </button>
            </div>
          </div>

          {/* Custom Pill Striped Bar Chart matching Quixotic reference */}
          <div className="h-52 flex items-end justify-between px-2 pt-8 pb-2 relative">
            {barData.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end flex-1 max-w-[48px]">
                {/* Floating pill badge for active bar */}
                {item.active && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-white text-[10px] font-bold shadow-sm animate-bounce">
                    {item.badge}
                  </span>
                )}
                <div
                  style={{ height: item.height }}
                  className={`w-full transition-all duration-500 ${
                    item.active ? 'pill-active-bar' : 'pill-striped-bar hover:opacity-90'
                  }`}
                  title={`${item.month}: ${item.value} units`}
                ></div>
                <span className={`text-[10px] font-bold ${item.active ? 'text-emerald-800' : 'text-slate-400'}`}>
                  {item.month}
                </span>
              </div>
            ))}
          </div>

          {/* Footnote */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Dynamic Moving-Average Demand Baseline</span>
            <Link to="/manager/forecast" className="text-emerald-700 font-bold hover:underline">
              Inspect Model →
            </Link>
          </div>
        </div>

        {/* Column 3: Flow Area Chart & Operational Avatars */}
        <div className="lg:col-span-3 space-y-5">
          {/* Top Mini Card: Usable Stock Balance Area */}
          <div className="quixotic-card p-5 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Usable Stock</p>
                <p className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {availableUnits.toLocaleString()} <span className="text-xs font-semibold text-slate-400">Units</span>
                </p>
              </div>
              <Link to="/manager/inventory" className="text-slate-400 hover:text-slate-600">
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Smooth SVG Area Chart Sparkline matching Quixotic */}
            <div className="h-16 my-2 relative">
              <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="quixoticGreenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,25 Q15,10 30,18 T60,8 T85,15 T100,5 L100,30 L0,30 Z"
                  fill="url(#quixoticGreenGrad)"
                />
                <path
                  d="M0,25 Q15,10 30,18 T60,8 T85,15 T100,5"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Action Buttons: Ship / Receive pills */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => navigate('/manager/transfers')}
                className="flex-1 py-1.5 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <Send className="w-3 h-3" />
                <span>Ship ↑</span>
              </button>
              <button
                onClick={() => navigate('/manager/data-health')}
                className="flex-1 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Receive ↓</span>
              </button>
            </div>
          </div>

          {/* Bottom Mini Card: Amount of Credit & Active Personnel */}
          <div className="quixotic-card p-5 bg-white flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Automated Alerts</p>
                <p className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {emailDispatches + waDispatches} <span className="text-xs font-semibold text-slate-400">Events</span>
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                +12.8%
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-semibold">Active Dispatchers</p>
                <div className="flex items-center -space-x-2 mt-1">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                    JD
                  </div>
                  <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                    AS
                  </div>
                  <div className="w-6 h-6 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                    TK
                  </div>
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                    +2
                  </div>
                </div>
              </div>

              <Link to="/manager/history" className="text-xs font-bold text-emerald-700 hover:text-emerald-900">
                Log →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Section: Real-time Transfers Table & Expiry Horizon Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8 Cols: Recent Transfers Stream (Matching Quixotic Payment History Table) */}
        <div className="lg:col-span-8 quixotic-card p-6 bg-white">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Network Transfer History</h2>
              <p className="text-xs text-slate-500">Live operational ledger across warehouses and stores</p>
            </div>
            <Link to="/manager/transfers" className="text-xs font-bold text-emerald-700 hover:text-emerald-900">
              View All →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Product & Transfer</th>
                  <th className="pb-3">Route</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {(!data?.recentTransfers || data.recentTransfers.length === 0) ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-400">
                      No transfer history found. Run auto-allocation to generate.
                    </td>
                  </tr>
                ) : (
                  data.recentTransfers.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-3.5 pl-2 flex items-center gap-3">
                        {/* Circular Product Avatar */}
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{item.productId?.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.transferNumber}</p>
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-600 font-medium">
                        {item.sourceWarehouseId?.code || 'WH-001'} → {item.destinationId?.code || 'STORE-001'}
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2 font-extrabold text-slate-900">
                        {item.quantity} <span className="text-[10px] font-normal text-slate-400">Units</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 4 Cols: Expiry Horizon & Autonomous Actions */}
        <div className="lg:col-span-4 quixotic-card p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Expiry Horizon</h2>
                <p className="text-xs text-slate-500">FEFO Risk Horizon Breakdown</p>
              </div>
              <span className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>

            {/* Segmented Horizon Progress */}
            <div className="space-y-4 my-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-rose-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Critical (&lt; 14 Days)
                  </span>
                  <span className="font-bold text-rose-700">{criticalCount} Batches</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, criticalCount * 25)}%` }}
                    className="h-full bg-rose-500 rounded-full"
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-amber-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Warning (14 - 30 Days)
                  </span>
                  <span className="font-bold text-amber-700">{warningCount} Batches</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, warningCount * 25)}%` }}
                    className="h-full bg-amber-500 rounded-full"
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Optimal (&gt; 30 Days)
                  </span>
                  <span className="font-bold text-emerald-700">{safeCount} Batches</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, safeCount * 25)}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                  ></div>
                </div>
              </div>
            </div>

            {/* Multi-Channel Alerts Summary */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2 mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <Mail className="w-3.5 h-3.5 text-blue-600" /> Auto Email Alerts
                </span>
                <span className="font-bold text-slate-800">{emailDispatches} Dispatched</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Notifications
                </span>
                <span className="font-bold text-slate-800">{waDispatches} Dispatched</span>
              </div>
            </div>
          </div>

          {/* Trigger Auto Scan Button */}
          <button
            onClick={handleTriggerAutoScan}
            disabled={scanLoading}
            className="w-full mt-5 py-3 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${scanLoading ? 'animate-spin' : ''}`} />
            <span>{scanLoading ? 'Scanning Network...' : 'Trigger Automated Expiry Scan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
