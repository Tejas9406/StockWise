import React, { useState, useEffect } from 'react';
import { warehouseService } from '../../services/warehouseService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList, ArrowRight, Store, RefreshCw } from 'lucide-react';

export const ApprovedTransfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransfers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await warehouseService.getApprovedTransfers();
      if (res.success) {
        setTransfers(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load approved transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  if (loading) return <LoadingSpinner text="Retrieving approved transfers from HQ..." />;
  if (error) return <ErrorState message={error} onRetry={fetchTransfers} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Approved Transfers from HQ</h1>
          <p className="text-xs text-slate-500 mt-1">
            Replenishment orders approved by Distribution Manager and queued for warehouse picking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchTransfers}>
            Refresh
          </Button>
          <Link to="/warehouse/pick-list">
            <Button size="sm" variant="primary" icon={ClipboardList}>
              Go to Pick List
            </Button>
          </Link>
        </div>
      </div>

      {transfers.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No pending approved transfers"
          description="All approved transfers have been picked. New approvals from HQ will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {transfers.map((t) => (
            <Card key={t._id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="font-bold text-slate-900 font-mono text-sm block">{t.transferNumber}</span>
                  <span className="text-[10px] text-slate-400">
                    Approved: {new Date(t.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <Badge variant="blue" dot>APPROVED</Badge>
              </div>

              <div className="space-y-3 my-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Product</span>
                  <span className="font-bold text-slate-900 text-sm">{t.productId?.name}</span>
                  <span className="text-slate-400 font-mono block">SKU: {t.productId?.sku}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div className="flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-purple-600" />
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Destination</span>
                      <span className="font-semibold text-slate-800">{t.destinationId?.name}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Quantity</span>
                    <span className="font-bold text-emerald-600 text-base">{t.quantity} units</span>
                  </div>
                </div>

                {t.batchId && (
                  <div className="text-[11px] text-slate-500">
                    Allocated Batch: <strong className="font-mono text-slate-800">{t.batchId?.batchNumber}</strong>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <Link to="/warehouse/pick-list">
                  <Button size="sm" variant="primary" className="w-full justify-between" icon={ClipboardList}>
                    <span>Proceed to Pick List</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
