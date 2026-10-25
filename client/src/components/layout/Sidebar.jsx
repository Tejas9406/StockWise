import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ArrowRightLeft,
  History,
  Boxes,
  Bell,
  Cpu,
  Database,
  FlaskConical,
  Award,
  GitCompare,
  Settings,
  LogOut,
  Truck,
  CheckCircle2,
  ClipboardList,
  Store,
  ShoppingCart,
  Zap,
} from 'lucide-react';

export const Sidebar = () => {
  const { user, logout } = useAuth();

  const getNavLinks = () => {
    switch (user?.role) {
      case 'DISTRIBUTION_MANAGER':
        return [
          { to: '/manager', label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: '/manager/forecast', label: 'Forecast', icon: TrendingUp },
          { to: '/manager/disruption', label: 'Disruption Lab', icon: Zap },
          { to: '/manager/recommendations', label: 'Planner', icon: Sparkles },
          { to: '/manager/alerts', label: 'Alerts & Automation', icon: Bell },
          { to: '/manager/inventory', label: 'Inventory', icon: Boxes },
          { to: '/manager/transfers', label: 'Transfers', icon: ArrowRightLeft },
          { to: '/manager/history', label: 'Audit Trail', icon: History },
          { to: '/manager/data-health', label: 'Datasets', icon: Database },
        ];
      case 'WAREHOUSE':
        return [
          { to: '/warehouse', label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: '/warehouse/inventory', label: 'Inventory', icon: Boxes },
          { to: '/warehouse/approved', label: 'Approved', icon: CheckCircle2 },
          { to: '/warehouse/pick-list', label: 'Pick List', icon: ClipboardList },
          { to: '/warehouse/dispatch', label: 'Dispatch', icon: Truck },
        ];
      case 'STORE_MANAGER':
        return [
          { to: '/store', label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: '/store/inventory', label: 'Inventory', icon: Boxes },
          { to: '/store/incoming', label: 'Incoming', icon: ArrowRightLeft },
          { to: '/store/requirements', label: 'Needs', icon: ShoppingCart },
          { to: '/store/forecast', label: 'Forecast', icon: TrendingUp },
        ];
      default:
        return [
          { to: '/manager', label: 'Dashboard', icon: LayoutDashboard, end: true },
        ];
    }
  };

  const navLinks = getNavLinks();

  return (
    <aside className="w-20 hidden md:flex flex-col items-center py-6 px-3 bg-white/70 backdrop-blur-xl border-r border-slate-200/70 select-none">
      {/* Floating Vertical Icon Rail matching Quixotic design */}
      <div className="w-14 bg-white/95 rounded-3xl p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center gap-3">
        {navLinks.slice(0, 6).map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            title={link.label}
            className={({ isActive }) =>
              `relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-[0_6px_16px_rgba(5,150,105,0.35)] scale-105'
                  : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50/80 hover:scale-105'
              }`
            }
          >
            <link.icon className="w-5 h-5" />
          </NavLink>
        ))}
      </div>

      {/* Secondary dock items */}
      <div className="mt-4 w-14 bg-white/95 rounded-3xl p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center gap-3">
        {navLinks.slice(6).map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            title={link.label}
            className={({ isActive }) =>
              `relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-[0_6px_16px_rgba(5,150,105,0.35)] scale-105'
                  : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50/80 hover:scale-105'
              }`
            }
          >
            <link.icon className="w-5 h-5" />
          </NavLink>
        ))}
      </div>

      {/* Bottom controls dock */}
      <div className="mt-auto w-14 bg-white/95 rounded-3xl p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center gap-3">
        <NavLink
          to="/manager/profile"
          title="Settings"
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-300"
        >
          <Settings className="w-5 h-5" />
        </NavLink>
        <button
          onClick={logout}
          title="Sign Out"
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-300"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
