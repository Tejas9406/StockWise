import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ArrowRightLeft,
  History,
  User,
  CheckCircle2,
  ClipboardList,
  Truck,
  Archive,
  ShoppingCart,
  PackageCheck,
  FileText,
  Boxes as BoxesIcon,
  Database,
  GitCompare,
  FlaskConical,
  Award,
  Cpu,
  Bell,
} from 'lucide-react';

export const Sidebar = ({ isCollapsed }) => {
  const { user } = useAuth();

  const getNavLinks = () => {
    switch (user?.role) {
      case 'DISTRIBUTION_MANAGER':
        return [
          { to: '/manager', label: 'Intelligence Overview', icon: LayoutDashboard, end: true },
          { to: '/manager/forecast', label: 'Demand Intelligence', icon: TrendingUp },
          { to: '/manager/risks', label: 'Risk Intelligence', icon: AlertTriangle },
          { to: '/manager/recommendations', label: 'AI Allocation Planner', icon: Sparkles },
          { to: '/manager/simulation', label: 'What-If Simulation', icon: FlaskConical },
          { to: '/manager/impact', label: 'Business Impact & ROI', icon: Award },
          { to: '/manager/monitoring', label: 'Model Monitoring', icon: Cpu },
          { to: '/manager/alerts', label: 'Intelligence Alerts', icon: Bell },
          { to: '/manager/comparison', label: 'Baseline vs AI', icon: GitCompare },
          { to: '/manager/inventory', label: 'Central Inventory', icon: Boxes },
          { to: '/manager/transfers', label: 'Transfers Workflow', icon: ArrowRightLeft },
          { to: '/manager/history', label: 'AI Decision History', icon: History },
          { to: '/manager/data-health', label: 'Data Health & Import', icon: Database },
          { to: '/manager/profile', label: 'Profile', icon: User },
        ];
      case 'WAREHOUSE':
        return [
          { to: '/warehouse', label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: '/warehouse/inventory', label: 'Inventory', icon: Boxes },
          { to: '/warehouse/approved', label: 'Approved Transfers', icon: CheckCircle2 },
          { to: '/warehouse/pick-list', label: 'Pick List', icon: ClipboardList },
          { to: '/warehouse/dispatch', label: 'Dispatch', icon: Truck },
          { to: '/warehouse/history', label: 'Dispatch History', icon: Archive },
          { to: '/warehouse/profile', label: 'Profile', icon: User },
        ];
      case 'STORE_MANAGER':
        return [
          { to: '/store', label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: '/store/inventory', label: 'Inventory', icon: Boxes },
          { to: '/store/sales', label: 'Sales History', icon: ShoppingCart },
          { to: '/store/forecast', label: 'Demand Forecast', icon: TrendingUp },
          { to: '/store/requirements', label: 'Stock Requirement', icon: FileText },
          { to: '/store/incoming', label: 'Incoming Transfers', icon: Truck },
          { to: '/store/receive', label: 'Receive Stock', icon: PackageCheck },
          { to: '/store/profile', label: 'Profile', icon: User },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <aside
      className={`bg-white border-r border-slate-200/80 transition-all duration-300 flex flex-col justify-between shrink-0 select-none z-20 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="p-3 space-y-1">
        {/* Navigation Category Label */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            {user?.role === 'DISTRIBUTION_MANAGER'
              ? 'Central Management'
              : user?.role === 'WAREHOUSE'
              ? 'Warehouse Operations'
              : 'Retail Store Operations'}
          </div>
        )}

        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </div>

      {/* Footer system tag */}
      {!isCollapsed ? (
        <div className="p-4 m-3 rounded-xl bg-slate-50 border border-slate-200/60 text-center">
          <p className="text-xs font-semibold text-slate-800">StockWise AI</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Phase 3 Continuous Learning</p>
          <div className="mt-2 text-[10px] bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 text-emerald-700 font-medium inline-block">
            PostgreSQL + FastAPI 3.0 Active
          </div>
        </div>
      ) : (
        <div className="p-3 text-center">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" title="System Active" />
        </div>
      )}
    </aside>
  );
};
