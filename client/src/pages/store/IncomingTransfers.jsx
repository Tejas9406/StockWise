import React, { useState, useEffect } from 'react';
import { storeService } from '../../services/storeService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Link } from 'react-router-dom';
import { Truck, PackageCheck, Building2, RefreshCw } from 'lucide-react';

export const IncomingTransfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransfers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storeService.getIncomingTransfers();
      if (res.success) {
        setTransfers(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load incoming transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DISPATCHED':
        return <Badge variant="purple" dot>In Transit (Dispatched)</Badge>;
      case 'PACKED':
        return <Badge variant="indigo" dot>Packed at Hub</Badge>;
      case 'PICKED':
        return <Badge variant="teal" dot>Picked at Hub</Badge>;
      case 'APPROVED':
        return <Badge variant="blue" dot>Approved at Hub</Badge>;
      default:
        return <Badge variant="gray">{status}</Badge>;
    }
  };

  if (loading) return <LoadingSpinner text="Tracking inbound freight consignments..." />;
  if (error) return <ErrorState message={error} onRetry={fetchTransfers} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Incoming Shipments & In-Transit Transfers</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track replenishment orders advancing through warehouse processing and freight transit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchTransfers}>
            Refresh
          </Button>
          <Link to="/store/receive">
            <Button size="sm" variant="primary" icon={PackageCheck}>
              Confirm Delivery Receipts
            </Button>
          </Link>
        </div>
      </div>

      <Card noPadding>
        {transfers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No incoming shipments currently en route"
            description="When warehouse staff approve and dispatch transfers, they will appear here in real-time."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Transfer Number</th>
                  <th className="py-3 px-4">Origin Warehouse</th>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4 text-right">Inbound Units</th>
                  <th className="py-3 px-4">Carrier & Vehicle</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      {t.transferNumber}
                    </td>

                    <td className="py-3 px-4 text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-semibold">{t.sourceWarehouseId?.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{t.sourceWarehouseId?.location}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{t.productId?.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        SKU: {t.productId?.sku} {t.batchId ? `• Batch: ${t.batchId?.batchNumber}` : ''}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-extrabold text-emerald-600 text-sm">
                      +{t.quantity.toLocaleString()} units
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-medium block">{t.carrier || 'Internal Logistics'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{t.vehicleNumber || 'Standard Delivery'}</span>
                    </td>

                    <td className="py-3 px-4">{getStatusBadge(t.status)}</td>

                    <td className="py-3 px-4 text-center">
                      {t.status === 'DISPATCHED' ? (
                        <Link to="/store/receive">
                          <Button size="sm" variant="primary" icon={PackageCheck}>
                            Receive Stock
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Processing at Hub</span>
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
