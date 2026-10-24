import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  AlertOctagon,
  RefreshCw,
  Cpu,
  ShieldAlert,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { forecast, replenishment } from '../lib/api';

const DESTINATIONS = [
  { id: 'DST-01', name: 'DST-01 (Apex Metro Hub)' },
  { id: 'DST-02', name: 'DST-02 (Eastern Depot)' },
  { id: 'DST-03', name: 'DST-03 (Northern Station)' },
  { id: 'DST-04', name: 'DST-04 (Harbor Terminal)' },
];

const PRODUCTS = [
  { id: 'PRD-A', name: 'PRD-A (Perishables / Fresh)' },
  { id: 'PRD-B', name: 'PRD-B (Dry Goods / Ambient)' },
  { id: 'PRD-C', name: 'PRD-C (Pharmaceuticals / Cold)' },
];

export default function ForecastIntelligence() {
  const [selectedDest, setSelectedDest] = React.useState('DST-01');
  const [selectedProd, setSelectedProd] = React.useState('PRD-A');
  const [selectedModel, setSelectedModel] = React.useState<'auto' | 'baseline' | 'exp_smoothing' | 'ml_ridge'>('auto');
  const [horizon, setHorizon] = React.useState(6);

  const {
    data: forecastData,
    isLoading: isForecastLoading,
    refetch: refetchForecast,
  } = useQuery({
    queryKey: ['forecast', selectedDest, selectedProd, horizon, selectedModel],
    queryFn: () =>
      forecast({
        destination_id: selectedDest,
        product_id: selectedProd,
        horizon,
        model: selectedModel,
      }),
  });

  const {
    data: replenishmentData,
    isLoading: isReplenishmentLoading,
    refetch: refetchReplenishment,
  } = useQuery({
    queryKey: ['replenishment'],
    queryFn: replenishment,
  });

  // Prepare chart data combining history and predicted horizon
  const chartData = React.useMemo(() => {
    if (!forecastData) return [];
    const points: any[] = [];

    // History points
    (forecastData.history_used || []).forEach((h: any, idx: number) => {
      const q = typeof h.quantity === 'number' ? h.quantity : 0;
      points.push({
        label: `Hist ${idx + 1}`,
        actual: q,
        forecast: null,
        lower: null,
        upper: null,
      });
    });

    // Forecast points
    (forecastData.forecast || []).forEach((f) => {
      points.push({
        label: `W+${f.period}`,
        actual: null,
        forecast: f.mean,
        lower: f.p10,
        upper: f.p90,
      });
    });

    return points;
  }, [forecastData]);

  const evalMetrics = forecastData?.eval_metrics || {};
  const activeMetrics = evalMetrics[forecastData?.model || ''] || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            AI Demand Forecasting &amp; Replenishment Intelligence
          </h1>
          <p className="text-sm text-slate-500">
            Walk-forward backtested ML models, empirical prediction intervals, batch expiry tracking, and automated replenishment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchForecast();
              refetchReplenishment();
            }}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh Intelligence
          </Button>
        </div>
      </div>

      {/* Control Filters */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Destination
            </label>
            <select
              value={selectedDest}
              onChange={(e) => setSelectedDest(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 focus:border-slate-500 focus:outline-none"
            >
              {DESTINATIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Product SKU
            </label>
            <select
              value={selectedProd}
              onChange={(e) => setSelectedProd(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 focus:border-slate-500 focus:outline-none"
            >
              {PRODUCTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Model Engine
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 focus:border-slate-500 focus:outline-none"
            >
              <option value="auto">Auto (Best via Backtesting)</option>
              <option value="ml_ridge">Autoregressive ML (Ridge)</option>
              <option value="exp_smoothing">Holt Linear Exponential Smoothing</option>
              <option value="baseline">Baseline (Moving Average w=3)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Horizon (Weeks)
            </label>
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 focus:border-slate-500 focus:outline-none"
            >
              <option value={4}>4 Weeks</option>
              <option value={6}>6 Weeks</option>
              <option value={8}>8 Weeks</option>
              <option value={12}>12 Weeks</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Forecast Chart & Evaluation Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recharts Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Demand Trajectory &amp; Empirical Uncertainty Band
                </CardTitle>
                <CardDescription>
                  Solid line denotes point prediction. Shaded envelope shows out-of-sample empirical 10th–90th percentile bounds.
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-1 font-mono text-xs">
                <Cpu className="h-3 w-3" />
                Active Model: {forecastData?.model}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isForecastLoading ? (
              <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                Evaluating backtest and calculating intervals…
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    {/* Historical Actuals */}
                    <Area
                      type="monotone"
                      dataKey="actual"
                      name="Historical Demand"
                      stroke="#0f172a"
                      strokeWidth={2}
                      fill="#0f172a"
                      fillOpacity={0.08}
                      connectNulls={false}
                    />
                    {/* Prediction Uncertainty Envelope */}
                    <Area
                      type="monotone"
                      dataKey="upper"
                      name="P90 Upper Bound"
                      stroke="#93c5fd"
                      strokeDasharray="4 4"
                      fill="#bfdbfe"
                      fillOpacity={0.25}
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="forecast"
                      name="Point Forecast"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fill="#3b82f6"
                      fillOpacity={0.15}
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="lower"
                      name="P10 Lower Bound"
                      stroke="#93c5fd"
                      strokeDasharray="4 4"
                      fill="transparent"
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            {forecastData?.is_synthetic_history && (
              <div className="mt-3 flex items-center gap-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                <Info className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Note:</strong> Initial dataset had limited observation history; running on deterministic synthetic sample data labeled for demo evaluation.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Backtest & Metrics Comparison Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Walk-Forward Backtesting
            </CardTitle>
            <CardDescription>
              Chronological out-of-sample evaluation without data leakage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Evaluation Scorecard ({activeMetrics.n_eval ?? 0} evaluation folds)
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border bg-slate-50 p-2.5">
                  <div className="text-xs text-slate-500">WAPE (Error Rate)</div>
                  <div className="text-lg font-bold text-slate-900">
                    {activeMetrics.wape != null ? `${(activeMetrics.wape * 100).toFixed(1)}%` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-2.5">
                  <div className="text-xs text-slate-500">MAE (Mean Error)</div>
                  <div className="text-lg font-bold text-slate-900">
                    {activeMetrics.mae != null ? activeMetrics.mae.toFixed(1) : '—'}
                  </div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-2.5">
                  <div className="text-xs text-slate-500">RMSE</div>
                  <div className="text-lg font-bold text-slate-900">
                    {activeMetrics.rmse != null ? activeMetrics.rmse.toFixed(1) : '—'}
                  </div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-2.5">
                  <div className="text-xs text-slate-500">Forecast Bias</div>
                  <div className="text-lg font-bold text-slate-900">
                    {activeMetrics.bias != null ? `${(activeMetrics.bias * 100).toFixed(1)}%` : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Model Tournament (Walk-Forward WAPE)
              </div>
              <div className="space-y-1.5 text-xs">
                {Object.entries(evalMetrics).map(([name, m]: [string, any]) => (
                  <div
                    key={name}
                    className={`flex items-center justify-between rounded p-2 ${
                      name === forecastData?.selected_model
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-950 font-medium'
                        : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {name === forecastData?.selected_model && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                      <span>{name}</span>
                    </div>
                    <span>{m.wape != null ? `${(m.wape * 100).toFixed(1)}%` : 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiry Risk & Inventory Replenishment Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Batch Expiry Risk Detector */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Batch Shelf-Life &amp; Expiry Risk
                </CardTitle>
                <CardDescription>
                  FEFO tracking: expired inventory is excluded from usable stock.
                </CardDescription>
              </div>
              <ShieldAlert className="h-5 w-5 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isReplenishmentLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading batch statuses…</div>
            ) : (
              (replenishmentData?.expiry_risks || []).map((risk) => (
                <div
                  key={`${risk.warehouse_id}_${risk.product_id}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {risk.warehouse_id} · {risk.product_id}
                    </span>
                    <Badge
                      variant={
                        risk.status === 'critical'
                          ? 'destructive'
                          : risk.status === 'warning'
                          ? 'warning'
                          : 'success'
                      }
                    >
                      {risk.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-600">
                    <div>Total: {risk.total_stock}</div>
                    <div className="text-emerald-700">Usable: {risk.usable_stock}</div>
                    <div className="text-rose-600">Expired: {risk.expired_stock}</div>
                  </div>
                  <p className="text-[11px] leading-tight text-slate-500">{risk.rationale}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Replenishment Recommendations Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Automated Replenishment Directives
                </CardTitle>
                <CardDescription>
                  Formula: max(0, Forecast Demand + Safety Buffer − Usable Stock − Confirmed Incoming)
                </CardDescription>
              </div>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            {isReplenishmentLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">Calculating replenishment needs…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Forecast Demand</TableHead>
                    <TableHead>Usable Stock</TableHead>
                    <TableHead>Incoming</TableHead>
                    <TableHead>Suggested Order</TableHead>
                    <TableHead>Days Supply</TableHead>
                    <TableHead>Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(replenishmentData?.recommendations || []).map((rec) => (
                    <TableRow key={rec.product_id}>
                      <TableCell className="font-medium text-slate-900">{rec.product_id}</TableCell>
                      <TableCell>{rec.forecast_demand}</TableCell>
                      <TableCell className="text-slate-600">{rec.usable_inventory}</TableCell>
                      <TableCell className="text-slate-600">+{rec.incoming_stock}</TableCell>
                      <TableCell className="font-bold text-blue-600">
                        {rec.suggested_replenishment > 0 ? `${rec.suggested_replenishment} units` : '0 (OK)'}
                      </TableCell>
                      <TableCell>{rec.days_of_supply}d</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            rec.stockout_risk === 'critical' || rec.stockout_risk === 'high'
                              ? 'destructive'
                              : rec.stockout_risk === 'medium'
                              ? 'warning'
                              : 'success'
                          }
                        >
                          {rec.stockout_risk}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-4 border-t pt-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Audit &amp; Reasoning:</span>{' '}
              {(replenishmentData?.recommendations || [])
                .map((r) => `[${r.product_id}]: ${r.reasoning}`)
                .join(' ')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
