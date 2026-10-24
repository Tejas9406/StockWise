import React, { useState, useEffect } from 'react';
import { warehouseService } from '../../services/warehouseService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Archive, RefreshCw, Truck, Store } from 'lucide-react';

export const DispatchHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await warehouseService.getDispatchHistory();
      if (res.success) {
        setHistory(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load dispatch history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) return <LoadingSpinner text="Loading outbound dispatch records..." />;
  if (error) return <ErrorState message={error} onRetry={fetchHistory} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Outbound Dispatch History</h1>
          <p className="text-xs text-slate-500 mt-1">
            Historical log of consignments dispatched from this warehouse facility
          </p>
        </div>

        <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchHistory}>
          Refresh
        </Button>
      </div>

      <Card noPadding>
        {history.length === 0 ? (
          <EmptyState
            icon={Archive}
            title="No completed dispatches yet"
            description="Transfers marked as DISPATCHED or RECEIVED will be logged here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Transfer Number</th>
                  <th className="py-3 px-4">Dispatched Product</th>
                  <th className="py-3 px-4">Destination Store</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4">Carrier & Vehicle</th>
                  <th className="py-3 px-4">Dispatch Time</th>
                  <th className="py-3 px-4">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      {t.transferNumber}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{t.productId?.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        SKU: {t.productId?.sku} {t.batchId ? `• Batch: ${t.batchId?.batchNumber}` : ''}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-purple-500" />
                        <span>{t.destinationId?.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{t.destinationId?.location}</span>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {t.quantity.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-semibold block">{t.carrier || 'Internal Fleet'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{t.vehicleNumber || 'Standard'}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {t.dispatchedAt ? new Date(t.dispatchedAt).toLocaleString() : '—'}
                    </td>

                    <td className="py-3 px-4">
                      {t.status === 'RECEIVED' ? (
                        <Badge variant="emerald" dot>Delivered & Received</Badge>
                      ) : (
                        <Badge variant="purple" dot>In Transit</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
