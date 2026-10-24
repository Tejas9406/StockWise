import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HeartPulse, AlertTriangle, ArrowRight, CheckCircle2, Wrench, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { compareScenario, getScenario, listScenarios, recoverScenario, type KPISnapshot, type RecoveryAction, type ScenarioSummary, type UnmetDemand } from '../lib/api';
import { useAppStore } from '../stores/appStore';

export default function Recovery() {
  const qc = useQueryClient();
  const { scenarioId, setScenarioId, setRecoveredPlan } = useAppStore();
  const [sid, setSid] = React.useState(scenarioId ?? '');

  const { data: scenarioList } = useQuery({ queryKey: ['scenarios'], queryFn: () => listScenarios(50) });
  const scenarios = scenarioList?.scenarios ?? [];

  React.useEffect(() => {
    if (scenarioId) setSid(scenarioId);
  }, [scenarioId]);
  React.useEffect(() => {
    if (!sid && scenarios.length) setSid(scenarios[0].id);
  }, [scenarios, sid]);

  const compareQuery = useQuery({
    queryKey: ['compare', sid],
    queryFn: () => compareScenario(sid),
    enabled: !!sid,
  });

  // Persisted recovery result, so the action list survives a page reload
  const scenarioQuery = useQuery({
    queryKey: ['scenario', sid],
    queryFn: () => getScenario(sid),
    enabled: !!sid,
  });

  const recoverMut = useMutation({
    mutationFn: () => recoverScenario(sid),
    onSuccess: (res) => {
      setRecoveredPlan(res.recovered_plan);
      setScenarioId(sid);
      qc.invalidateQueries({ queryKey: ['scenarios'] });
      qc.invalidateQueries({ queryKey: ['compare', sid] });
    },
  });

  const active = scenarios.find((s) => s.id === sid) as ScenarioSummary | undefined;
  const cmp = compareQuery.data;
  const baselineK: KPISnapshot | null | undefined = cmp?.baseline?.kpis;
  const disruptedK: KPISnapshot | null | undefined = cmp?.disrupted?.kpis;
  const recoveredK: KPISnapshot | null | undefined = cmp?.recovered?.kpis;

  const actions: RecoveryAction[] = React.useMemo(() => {
    if (recoverMut.data?.recovery_actions?.length) return recoverMut.data.recovery_actions;
    const persisted = scenarioQuery.data?.recovered_plan as unknown as
      | { data?: { diagnostics?: { recovery_actions?: RecoveryAction[] } } }
      | null
      | undefined;
    return persisted?.data?.diagnostics?.recovery_actions ?? [];
  }, [recoverMut.data, scenarioQuery.data]);

  const residual: UnmetDemand[] = React.useMemo(() => {
    if (recoverMut.data) return recoverMut.data.residual_unmet;
    const persisted = scenarioQuery.data?.recovered_plan as unknown as
      | { data?: { unmet?: UnmetDemand[] } }
      | null
      | undefined;
    return persisted?.data?.unmet ?? [];
  }, [recoverMut.data, scenarioQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Recovery Center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Re-plan the disrupted network using contingency lanes and priority ordering, then inspect what is still short.
          </p>
        </div>
        {recoveredK ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/compare">
              Compare plans <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4" /> Run recovery
          </CardTitle>
          <CardDescription>Select a disrupted scenario. Recovery activates contingency lanes at premium cost.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label htmlFor="recovery-scenario" className="text-xs font-medium text-slate-600">
                Scenario
              </label>
              <Select id="recovery-scenario" value={sid} onChange={(e) => setSid(e.target.value)}>
                <option value="">Select a scenario…</option>
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id.slice(0, 8)} · {(s.disruption?.type ?? 'disruption').replace(/_/g, ' ')} · {s.status} ·{' '}
                    {s.created_at.slice(0, 16).replace('T', ' ')}
                  </option>
                ))}
              </Select>
              {!scenarios.length ? (
                <div className="mt-1 text-xs text-amber-600">
                  No scenarios yet — <Link className="underline" to="/disruption">create one in the Disruption Lab</Link>.
                </div>
              ) : null}
            </div>
            <div className="flex items-end">
              <Button onClick={() => recoverMut.mutate()} disabled={!sid || recoverMut.isPending} className="w-full">
                {recoverMut.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
                {recoverMut.isPending ? 'Re-planning…' : recoveredK ? 'Re-run recovery' : 'Run recovery'}
              </Button>
            </div>
          </div>

          {active ? (
            <div className="rounded-md bg-slate-50 p-3 text-xs">
              <div className="font-medium">
                Scenario {active.id.slice(0, 12)}… — {(active.disruption?.type ?? '').replace(/_/g, ' ')}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="secondary">Baseline {active.baseline_plan_id.slice(0, 8)}</Badge>
                {active.disrupted_plan_id ? <Badge variant="destructive">Disrupted {active.disrupted_plan_id.slice(0, 8)}</Badge> : null}
                {active.recovered_plan_id ? <Badge variant="success">Recovered {active.recovered_plan_id.slice(0, 8)}</Badge> : null}
              </div>
            </div>
          ) : null}

          {compareQuery.isError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {String((compareQuery.error as Error).message)}
            </div>
          ) : null}
          {recoverMut.isError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {String((recoverMut.error as Error).message)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {baselineK && disruptedK ? (
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Baseline" value={`${(baselineK.fulfillment_rate * 100).toFixed(1)}%`} sub={`${Math.round(baselineK.unmet)} unmet`} tone="neutral" />
          <Metric label="Disrupted" value={`${(disruptedK.fulfillment_rate * 100).toFixed(1)}%`} sub={`${Math.round(disruptedK.unmet)} unmet`} tone="bad" />
          <Metric
            label="Recovered"
            value={recoveredK ? `${(recoveredK.fulfillment_rate * 100).toFixed(1)}%` : '—'}
            sub={recoveredK ? `${Math.round(recoveredK.unmet)} unmet` : 'not run yet'}
            tone={recoveredK ? 'good' : 'neutral'}
          />
          <Metric
            label="Cost of recovery"
            value={
              recoveredK && disruptedK
                ? `${recoveredK.total_cost - disruptedK.total_cost >= 0 ? '+' : '−'}$${Math.abs(
                    Math.round(recoveredK.total_cost - disruptedK.total_cost),
                  ).toLocaleString()}`
                : '—'
            }
            sub={recoveredK ? `total $${Math.round(recoveredK.total_cost).toLocaleString()}` : '—'}
            tone={recoveredK && recoveredK.total_cost > disruptedK.total_cost ? 'warn' : 'neutral'}
          />
        </div>
      ) : null}

      {actions.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Recovery actions
            </CardTitle>
            <CardDescription>Each action is a computed allocation change, already checked against constraints.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">$/unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge
                        variant={
                          a.type === 'activate_contingency_lane'
                            ? 'warning'
                            : a.type === 'residual_unmet'
                              ? 'destructive'
                              : a.type === 'fully_recovered'
                                ? 'success'
                                : 'secondary'
                        }
                      >
                        {a.type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xl text-sm text-slate-700">{a.explanation}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {a.quantity_delta !== undefined ? `${a.quantity_delta > 0 ? '+' : ''}${Math.round(a.quantity_delta)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {a.cost_per_unit !== undefined ? `$${a.cost_per_unit.toFixed(2)}` : '—'}
                    </TableCell>
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
            <CardTitle className="flex items-center gap-2">
              {residual.length ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              Residual unmet demand
            </CardTitle>
            <CardDescription>
              {recoveredK
                ? residual.length
                  ? 'Not recoverable with available inventory and lane capacity — reported rather than hidden.'
                  : 'Every requested unit is covered after recovery.'
                : 'Run recovery to compute residual gaps.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-96 overflow-auto">
            {!recoveredK ? (
              <div className="py-6 text-center text-sm text-slate-500">No recovery run yet.</div>
            ) : residual.length === 0 ? (
              <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
                All demand fulfilled. No constraint is binding after recovery.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destination</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Short</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {residual.map((u, i) => (
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

        <Card>
          <CardHeader>
            <CardTitle>Trade-off explanation</CardTitle>
            <CardDescription>Computed from the three plans — not an invented narrative.</CardDescription>
          </CardHeader>
          <CardContent>
            {cmp?.tradeoff_narrative ? (
              <p className="text-sm leading-relaxed text-slate-700">{cmp.tradeoff_narrative}</p>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">Select a scenario to see the computed trade-off.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: 'neutral' | 'good' | 'bad' | 'warn';
}) {
  const cls =
    tone === 'good'
      ? 'border-emerald-200 bg-emerald-50/50'
      : tone === 'bad'
        ? 'border-red-200 bg-red-50/50'
        : tone === 'warn'
          ? 'border-amber-200 bg-amber-50/50'
          : '';
  return (
    <Card className={cls}>
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
        <div className="mt-1 text-lg font-semibold">{value}</div>
        <div className="mt-1 text-xs text-slate-500">{sub}</div>
      </CardContent>
    </Card>
  );
}
