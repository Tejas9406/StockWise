import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, AlertCircle, CheckCircle2, Play, ArrowRight, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { listDatasets, createPlan, getPlan, getDataset, listPlans } from '../lib/api';
import { useAppStore } from '../stores/appStore';

export default function Planner() {
  const qc = useQueryClient();
  const { datasetId, setDatasetId, planId, setPlanId, setBaselinePlan } = useAppStore();
  const [solver, setSolver] = React.useState<string>('');

  const { data: datasets } = useQuery({ queryKey: ['datasets'], queryFn: listDatasets });
  const { data: plansData } = useQuery({ queryKey: ['plans'], queryFn: () => listPlans(25) });

  const { data: dataset } = useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: () => getDataset(datasetId!),
    enabled: !!datasetId,
  });

  // Auto-pick the newest dataset so the page is usable immediately after import
  React.useEffect(() => {
    if (!datasetId && datasets?.datasets?.length) setDatasetId(datasets.datasets[0].id);
  }, [datasets, datasetId, setDatasetId]);

  const baselines = (plansData?.plans ?? []).filter((p) => p.type === 'baseline');
  const activePlanId = planId ?? baselines[0]?.id ?? null;

  React.useEffect(() => {
    if (!planId && baselines.length) setPlanId(baselines[0].id);
  }, [planId, baselines, setPlanId]);

  const planQuery = useQuery({
    queryKey: ['plan', activePlanId],
    queryFn: () => getPlan(activePlanId!),
    enabled: !!activePlanId,
  });

  const createMut = useMutation({
    mutationFn: () => createPlan(datasetId!, solver || undefined),
    onSuccess: (res) => {
      setPlanId(res.id);
      setBaselinePlan(res);
      qc.invalidateQueries({ queryKey: ['plans'] });
    },
  });

  const plan = planQuery.data;
  const kpis = plan?.kpis;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Baseline Planner</h1>
          <p className="mt-1 text-sm text-slate-500">
            Solve a constrained allocation for the active dataset, then review every shipment and gap.
          </p>
        </div>
        {kpis ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/disruption">
              Simulate a disruption <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Generate baseline
          </CardTitle>
          <CardDescription>
            Constraints enforced: warehouse inventory, route capacity, lane availability, product eligibility, destination priority.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Dataset</label>
              <Select value={datasetId ?? ''} onChange={(e) => setDatasetId(e.target.value || null)}>
                <option value="">Select dataset</option>
                {datasets?.datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.id.slice(0, 8)}
                  </option>
                ))}
              </Select>
              {dataset ? (
                <div className="mt-1 text-xs text-slate-500">
                  {dataset.meta.warehouses?.length ?? 0} warehouses · {dataset.meta.destinations?.length ?? 0} destinations ·{' '}
                  {dataset.meta.routes?.length ?? 0} lanes
                </div>
              ) : null}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Solver</label>
              <Select value={solver} onChange={(e) => setSolver(e.target.value)}>
                <option value="">Auto (server default)</option>
                <option value="greedy">Greedy baseline</option>
                <option value="ortools">OR-Tools (if installed)</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => createMut.mutate()} disabled={!datasetId || createMut.isPending} className="w-full">
                <Play className="mr-2 h-4 w-4" />
                {createMut.isPending ? 'Solving…' : 'Generate baseline'}
              </Button>
            </div>
          </div>

          {createMut.isError ? (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {String((createMut.error as Error).message)}
            </div>
          ) : null}
          {createMut.isSuccess ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Baseline plan created — {createMut.data.id.slice(0, 8)} · {createMut.data.allocations.length} allocations ·{' '}
              {(createMut.data.kpis.fulfillment_rate * 100).toFixed(1)}% fulfilled
            </div>
          ) : null}
        </CardContent>
      </Card>

      {baselines.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Baseline plans</CardTitle>
            <CardDescription>Select which solved plan to inspect and branch from.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Solver</TableHead>
                  <TableHead className="text-right">Fulfillment</TableHead>
                  <TableHead className="text-right">Unmet</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {baselines.map((p) => (
                  <TableRow key={p.id} className={p.id === activePlanId ? 'bg-slate-50' : undefined}>
                    <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{p.solver}</TableCell>
                    <TableCell className="text-right tabular-nums">{((p.kpis?.fulfillment_rate ?? 0) * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{Math.round(p.kpis?.unmet ?? 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">${Math.round(p.kpis?.total_cost ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-slate-500">{p.created_at.slice(0, 16).replace('T', ' ')}</TableCell>
                    <TableCell>
                      <Button size="sm" variant={p.id === activePlanId ? 'default' : 'outline'} onClick={() => setPlanId(p.id)}>
                        {p.id === activePlanId ? 'Active' : 'Inspect'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {!plan ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-slate-500">
            No plan selected. Generate a baseline to see allocations, gaps and cost.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={plan.status === 'optimal' || plan.status === 'completed' ? 'success' : 'warning'}>{plan.status}</Badge>
            <Badge variant="outline">Solver: {plan.solver}</Badge>
            <Badge variant="secondary">{plan.id.slice(0, 12)}…</Badge>
            <span className="text-xs text-slate-500">{new Date(plan.created_at).toLocaleString()}</span>
          </div>

          {kpis ? (
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              {[
                ['Inventory', Math.round(kpis.total_inventory).toLocaleString()],
                ['Demand', Math.round(kpis.total_demand).toLocaleString()],
                ['Fulfilled', Math.round(kpis.fulfilled).toLocaleString()],
                ['Unmet', Math.round(kpis.unmet).toLocaleString()],
                ['Fulfillment', `${(kpis.fulfillment_rate * 100).toFixed(1)}%`],
                ['Cost', `$${Math.round(kpis.total_cost).toLocaleString()}`],
              ].map(([label, val]) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
                    <div className="mt-1 text-lg font-semibold">{val}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Allocations</CardTitle>
              <CardDescription>
                {plan.allocations.length} shipment(s). Each row is quantity shipped from a warehouse on a specific lane.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[28rem] overflow-auto">
              {plan.allocations.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">No allocation possible under current constraints.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.allocations.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{a.warehouse_id}</TableCell>
                        <TableCell className="font-mono text-xs">{a.destination_id}</TableCell>
                        <TableCell className="font-mono text-xs">{a.product_id}</TableCell>
                        <TableCell className="font-mono text-xs">{a.route_id}</TableCell>
                        <TableCell className="text-right tabular-nums">{Math.round(a.quantity).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unmet demand</CardTitle>
              <CardDescription>Demand that constraints prevented from being fulfilled.</CardDescription>
            </CardHeader>
            <CardContent>
              {plan.unmet.length === 0 ? (
                <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" /> All demand fulfilled under the modelled constraints.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Destination</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Unmet qty</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.unmet.map((u, i) => (
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

          {kpis?.risk_breakdown ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4" /> Risk score breakdown
                </CardTitle>
                <CardDescription>Documented weights: unmet rate 50, route utilization 20, at-risk destinations 15, cost per unit 15.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['Unmet component', kpis.risk_breakdown.unmet_component, 50],
                    ['Route component', kpis.risk_breakdown.route_component, 20],
                    ['At-risk component', kpis.risk_breakdown.at_risk_component, 15],
                    ['Cost component', kpis.risk_breakdown.cost_component, 15],
                  ].map(([label, value, max]) => (
                    <div key={String(label)} className="rounded-lg border p-3">
                      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{String(label)}</div>
                      <div className="mt-1 text-lg font-semibold">
                        {Number(value ?? 0).toFixed(1)}
                        <span className="text-xs font-normal text-slate-400"> / {String(max)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">{String(kpis.risk_breakdown.description ?? '')}</p>
              </CardContent>
            </Card>
          ) : null}

          {plan.diagnostics ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Solver diagnostics
                </CardTitle>
                <CardDescription>Feasibility and solver status are reported explicitly — never assumed.</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
                  {JSON.stringify(plan.diagnostics, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
