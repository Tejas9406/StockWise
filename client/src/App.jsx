import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// ─── Landing / Auth ───────────────────────────────────────────────
const LandingPage       = lazy(() => import('./pages/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage         = lazy(() => import('./pages/landing/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage      = lazy(() => import('./pages/landing/RegisterPage').then(m => ({ default: m.RegisterPage })));

// ─── Manager Panel ────────────────────────────────────────────────
const ManagerDashboard  = lazy(() => import('./pages/manager/ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));
const ManagerInventory  = lazy(() => import('./pages/manager/ManagerInventory').then(m => ({ default: m.ManagerInventory })));
const DemandForecast    = lazy(() => import('./pages/manager/DemandForecast').then(m => ({ default: m.DemandForecast })));
const RiskAlerts        = lazy(() => import('./pages/manager/RiskAlerts').then(m => ({ default: m.RiskAlerts })));
const Recommendations   = lazy(() => import('./pages/manager/Recommendations').then(m => ({ default: m.Recommendations })));
const BaselineComparison = lazy(() => import('./pages/manager/BaselineComparison').then(m => ({ default: m.BaselineComparison })));
const Transfers         = lazy(() => import('./pages/manager/Transfers').then(m => ({ default: m.Transfers })));
const DecisionHistory   = lazy(() => import('./pages/manager/DecisionHistory').then(m => ({ default: m.DecisionHistory })));
const DataHealth        = lazy(() => import('./pages/manager/DataHealth').then(m => ({ default: m.DataHealth })));
const WhatIfSimulation  = lazy(() => import('./pages/manager/WhatIfSimulation').then(m => ({ default: m.WhatIfSimulation })));
const BusinessImpact    = lazy(() => import('./pages/manager/BusinessImpact').then(m => ({ default: m.BusinessImpact })));
const ModelMonitoring   = lazy(() => import('./pages/manager/ModelMonitoring').then(m => ({ default: m.ModelMonitoring })));
const AlertCenter       = lazy(() => import('./pages/manager/AlertCenter').then(m => ({ default: m.AlertCenter })));
const ManagerProfile    = lazy(() => import('./pages/manager/ManagerProfile').then(m => ({ default: m.ManagerProfile })));

// ─── Warehouse Panel ──────────────────────────────────────────────
const WarehouseDashboard  = lazy(() => import('./pages/warehouse/WarehouseDashboard').then(m => ({ default: m.WarehouseDashboard })));
const WarehouseInventory  = lazy(() => import('./pages/warehouse/WarehouseInventory').then(m => ({ default: m.WarehouseInventory })));
const ApprovedTransfers   = lazy(() => import('./pages/warehouse/ApprovedTransfers').then(m => ({ default: m.ApprovedTransfers })));
const PickList            = lazy(() => import('./pages/warehouse/PickList').then(m => ({ default: m.PickList })));
const Dispatch            = lazy(() => import('./pages/warehouse/Dispatch').then(m => ({ default: m.Dispatch })));
const DispatchHistory     = lazy(() => import('./pages/warehouse/DispatchHistory').then(m => ({ default: m.DispatchHistory })));
const WarehouseProfile    = lazy(() => import('./pages/warehouse/WarehouseProfile').then(m => ({ default: m.WarehouseProfile })));

// ─── Store Panel ──────────────────────────────────────────────────
const StoreDashboard      = lazy(() => import('./pages/store/StoreDashboard').then(m => ({ default: m.StoreDashboard })));
const StoreInventory      = lazy(() => import('./pages/store/StoreInventory').then(m => ({ default: m.StoreInventory })));
const SalesHistory        = lazy(() => import('./pages/store/SalesHistory').then(m => ({ default: m.SalesHistory })));
const StoreDemandForecast = lazy(() => import('./pages/store/StoreDemandForecast').then(m => ({ default: m.StoreDemandForecast })));
const StockRequirement    = lazy(() => import('./pages/store/StockRequirement').then(m => ({ default: m.StockRequirement })));
const IncomingTransfers   = lazy(() => import('./pages/store/IncomingTransfers').then(m => ({ default: m.IncomingTransfers })));
const ReceiveStock        = lazy(() => import('./pages/store/ReceiveStock').then(m => ({ default: m.ReceiveStock })));
const StoreProfile        = lazy(() => import('./pages/store/StoreProfile').then(m => ({ default: m.StoreProfile })));

const PageLoader = () => (
  <div className="h-full w-full flex items-center justify-center py-24">
    <LoadingSpinner text="Loading page..." />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Public Routes ── */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* ── Manager Panel (DISTRIBUTION_MANAGER only) ── */}
              <Route element={<ProtectedRoute allowedRoles={['DISTRIBUTION_MANAGER']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/manager" element={<ManagerDashboard />} />
                  <Route path="/manager/inventory" element={<ManagerInventory />} />
                  <Route path="/manager/forecast" element={<DemandForecast />} />
                  <Route path="/manager/risks" element={<RiskAlerts />} />
                  <Route path="/manager/recommendations" element={<Recommendations />} />
                  <Route path="/manager/comparison" element={<BaselineComparison />} />
                  <Route path="/manager/simulation" element={<WhatIfSimulation />} />
                  <Route path="/manager/scenarios" element={<WhatIfSimulation />} />
                  <Route path="/manager/impact" element={<BusinessImpact />} />
                  <Route path="/manager/monitoring" element={<ModelMonitoring />} />
                  <Route path="/manager/alerts" element={<AlertCenter />} />
                  <Route path="/manager/transfers" element={<Transfers />} />
                  <Route path="/manager/history" element={<DecisionHistory />} />
                  <Route path="/manager/data-health" element={<DataHealth />} />
                  <Route path="/manager/profile" element={<ManagerProfile />} />
                </Route>
              </Route>

              {/* ── Warehouse Panel (WAREHOUSE only) ── */}
              <Route element={<ProtectedRoute allowedRoles={['WAREHOUSE']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/warehouse" element={<WarehouseDashboard />} />
                  <Route path="/warehouse/inventory" element={<WarehouseInventory />} />
                  <Route path="/warehouse/approved" element={<ApprovedTransfers />} />
                  <Route path="/warehouse/pick-list" element={<PickList />} />
                  <Route path="/warehouse/dispatch" element={<Dispatch />} />
                  <Route path="/warehouse/history" element={<DispatchHistory />} />
                  <Route path="/warehouse/profile" element={<WarehouseProfile />} />
                </Route>
              </Route>

              {/* ── Store Panel (STORE_MANAGER only) ── */}
              <Route element={<ProtectedRoute allowedRoles={['STORE_MANAGER']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/store" element={<StoreDashboard />} />
                  <Route path="/store/inventory" element={<StoreInventory />} />
                  <Route path="/store/sales" element={<SalesHistory />} />
                  <Route path="/store/forecast" element={<StoreDemandForecast />} />
                  <Route path="/store/requirements" element={<StockRequirement />} />
                  <Route path="/store/incoming" element={<IncomingTransfers />} />
                  <Route path="/store/receive" element={<ReceiveStock />} />
                  <Route path="/store/profile" element={<StoreProfile />} />
                </Route>
              </Route>

              {/* ── Catch-all ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
