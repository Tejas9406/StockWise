import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap, TrendingDown, TrendingUp, FlaskConical, ArrowRight, Clock, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { createScenario, getDataset, listPlans, type ImpactSummary, type PlanResponse } from '../lib/api';
import { useAppStore } from '../stores/appStore';

type DisruptionType = 'inventory_shortage' | 'route_closure' | 'route_delay' | 'supply_interruption';

const TYPE_LABELS: Record<DisruptionType, string> = {
  inventory_shortage: 'Inventory shortage — reduce stock at one warehouse × product',
  route_closure: 'Route closure — take a lane out of service',
  route_delay: 'Route delay — add transit days to a lane',
  supply_interruption: 'Supply interruption — zero out a warehouse × product',
};

export default function DisruptionLab() {
  const qc = useQueryClient();
  const { planId, setPlanId, datasetId, setScenarioId, setDisruptedPlan, setRecoveredPlan } = useAppStore();

  const { data: plansData } = useQuery({ queryKey: ['plans'], queryFn: () => listPlans(50) });
  const baselinePlans = React.useMemo(
    () => (plansData?.plans ?? []).filter((p) => p.type === 'baseline'),
    [plansData],
  );

  const [baselineId, setBaselineId] = React.useState(planId ?? '');
  React.useEffect(() => {
    if (planId) setBaselineId(planId);
  }, [planId]);
  React.useEffect(() => {
    if (!baselineId && baselinePlans.length) setBaselineId(baselinePlans[0].id);
  }, [baselinePlans, baselineId]);

  // Derive the dataset behind the chosen baseline plan so options are always real
  const activeBaseline = baselinePlans.find((p) => p.id === baselineId);
  const effectiveDatasetId = activeBaseline?.dataset_id ?? datasetId ?? undefined;

  const { data: dataset } = useQuery({
    queryKey: ['dataset', effectiveDatasetId],
    queryFn: () => getDataset(effectiveDatasetId!),
    enabled: !!effectiveDatasetId,
  });

  const warehouses = React.useMemo(
    () => (dataset?.meta?.warehouses ?? []).map((w) => String((w as Record<string, unknown>).id)),
    [dataset],
  );
  const products = React.useMemo(
    () => (dataset?.meta?.products ?? []).map((p) => String((p as Record<string, unknown>).id)),
    [dataset],
  );
  const routes = React.useMemo(
    () =>
      (dataset?.meta?.routes ?? []).map((r) => {
        const row = r as Record<string, unknown>;
        return { id: String(row.id), label: `${row.id} · ${row.warehouse_id}→${row.destination_id}`, backup: String(row.backup) === 'true' };
      }),
    [dataset],
  );

  const [type, setType] = React.useState<DisruptionType>('inventory_shortage');
  const [warehouseId, setWarehouseId] = React.useState('');
  const [productId, setProductId] = React.useState('');
  const [routeId, setRouteId] = React.useState('');
  const [reductionPct, setReductionPct] = React.useState('60');
  const [extraDays, setExtraDays] = React.useState('5');

  // Keep selections valid whenever the dataset changes
  React.useEffect(() => {
    if (warehouses.length && !warehouses.includes(warehouseId)) setWarehouseId(warehouses[0]);
  }, [warehouses, warehouseId]);
  React.useEffect(() => {
    if (products.length && !products.includes(productId)) setProductId(products[0]);
  }, [products, productId]);
  React.useEffect(() => {
    if (routes.length && !routes.some((r) => r.id === routeId)) setRouteId(routes[0].id);
  }, [routes, routeId]);

  const createMut = useMutation({
    mutationFn: () =>
      createScenario(baselineId, { type, params: buildParams(type, { warehouseId, productId, routeId, reductionPct, extraDays }) }),
    onSuccess: (res) => {
      setScenarioId(res.scenario.id);
      setDisruptedPlan(res.disrupted_plan);
      setRecoveredPlan(null);
      qc.invalidateQueries({ queryKey: ['scenarios'] });
    },
  });

  const disrupted: PlanResponse | undefined = createMut.data?.disrupted_plan;
  const impact: ImpactSummary | undefined = createMut.data?.impact;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Disruption Lab</h1>
          <p className="mt-1 text-sm text-slate-500">
            Branch a baseline plan, mutate real planning inputs, and re-solve to measure the operational impact.
          </p>
        </div>
        {createMut.data ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/recovery">
              Go to recovery <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" /> Configure disruption
          </CardTitle>
          <CardDescription>Disruptions modify planning inputs — inventory, lane availability, or transit time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="baseline-plan" className="text-xs font-medium text-slate-600">
                Baseline plan
              </label>
              <Select id="baseline-plan" value={baselineId} onChange={(e) => setBaselineId(e.target.value)}>
                <option value="">Select a baseline plan…</option>
                {baselinePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id.slice(0, 8)} · {p.created_at.slice(0, 16).replace('T', ' ')} · {Math.round((p.kpis?.fulfillment_rate ?? 0) * 100)}% fulfilled
                  </option>
                ))}
              </Select>
              {!baselinePlans.length ? (
                <div className="mt-1 text-xs text-amber-600">
                  No baseline yet — <Link className="underline" to="/planner">generate one in the Planner</Link>.
                </div>
              ) : null}
            </div>
            <div>
              <label htmlFor="disruption-type" className="text-xs font-medium text-slate-600">
                Disruption type
              </label>
              <Select id="disruption-type" value={type} onChange={(e) => setType(e.target.value as DisruptionType)}>
                {(Object.keys(TYPE_LABELS) as DisruptionType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {(type === 'inventory_shortage' || type === 'supply_interruption') && (
              <>
                <div>
                  <label htmlFor="warehouse" className="text-xs font-medium text-slate-600">
                    Warehouse
                  </label>
                  <Select id="warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                    {warehouses.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor="product" className="text-xs font-medium text-slate-600">
                    Product
                  </label>
                  <Select id="product" value={productId} onChange={(e) => setProductId(e.target.value)}>
                    {products.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            )}
            {type === 'inventory_shortage' && (
              <div>
                <label htmlFor="reduction-pct" className="text-xs font-medium text-slate-600">
                  Reduction (%)
                </label>
                <Input
                  id="reduction-pct"
                  type="number"
                  min={0}
                  max={100}
                  value={reductionPct}
                  onChange={(e) => setReductionPct(e.target.value)}
                />
              </div>
            )}
            {(type === 'route_closure' || type === 'route_delay') && (
              <div>
                <label htmlFor="route" className="text-xs font-medium text-slate-600">
                  Route
                </label>
                <Select id="route" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                      {r.backup ? ' (contingency)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {type === 'route_delay' && (
              <div>
                <label htmlFor="extra-days" className="text-xs font-medium text-slate-600">
                  Extra transit days
                </label>
                <Input id="extra-days" type="number" min={0} value={extraDays} onChange={(e) => setExtraDays(e.target.value)} />
              </div>
            )}
          </div>

          {type === 'route_delay' ? (
            <p className="flex items-start gap-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Delay semantics: transit time increases and shipments can breach destination deadlines (reported as
              at-risk units). It does not remove capacity, so fulfillment may stay unchanged — that is the documented behaviour.
            </p>
          ) : null}

          <Button onClick={() => createMut.mutate()} disabled={!baselineId || createMut.isPending}>
            <Zap className="mr-2 h-4 w-4" />
            {createMut.isPending ? 'Simulating…' : 'Simulate disruption'}
          </Button>

          {createMut.isError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {String((createMut.error as Error).message)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {disrupted && impact ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <ImpactCard
              label="Fulfillment Δ"
              value={`${(impact.fulfillment_delta * 100).toFixed(1)}pp`}
              negative={impact.fulfillment_delta < 0}
            />
            <ImpactCard
              label="Cost Δ"
              value={`${impact.cost_delta >= 0 ? '+' : '−'}$${Math.abs(Math.round(impact.cost_delta)).toLocaleString()}`}
              negative={impact.cost_delta > 0}
            />
            <ImpactCard label="Unmet Δ" value={Math.round(impact.unmet_delta).toLocaleString()} negative={impact.unmet_delta > 0} />
            <Card>
              <CardContent className="p-4">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Risk score</div>
                <div className="mt-1 text-lg font-semibold">{disrupted.kpis.risk_score.toFixed(1)}</div>
                <div className="mt-1 text-xs text-slate-500">{disrupted.kpis.at_risk_destinations} at-risk destination(s)</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>What changed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700">{impact.disruption_description}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="destructive">Disrupted · {disrupted.solver}</Badge>
                <Badge variant="outline">{disrupted.status}</Badge>
                <Badge variant="secondary">{(disrupted.kpis.fulfillment_rate * 100).toFixed(1)}% fulfilled</Badge>
                <Badge variant="secondary">{Math.round(disrupted.kpis.unmet).toLocaleString()} unmet</Badge>
                <Badge variant="secondary">${Math.round(disrupted.kpis.total_cost).toLocaleString()} cost</Badge>
              </div>
            </CardContent>
          </Card>

          {impact.delivery_risk && impact.at_risk_units ? (
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" /> Deadline exposure
                </CardTitle>
                <CardDescription>
                  {Math.round(impact.at_risk_units).toLocaleString()} units arrive later than the destination deadline
                  {impact.max_late_days ? ` (up to ${impact.max_late_days} days late)` : ''}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Destination</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Transit</TableHead>
                      <TableHead className="text-right">Deadline</TableHead>
                      <TableHead className="text-right">Late by</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {impact.delivery_risk.at_risk_shipments.slice(0, 15).map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{s.destination_id}</TableCell>
                        <TableCell className="font-mono text-xs">{s.route_id}</TableCell>
                        <TableCell className="text-right">{Math.round(s.quantity).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{s.transit_days}d</TableCell>
                        <TableCell className="text-right">{s.deadline_days}d</TableCell>
                        <TableCell className="text-right font-medium text-amber-700">{s.late_by_days}d</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Disrupted allocations</CardTitle>
                <CardDescription>{disrupted.allocations.length} shipment(s) after re-solve</CardDescription>
              </CardHeader>
              <CardContent className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>WH</TableHead>
                      <TableHead>Dest</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disrupted.allocations.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{a.warehouse_id}</TableCell>
                        <TableCell className="font-mono text-xs">{a.destination_id}</TableCell>
                        <TableCell className="font-mono text-xs">{a.product_id}</TableCell>
                        <TableCell className="font-mono text-xs">{a.route_id}</TableCell>
                        <TableCell className="text-right">{Math.round(a.quantity).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Unmet demand after disruption</CardTitle>
                <CardDescription>
                  {disrupted.unmet.length === 0
                    ? 'Volume fully preserved by this disruption.'
                    : `${disrupted.unmet.length} destination × product gap(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-96 overflow-auto">
                {disrupted.unmet.length === 0 ? (
                  <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
                    All requested volume is still shipped. Check deadline exposure above for time-based impact.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Destination</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Unmet</TableHead>
                        <TableHead>Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {disrupted.unmet.map((u, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{u.destination_id}</TableCell>
                          <TableCell className="font-mono text-xs">{u.product_id}</TableCell>
                          <TableCell className="text-right font-medium text-red-600">{Math.round(u.quantity).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={u.priority <= 2 ? 'destructive' : 'warning'}>P{u.priority}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ImpactCard({ label, value, negative }: { label: string; value: string; negative: boolean }) {
  return (
    <Card className={negative ? 'border-red-200 bg-red-50/50' : 'border-emerald-200 bg-emerald-50/50'}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
          {negative ? <TrendingDown className="h-3.5 w-3.5 text-red-500" /> : <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
          {label}
        </div>
        <div className={`mt-1 text-lg font-semibold ${negative ? 'text-red-700' : 'text-emerald-700'}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function buildParams(
  type: DisruptionType,
  f: { warehouseId: string; productId: string; routeId: string; reductionPct: string; extraDays: string },
) {
  switch (type) {
    case 'inventory_shortage':
      return { warehouse_id: f.warehouseId, product_id: f.productId, reduction_pct: Number(f.reductionPct) };
    case 'route_closure':
      return { route_id: f.routeId };
    case 'route_delay':
      return { route_id: f.routeId, extra_days: Number(f.extraDays) };
    case 'supply_interruption':
      return { warehouse_id: f.warehouseId, product_id: f.productId };
  }
}
