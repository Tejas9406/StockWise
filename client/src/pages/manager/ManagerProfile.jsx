import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Shield, Mail, Calendar, Key, CheckCircle } from 'lucide-react';

export const ManagerProfile = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manager Profile & Credentials</h1>
        <p className="text-xs text-slate-500 mt-1">Central headquarters administrator privileges</p>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-bold text-2xl flex items-center justify-center shrink-0 uppercase shadow-lg shadow-emerald-600/20">
            {user?.name ? user.name[0] : 'M'}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
              <Badge variant="emerald" dot>Active Administrator</Badge>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Authorized Role</span>
                <span className="font-semibold text-slate-800">{user?.role}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Access Scope</span>
                <span className="font-semibold text-slate-800">Global (All Warehouses & Stores)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Created</span>
                <span className="font-semibold text-slate-800">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Authentication Mode</span>
                <span className="font-semibold text-emerald-700">JWT Bearer • Argon/Bcrypt Security</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
