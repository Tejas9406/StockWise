import React, { useState, useEffect } from 'react';
import { warehouseService } from '../../services/warehouseService';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { Link } from 'react-router-dom';
import {
  Boxes,
  Lock,
  ClipboardList,
  Truck,
  AlertTriangle,
  ArrowRight,
  PackageCheck,
  Building2,
} from 'lucide-react';
import { FeatureExplainer } from '../../components/common/FeatureExplainer';

export const WarehouseDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await warehouseService.getDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load warehouse dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner text="Retrieving warehouse facility metrics..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;
  if (!data) return <div className="p-8 text-center text-slate-500">No warehouse data available.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Warehouse Operations Hub</h1>
            <Badge variant="blue" className="text-xs">
              {data.warehouse?.code || 'Hub'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {data.warehouse?.name} — {data.warehouse?.location} ({data.warehouse?.address})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/warehouse/pick-list">
            <Button size="sm" variant="primary" icon={ClipboardList}>
              Pick List ({data.pendingPicksCount || 0})
            </Button>
          </Link>
          <Link to="/warehouse/dispatch">
            <Button size="sm" variant="secondary" icon={Truck}>
              Dispatch Queue ({data.readyToDispatchCount || 0})
            </Button>
          </Link>
        </div>
      </div>

      {/* Plain-English Feature Guide */}
      <FeatureExplainer
        storageKey="warehouse_dashboard"
        badge="Warehouse Execution Hub"
        title="Central Distribution Center Pick, Pack & Dispatch Operations"
        purpose="Provides warehouse personnel with live visibility into pending transfer orders approved by HQ. It guides workers on which batches to pick first (FEFO) and queues packages for transport loading."
        whyItMatters="Delays in physical warehouse fulfillment lead to delivery stockouts at stores. Having clear pick lists and dispatch queues ensures zero order confusion and accurate physical stock counts."
        suggestedAction="Review pending picks in the Pick List, mark items as packed, and dispatch vehicles when loading is complete."
        actionLink="/warehouse/pick-list"
        actionText="Open Pick List Queue"
      />

      {/* 5 Core Warehouse Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Available Stock"
          value={(data.availableStock || 0).toLocaleString()}
          subtitle="Unallocated shelf units"
          icon={Boxes}
          variant="default"
        />
        <StatCard
          title="Reserved Stock"
          value={(data.reservedStock || 0).toLocaleString()}
          subtitle="Committed to transfers"
          icon={Lock}
          variant="blue"
        />
        <StatCard
          title="Pending Picks"
          value={data.pendingPicksCount || 0}
          subtitle="Approved by HQ"
          icon={ClipboardList}
          variant="amber"
          trend={data.pendingPicksCount > 0 ? 'To Pick' : 'Clear'}
        />
        <StatCard
          title="Today's Dispatches"
          value={data.todayDispatchesCount || 0}
          subtitle="Shipments en route"
          icon={Truck}
          variant="indigo"
        />
        <StatCard
          title="Low Stock Items"
          value={data.lowStockItemsCount || 0}
          subtitle="Below safety threshold"
          icon={AlertTriangle}
          variant="rose"
          trend={data.lowStockItemsCount > 0 ? 'Reorder' : 'Healthy'}
        />
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          title="Picking & Staging Workflow"
          subtitle="Retrieve approved transfer consignments from facility racks"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              When the Distribution Manager approves a replenishment recommendation, it appears
              in your <strong>Pick List</strong>. Warehouse pickers retrieve the exact batch lot,
              inspect the goods, and confirm picking.
            </p>

            <Link to="/warehouse/pick-list" className="inline-block">
              <Button size="sm" variant="outline" icon={ArrowRight}>
                Open Pick List Queue
              </Button>
            </Link>
          </div>
        </Card>

        <Card
          title="Packaging & Freight Dispatch"
          subtitle="Pack staged goods, assign carrier/vehicle, and dispatch to stores"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Picked goods transition through <strong>PACKED</strong> and are dispatched with a freight
              vehicle number. Dispatched goods automatically reduce warehouse inventory balance in MongoDB.
            </p>

            <Link to="/warehouse/dispatch" className="inline-block">
              <Button size="sm" variant="outline" icon={ArrowRight}>
                Open Dispatch Console
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
