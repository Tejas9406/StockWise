import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import {
  Package,
  FileText,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Gauge,
  Activity,
  ArrowRight,
  Zap,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { health, getPlan, listPlans, listScenarios } from '../lib/api';
import { useAppStore } from '../stores/appStore';

const PIE_COLORS = ['#0f172a', '#f87171'];

export default function Dashboard() {
  const { planId, setPlanId } = useAppStore();

  const { data: h } = useQuery({ queryKey: ['health'], queryFn: health, retry: false });
  const { data: plansData } = useQuery({ queryKey: ['plans'], queryFn: () => listPlans(25) });
  const { data: scenarioData } = useQuery({ queryKey: ['scenarios'], queryFn: () => listScenarios(10) });

  const baselines = (plansData?.plans ?? []).filter((p) => p.type === 'baseline');
  const activePlanId = planId ?? baselines[0]?.id ?? null;

  // Keep the store in sync so downstream pages have a baseline context
  React.useEffect(() => {
    if (!planId && baselines.length) setPlanId(baselines[0].id);
  }, [planId, baselines, setPlanId]);

  const { data: plan, isFetching: planLoading } = useQuery({
    queryKey: ['plan', activePlanId],
    queryFn: () => getPlan(activePlanId!),
    enabled: !!activePlanId,
  });

  const kpis = plan?.kpis;
  const scenarios = scenarioData?.scenarios ?? [];

  const utilizationData = kpis
    ? [
        { name: 'Warehouse', value: Math.round(kpis.wh_utilization * 100) },
        { name: 'Route', value: Math.round(kpis.route_utilization * 100) },
        { name: 'Fulfillment', value: Math.round(kpis.fulfillment_rate * 100) },
      ]
    : [];

  const pieData = kpis
    ? [
        { name: 'Fulfilled', value: Math.round(kpis.fulfilled) },
        { name: 'Unmet', value: Math.round(kpis.unmet) },
      ]
    : [];

  const hasPlan = !!kpis;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Operations Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Baseline network health, fulfillment and capacity — recalculated from the active plan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {plan ? (
            <Badge variant="secondary">
              Plan {plan.id.slice(0, 8)} · {plan.solver}
            </Badge>
          ) : null}
        </div>
      </div>

      {!hasPlan ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Package className="h-6 w-6 text-slate-500" />
            </div>
            <h3 className="mt-4 text-base font-semibold">No baseline plan yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Load the sample dataset, generate a baseline allocation, then simulate a disruption and recover from it.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/datasets">
                  Load datasets <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/planner">Go to Planner</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Total inventory" value={Math.round(kpis!.total_inventory).toLocaleString()} icon={Package} sub="units on hand" />
            <KpiCard label="Total demand" value={Math.round(kpis!.total_demand).toLocaleString()} icon={FileText} sub="units requested" />
            <KpiCard
              label="Fulfillment"
              value={`${(kpis!.fulfillment_rate * 100).toFixed(1)}%`}
              icon={TrendingUp}
              sub={`${Math.round(kpis!.fulfilled).toLocaleString()} fulfilled`}
            />
            <KpiCard label="Unmet demand" value={Math.round(kpis!.unmet).toLocaleString()} icon={AlertTriangle} sub="units short" />
            <KpiCard
              label="Total cost"
              value={`$${Math.round(kpis!.total_cost).toLocaleString()}`}
              icon={DollarSign}
              sub="allocation cost"
            />
            <KpiCard
              label="Risk score"
              value={kpis!.risk_score.toFixed(1)}
              icon={Gauge}
              sub={`${kpis!.at_risk_destinations} at-risk dest.`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Capacity &amp; fulfillment</CardTitle>
                <CardDescription>Percent utilization from the active plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={utilizationData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#0f172a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fulfillment mix</CardTitle>
                <CardDescription>Fulfilled vs unmet units</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={58}
                        outerRadius={88}
                        dataKey="value"
                        paddingAngle={pieData.every((p) => p.value > 0) ? 2 : 0}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>
                    Warehouse utilization <strong className="text-slate-800">{(kpis!.wh_utilization * 100).toFixed(0)}%</strong>
                  </span>
                  <span>
                    Route utilization <strong className="text-slate-800">{(kpis!.route_utilization * 100).toFixed(0)}%</strong>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent scenarios</span>
                <Link to="/compare" className="text-xs font-normal text-slate-500 hover:text-slate-900">
                  Compare →
                </Link>
              </CardTitle>
              <CardDescription>Every run is stored with its disruption config and computed results.</CardDescription>
            </CardHeader>
            <CardContent>
              {!scenarios.length ? (
                <div className="flex flex-wrap items-center gap-3 py-4">
                  <p className="text-sm text-slate-500">No scenarios yet. Simulate a disruption to test this plan.</p>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/disruption">
                      <Zap className="mr-2 h-4 w-4" /> Open Disruption Lab
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scenario</TableHead>
                      <TableHead>Disruption</TableHead>
                      <TableHead className="text-right">Baseline</TableHead>
                      <TableHead className="text-right">Disrupted</TableHead>
                      <TableHead className="text-right">Recovered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scenarios.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-sm">{(s.disruption?.type ?? '—').replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.kpis.baseline ? `${(s.kpis.baseline.fulfillment_rate * 100).toFixed(1)}%` : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-red-700">
                          {s.kpis.disrupted ? `${(s.kpis.disrupted.fulfillment_rate * 100).toFixed(1)}%` : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-700">
                          {s.kpis.recovered ? `${(s.kpis.recovered.fulfillment_rate * 100).toFixed(1)}%` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.status === 'recovered' ? 'success' : 'warning'}>{s.status}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-slate-500">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {s.created_at ? new Date(s.created_at).toLocaleString() : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active plan</CardTitle>
              <CardDescription>
                {planLoading
                  ? 'Loading plan…'
                  : `${plan!.type} · ${plan!.status} · solver ${plan!.solver} · ${plan!.allocations.length} allocations`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/planner">Open in Planner</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/disruption">Simulate disruption</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/recovery">Run recovery</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/exports">Export results</Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100">
            <Icon className="h-3.5 w-3.5 text-slate-600" />
          </div>
        </div>
        <div className="mt-2 text-xl font-semibold tracking-tight">{value}</div>
        {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}
