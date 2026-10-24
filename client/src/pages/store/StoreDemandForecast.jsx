import React, { useState, useEffect } from 'react';
import { storeService } from '../../services/storeService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { TrendingUp, Cpu, RefreshCw, Calendar, Info } from 'lucide-react';

export const StoreDemandForecast = () => {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storeService.getDemandForecast();
      if (res.success) {
        setForecasts(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load store demand forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  if (loading) return <LoadingSpinner text="Connecting to Store Demand Forecast Telemetry..." />;
  if (error) return <ErrorState message={error} onRetry={fetchForecast} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store Demand Forecasting</h1>
          <p className="text-xs text-slate-500 mt-1">
            Historical consumption velocity and Phase 2 machine learning predictive parameters
          </p>
        </div>

        <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchForecast}>
          Refresh
        </Button>
      </div>

      {/* Phase 2 Architecture Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Forecast Engine Interface Active</h3>
              <Badge variant="emerald" size="xs">Phase 2 Ready</Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Forecast engine coming in Phase 2. The data structure and real sales history feeds are fully connected.
              In Phase 2, LSTM models will predict future weekly unit demand per shelf SKU.
            </p>
          </div>
        </div>

        <Badge variant="blue" className="shrink-0 text-xs py-1 px-3">
          Telemetry Pipeline Live
        </Badge>
      </div>

      {/* Forecast Telemetry Grid */}
      <Card noPadding title="Store Demand Velocity & Horizon Readiness">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Historical Window</th>
                <th className="py-3 px-4 text-right">Avg Daily Sales</th>
                <th className="py-3 px-4">Forecast Horizon</th>
                <th className="py-3 px-4">Predicted Demand</th>
                <th className="py-3 px-4 text-center">Engine Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forecasts.map((f, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block">{f.productName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">SKU: {f.sku}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <Badge variant="gray">{f.category}</Badge>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600">
                    {f.historicalDemandSampleDays} days telemetry
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                    {f.averageDailySales} units/day
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {f.forecastHorizon}
                  </td>
                  <td className="py-3 px-4 text-slate-400 italic">
                    Phase 2 Activation
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="emerald" dot>Ready for Phase 2</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
