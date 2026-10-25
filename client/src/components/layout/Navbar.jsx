import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate, NavLink, Link } from 'react-router-dom';
import {
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  Shield,
  Building2,
  Store as StoreIcon,
  ChevronDown,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout, quickDemoLogin } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'DISTRIBUTION_MANAGER':
        return { label: 'Distribution Manager', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'WAREHOUSE':
        return { label: 'Warehouse Staff', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'STORE_MANAGER':
        return { label: 'Store Manager', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: 'Operations', color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const badge = getRoleBadge();

  // Floating pill tabs for manager
  const pillTabs = [
    { to: '/manager', label: 'Dashboard', end: true },
    { to: '/manager/forecast', label: 'Demand Forecast' },
    { to: '/manager/recommendations', label: 'Replenishment Planner' },
    { to: '/manager/transfers', label: 'Transfers' },
    { to: '/manager/data-health', label: 'Data Hub' },
    { to: '/manager/alerts', label: 'Alerts & Expiry' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 sm:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo (Matching Quixotic style) */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-all">
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
              StockWise
            </span>
          </div>
        </Link>

        {/* Center Floating Pill Navigation (Matching Quixotic top pill bar) */}
        {user?.role === 'DISTRIBUTION_MANAGER' && (
          <nav className="hidden lg:flex items-center bg-slate-100/80 p-1.5 rounded-full border border-slate-200/70 shadow-inner">
            {pillTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-emerald-800 shadow-sm font-bold scale-[1.02]'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Search Trigger */}
          <button
            title="Search network"
            onClick={() => navigate('/manager/inventory')}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-600 flex items-center justify-center transition-all"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Quick Demo Switcher */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs font-medium text-slate-600">
            <button
              onClick={() => quickDemoLogin('DISTRIBUTION_MANAGER')}
              className={`px-2.5 py-1 rounded-full transition-all ${
                user?.role === 'DISTRIBUTION_MANAGER' ? 'bg-white text-emerald-800 shadow-sm font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Manager
            </button>
            <button
              onClick={() => quickDemoLogin('WAREHOUSE')}
              className={`px-2.5 py-1 rounded-full transition-all ${
                user?.role === 'WAREHOUSE' ? 'bg-white text-emerald-800 shadow-sm font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Warehouse
            </button>
            <button
              onClick={() => quickDemoLogin('STORE_MANAGER')}
              className={`px-2.5 py-1 rounded-full transition-all ${
                user?.role === 'STORE_MANAGER' ? 'bg-white text-emerald-800 shadow-sm font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Store
            </button>
          </div>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-600 flex items-center justify-center transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Notifications & Alerts</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id || n._id}
                        onClick={() => {
                          markAsRead(n.id || n._id);
                          if (n.link) navigate(n.link);
                        }}
                        className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                          !n.isRead ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900">{n.title}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-slate-100 text-center">
                  <Link
                    to="/manager/alerts"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
                  >
                    View All Intelligence Alerts →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar (Matching circular avatar in Quixotic header) */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white font-bold text-xs flex items-center justify-center ring-2 ring-emerald-200">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Profile Menu Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl border border-slate-100 py-2 z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="font-bold text-sm text-slate-900 leading-tight">{user?.name || 'StockWise User'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 text-[10px] font-bold rounded-full border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/manager/profile');
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    Account Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
