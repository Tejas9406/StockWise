import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Building2, Mail, MapPin, Key } from 'lucide-react';

export const WarehouseProfile = () => {
  const { user } = useAuth();
  const wh = user?.warehouseId;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Warehouse Staff Credentials</h1>
        <p className="text-xs text-slate-500 mt-1">Operational role and facility assignment details</p>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-bold text-2xl flex items-center justify-center shrink-0 uppercase shadow-lg shadow-blue-600/20">
            {user?.name ? user.name[0] : 'W'}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
              <Badge variant="blue" dot>Warehouse Operations Staff</Badge>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Facility</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {wh?.code} — {wh?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Facility Location</span>
                <span className="font-semibold text-slate-800">{wh?.location || 'Regional Zone'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Facility Address</span>
                <span className="font-semibold text-slate-800">{wh?.address || 'Standard Hub'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Operational Scope</span>
                <span className="font-semibold text-blue-700">Picking, Packing & Freight Dispatch</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
