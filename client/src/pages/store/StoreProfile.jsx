import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { User, Mail, MapPin, Store as StoreIcon, Shield, Clock } from 'lucide-react';

export const StoreProfile = () => {
  const { user } = useAuth();

  const infoRows = [
    { label: 'Full Name', value: user?.name, icon: User },
    { label: 'Email Address', value: user?.email, icon: Mail },
    { label: 'Role', value: 'Store Manager', icon: Shield },
    { label: 'Store Code', value: user?.storeId?.code || 'Assigned Store', icon: StoreIcon },
    { label: 'Store Name', value: user?.storeId?.name || '—', icon: MapPin },
    { label: 'Store Location', value: user?.storeId?.location || '—', icon: MapPin },
    {
      label: 'Account Since',
      value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—',
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store Profile</h1>
        <p className="text-xs text-slate-500 mt-1">Your store assignment and account details</p>
      </div>

      {/* Avatar Card */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 text-white text-2xl font-bold flex items-center justify-center uppercase shadow-sm">
            {user?.name ? user.name[0] : 'S'}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{user?.name || 'Store Manager'}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant="purple" className="text-xs">Store Manager</Badge>
              {user?.storeId?.code && (
                <Badge variant="default" className="text-xs">{user.storeId.code}</Badge>
              )}
              <Badge variant="emerald" className="text-xs">Active</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Info Table */}
      <Card title="Account Details" subtitle="Read-only profile from your system assignment">
        <div className="divide-y divide-slate-100">
          {infoRows.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 text-slate-500">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{label}</span>
              </div>
              <span className="text-xs font-semibold text-slate-800 text-right max-w-[55%] truncate">
                {value || '—'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Store Context */}
      {user?.storeId && (
        <Card title="Assigned Store" subtitle="Your primary store location for inventory management">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Store Code', value: user.storeId.code },
              { label: 'Store Name', value: user.storeId.name },
              { label: 'Location', value: user.storeId.location },
              { label: 'Address', value: user.storeId.address || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{value || '—'}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
