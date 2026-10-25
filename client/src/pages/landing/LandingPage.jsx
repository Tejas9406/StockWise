import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Boxes,
  Truck,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Building2,
  Store,
  Layers,
  Clock,
  ChevronRight,
  Database,
  Cpu,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const LandingPage = () => {
  const { isAuthenticated, user, quickDemoLogin } = useAuth();
  const navigate = useNavigate();

  const handleDemoAccess = async (role) => {
    await quickDemoLogin(role);
    if (role === 'DISTRIBUTION_MANAGER') navigate('/manager');
    else if (role === 'WAREHOUSE') navigate('/warehouse');
    else if (role === 'STORE_MANAGER') navigate('/store');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="StockWise AI" className="w-8 h-8 rounded-lg shadow-sm" />
          <span className="text-lg font-bold tracking-tight text-slate-900">StockWise</span>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
            AI
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to={
                user?.role === 'DISTRIBUTION_MANAGER'
                  ? '/manager'
                  : user?.role === 'WAREHOUSE'
                  ? '/warehouse'
                  : '/store'
              }
            >
              <Button size="sm" variant="primary">
                Open Dashboard ({user?.role?.replace('_', ' ')})
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button size="sm" variant="outline">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" variant="primary">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 lg:px-12 pt-16 pb-20 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>FMCG Distribution Intelligence & Inventory Optimization</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
          Eliminate stockouts and expiry waste with{' '}
          <span className="text-emerald-600">multi-echelon distribution</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mt-6 leading-relaxed">
          StockWise AI connects FMCG warehouses, regional hubs, and retail stores in real-time.
          Track active batches, automate dispatch fulfillment, and optimize replenishment.
        </p>

        {/* Quick Demo Access Bar */}
        <div className="mt-10 p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xl max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Interactive Hackathon Demo Panels
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Instant 1-Click Access
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Manager Panel */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 transition-all text-left group">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Distribution Manager</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Full network visibility, AI recommendations, risk alerts, and transfer approvals.
              </p>
              <Button
                size="sm"
                variant="primary"
                className="w-full justify-between"
                onClick={() => handleDemoAccess('DISTRIBUTION_MANAGER')}
              >
                <span>Enter Manager Panel</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Warehouse Panel */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20 transition-all text-left group">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Warehouse Staff (WH-001)</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Approved pick lists, packing verification, and freight dispatch execution.
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="w-full justify-between"
                onClick={() => handleDemoAccess('WAREHOUSE')}
              >
                <span>Enter Warehouse Panel</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Store Manager Panel */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-purple-500 bg-slate-50/50 hover:bg-purple-50/20 transition-all text-left group">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Store Manager (STORE-001)</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Store inventory, POS sales recording, replenishment requests, and receiving.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-between"
                onClick={() => handleDemoAccess('STORE_MANAGER')}
              >
                <span>Enter Store Panel</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Workflow Architecture */}
      <section className="py-16 px-6 lg:px-12 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Live Closed-Loop FMCG Fulfillment Workflow
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Every stage communicates atomically with MongoDB, guaranteeing zero inventory drift.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-emerald-600 mb-2">STAGE 1</div>
              <h4 className="text-sm font-bold text-slate-900">Recommendation & Approval</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Manager reviews AI transfer recommendations and approves. Stock is immediately reserved in the source warehouse.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-blue-600 mb-2">STAGE 2</div>
              <h4 className="text-sm font-bold text-slate-900">Warehouse Pick List</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Warehouse staff receives real-time picking alerts. Specific batch lots are retrieved from warehouse racks.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-indigo-600 mb-2">STAGE 3</div>
              <h4 className="text-sm font-bold text-slate-900">Packing & Dispatch</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Consignments are packed with vehicle numbers. Stock physically departs warehouse inventory.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-purple-600 mb-2">STAGE 4</div>
              <h4 className="text-sm font-bold text-slate-900">Store Receipt Confirmation</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Store manager verifies incoming shipment and clicks Receive. Store shelf stock increments instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Call-to-Action Banner */}
      <section className="py-16 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-emerald-500/20 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-4 border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Commercial Ready</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Ready to optimize your FMCG supply chain network?
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm mt-3 leading-relaxed">
                Connect your warehouses and retail stores, predict daily demand, and automate perishable batch clearance with intelligent FEFO allocation.
              </p>
            </div>

            <div className="shrink-0 flex gap-3">
              <Link to="/login">
                <Button size="lg" variant="primary">
                  Launch Operations Console
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8 px-6 text-center text-xs text-slate-500">
        <p>© 2026 StockWise AI. Built with React, Vite, Node.js, Express, and PostgreSQL.</p>
      </footer>
    </div>
  );
};
