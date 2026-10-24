import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  CheckCheck,
  Building2,
  Store as StoreIcon,
  Shield,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const Navbar = ({ onToggleSidebar, isSidebarCollapsed }) => {
  const { user, logout, quickDemoLogin } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close menus when clicking outside
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
        return { label: 'Distribution Manager', color: 'emerald', icon: Shield };
      case 'WAREHOUSE':
        return {
          label: `Warehouse: ${user.warehouseId?.code || 'Assigned'}`,
          color: 'blue',
          icon: Building2,
        };
      case 'STORE_MANAGER':
        return {
          label: `Store: ${user.storeId?.code || 'Assigned'}`,
          color: 'purple',
          icon: StoreIcon,
        };
      default:
        return { label: 'User', color: 'gray', icon: UserIcon };
    }
  };

  const roleInfo = getRoleBadge();
  const RoleIcon = roleInfo.icon;

  const handleSwitchRole = async (role) => {
    setShowProfileMenu(false);
    await quickDemoLogin(role);
    if (role === 'DISTRIBUTION_MANAGER') navigate('/manager');
    else if (role === 'WAREHOUSE') navigate('/warehouse');
    else if (role === 'STORE_MANAGER') navigate('/store');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between transition-all">
      {/* Left: Brand & Sidebar toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title="Toggle Sidebar"
        >
          <Layers className="w-5 h-5" />
        </button>

        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="StockWise AI" className="w-8 h-8 rounded-lg shadow-sm" />
          <div className="hidden sm:block">
            <span className="font-bold text-slate-900 tracking-tight text-base">StockWise</span>
            <span className="ml-1 text-emerald-600 font-bold text-xs uppercase px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-200">
              AI
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products, transfers, batches, stores..."
            className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs text-slate-800 pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all placeholder-slate-400"
          />
        </div>
      </div>

      {/* Right: Role indicator, notifications, and profile */}
      <div className="flex items-center gap-3">
        {/* Role Badge */}
        <div className="hidden lg:flex items-center">
          <Badge variant={roleInfo.color} size="sm" className="gap-1.5 py-1 px-3">
            <RoleIcon className="w-3.5 h-3.5" />
            <span className="font-medium text-xs">{roleInfo.label}</span>
          </Badge>
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No notifications right now
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => {
                        markAsRead(n._id);
                        if (n.link) navigate(n.link);
                        setShowNotifications(false);
                      }}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                        !n.isRead ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900">{n.title}</span>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200/60"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-white font-semibold text-xs flex items-center justify-center uppercase">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div className="hidden sm:block text-left pr-1">
              <span className="text-xs font-semibold text-slate-800 block leading-tight truncate max-w-[110px]">
                {user?.name || 'User'}
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight capitalize">
                {user?.role ? user.role.toLowerCase().replace('_', ' ') : 'Role'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>

              {/* Demo Switcher Quick Menu for Reviewers */}
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/60">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Demo Fast Role Switch
                </p>
                <div className="space-y-1">
                  <button
                    onClick={() => handleSwitchRole('DISTRIBUTION_MANAGER')}
                    className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-white text-slate-700 hover:text-emerald-700 flex items-center justify-between font-medium transition-colors"
                  >
                    <span>Distribution Manager</span>
                    {user?.role === 'DISTRIBUTION_MANAGER' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSwitchRole('WAREHOUSE')}
                    className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-white text-slate-700 hover:text-blue-700 flex items-center justify-between font-medium transition-colors"
                  >
                    <span>Warehouse Staff (WH-001)</span>
                    {user?.role === 'WAREHOUSE' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSwitchRole('STORE_MANAGER')}
                    className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-white text-slate-700 hover:text-purple-700 flex items-center justify-between font-medium transition-colors"
                  >
                    <span>Store Manager (STORE-001)</span>
                    {user?.role === 'STORE_MANAGER' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-1">
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
