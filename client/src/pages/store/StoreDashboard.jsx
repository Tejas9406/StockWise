import React, { useState, useEffect } from 'react';
import { storeService } from '../../services/storeService';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { Link } from 'react-router-dom';
import {
  Boxes,
  AlertOctagon,
  Truck,
  Clock,
  ShoppingCart,
  PackageCheck,
  Store as StoreIcon,
  Plus,
} from 'lucide-react';
import { QuickUploadModal } from '../../components/common/QuickUploadModal';
import { UploadCloud } from 'lucide-react';

export const StoreDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storeService.getDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load store dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner text="Retrieving retail store metrics..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;
  if (!data) return <div className="p-8 text-center text-slate-500">No store data available.</div>;

  return (
    <div className="space-y-6">
      <QuickUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        moduleTitle="Retail Store Stock & POS Sales CSV Upload"
        defaultDatasetType="SALES"
        locationContext={data.store?.name || 'Local Store'}
        onUploadSuccess={fetchDashboard}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Retail Store Dashboard</h1>
            <Badge variant="purple" className="text-xs">
              {data.store?.code || 'Store'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {data.store?.name} — {data.store?.location} ({data.store?.address})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={UploadCloud}
            onClick={() => setIsUploadOpen(true)}
          >
            Upload Store CSV
          </Button>
          <Link to="/store/receive">
            <Button size="sm" variant="primary" icon={PackageCheck}>
              Receive Stock ({data.incomingTransfersCount || 0})
            </Button>
          </Link>
          <Link to="/store/sales">
            <Button size="sm" variant="outline" icon={ShoppingCart}>
              Record Sale
            </Button>
          </Link>
        </div>
      </div>

      {/* 5 Core Store Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Current Stock"
          value={(data.totalUnits || 0).toLocaleString()}
          subtitle={`${data.totalProductsStocked || 0} product lines`}
          icon={Boxes}
          variant="default"
        />
        <StatCard
          title="Low Stock Items"
          value={data.lowStockCount || 0}
          subtitle="At reorder threshold"
          icon={AlertOctagon}
          variant="amber"
          trend={data.lowStockCount > 0 ? 'Replenish' : 'Healthy'}
        />
        <StatCard
          title="Incoming Shipments"
          value={data.incomingTransfersCount || 0}
          subtitle="Dispatched from hub"
          icon={Truck}
          variant="indigo"
          trend={data.incomingTransfersCount > 0 ? 'Ready to Receive' : 'None'}
        />
        <StatCard
          title="Stockout Risk"
          value={data.stockoutRiskCount || 0}
          subtitle="Below safety stock"
          icon={AlertOctagon}
          variant="rose"
        />
        <StatCard
          title="Expiry Risks"
          value={data.expiryRiskCount || 0}
          subtitle="Batches < 90 days"
          icon={Clock}
          variant="blue"
        />
      </div>

      {/* Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          title="Inbound Shipments Awaiting Receipt"
          subtitle="Confirm deliveries from regional warehouse hubs"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              When warehouse logistics dispatches an order, it appears in your <strong>Receive Stock</strong> queue.
              Verifying receipt automatically increases your store's on-shelf inventory in the system.
            </p>

            <Link to="/store/receive" className="inline-block">
              <Button size="sm" variant="primary" icon={PackageCheck}>
                Check Inbound Deliveries ({data.incomingTransfersCount || 0})
              </Button>
            </Link>
          </div>
        </Card>

        <Card
          title="Store Point-of-Sale Transactions"
          subtitle="Log customer purchases to update demand trends and stock levels"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Record daily customer sales. Each transaction decrements store inventory in real-time
              and updates automated replenishment and demand tracking.
            </p>

            <Link to="/store/sales" className="inline-block">
              <Button size="sm" variant="outline" icon={ShoppingCart}>
                Open Sales Management
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
