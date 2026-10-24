import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GitCompare, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { compareScenario, listScenarios } from '../lib/api';
import { useAppStore } from '../stores/appStore';

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const pct0 = (v: number) => `${(v * 100).toFixed(0)}%`;
const int = (v: number) => Math.round(v).toLocaleString();
const money = (v: number) => `$${Math.round(v).toLocaleString()}`;
const dec = (v: number) => v.toFixed(1);

/** Only these metrics have server-computed deltas. Everything else shows —. */
type DeltaKey = 'fulfillment_delta' | 'cost_delta' | 'unmet_delta';

type MetricRow = {
  metric: string;
  key: string;
  fmt: (v: number) => string;
  delta?: DeltaKey;
  goodWhenUp: boolean;
};

const METRICS: MetricRow[] = [
  { metric: 'Fulfillment rate', key: 'fulfillment_rate', fmt: pct, delta: 'fulfillment_delta', goodWhenUp: true },
  { metric: 'Unmet units', key: 'unmet', fmt: int, delta: 'unmet_delta', goodWhenUp: false },
  { metric: 'Total cost', key: 'total_cost', fmt: money, delta: 'cost_delta', goodWhenUp: false },
  { metric: 'Fulfilled units', key: 'fulfilled', fmt: int, goodWhenUp: true },
  { metric: 'Total inventory', key: 'total_inventory', fmt: int, goodWhenUp: true },
  { metric: 'Total demand', key: 'total_demand', fmt: int, goodWhenUp: true },
  { metric: 'Warehouse utilization', key: 'wh_utilization', fmt: pct0, goodWhenUp: false },
  { metric: 'Route utilization', key: 'route_utilization', fmt: pct0, goodWhenUp: false },
  { metric: 'Risk score', key: 'risk_score', fmt: dec, goodWhenUp: false },
];

export default function Compare() {
  const { scenarioId, setScenarioId } = useAppStore();
  const [sid, setSid] = React.useState(scenarioId ?? '');

  const { data: scenarioList } = useQuery({ queryKey: ['scenarios'], queryFn: () => listScenarios(50) });
  const scenarios = scenarioList?.scenarios ?? [];

  React.useEffect(() => {
    if (scenarioId) setSid(scenarioId);
  }, [scenarioId]);
  React.useEffect(() => {
    if (!sid && scenarios.length) setSid(scenarios[0].id);
  }, [scenarios, sid]);

  const cmpQuery = useQuery({
    queryKey: ['compare', sid],
    queryFn: () => compareScenario(sid),
    enabled: !!sid,
  });

  const cmp = cmpQuery.data;
  const b = cmp?.baseline?.kpis ?? null;
  const d = cmp?.disrupted?.kpis ?? null;
  const r = cmp?.recovered?.kpis ?? null;

  const valueOf = (kpi: typeof b, key: string): number | null => {
    if (!kpi) return null;
    const raw = (kpi as unknown as Record<string, number>)[key];
    return typeof raw === 'number' ? raw : null;
  };

  const risk = cmp?.delivery_risk;

  // Small multiples: each metric keeps its own scale so nothing is dwarfed
  const chart = (title: string, key: string, suffix: string, color: string) => {
    const data = [
      { name: 'Baseline', value: valueOf(b, key) ?? 0 },
      { name: 'Disrupted', value: valueOf(d, key) ?? 0 },
      { name: 'Recovered', value: valueOf(r, key) ?? 0 },
    ];
    return (
      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">{title}</div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={48} />
              <Tooltip formatter={(v: number) => `${Math.round(v * 100) / 100}${suffix}`} />
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Compare</h1>
          <p className="mt-1 text-sm text-slate-500">
            Absolute KPIs, computed deltas and the trade-off between plan, disruption and recovery.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/exports">
            Export this scenario <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" /> Choose scenario
          </CardTitle>
          <CardDescription>Comparison always includes baseline and disrupted; recovered appears once recovery has run.</CardDescription>
        </CardHeader>
        <CardContent>
          <label htmlFor="compare-scenario" className="text-xs font-medium text-slate-600">
            Scenario
          </label>
          <Select
            id="compare-scenario"
            value={sid}
            onChange={(e) => {
              setSid(e.target.value);
              setScenarioId(e.target.value);
            }}
            className="max-w-xl"
          >
            <option value="">Select a scenario…</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id.slice(0, 8)} · {(s.disruption?.type ?? '').replace(/_/g, ' ')} · {s.status}
              </option>
            ))}
          </Select>
          {!scenarios.length ? (
            <p className="mt-2 text-xs text-amber-600">
              No scenarios yet — <Link className="underline" to="/disruption">create one in the Disruption Lab</Link>.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {cmpQuery.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">{String((cmpQuery.error as Error).message)}</CardContent>
        </Card>
      ) : null}

      {!cmp ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-slate-500">
            Select a scenario to compare baseline, disrupted and recovered plans.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Baseline {String(cmp.baseline?.plan_id ?? '—').slice(0, 8)}</Badge>
            {cmp.disrupted ? <Badge variant="destructive">Disrupted {String(cmp.disrupted.plan_id).slice(0, 8)}</Badge> : null}
            {cmp.recovered ? (
              <Badge variant="success">Recovered {String(cmp.recovered.plan_id).slice(0, 8)}</Badge>
            ) : (
              <Badge variant="outline">No recovery yet</Badge>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>KPI comparison</CardTitle>
              <CardDescription>
                Δ columns appear only for metrics with a server-computed delta (fulfillment, unmet, cost).
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Baseline</TableHead>
                    <TableHead className="text-right">Disrupted</TableHead>
                    <TableHead className="text-right">Recovered</TableHead>
                    <TableHead className="text-right">Δ D−B</TableHead>
                    <TableHead className="text-right">Δ R−D</TableHead>
                    <TableHead className="text-right">Δ R−B</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {METRICS.map((m) => {
                    const bv = valueOf(b, m.key);
                    const dv = valueOf(d, m.key);
                    const rv = valueOf(r, m.key);
                    const delta = (group?: { fulfillment_delta: number; cost_delta: number; unmet_delta: number }) =>
                      m.delta && group ? group[m.delta] : null;
                    return (
                      <TableRow key={m.metric}>
                        <TableCell className="font-medium">{m.metric}</TableCell>
                        <TableCell className="text-right tabular-nums">{bv === null ? '—' : m.fmt(bv)}</TableCell>
                        <TableCell className="text-right tabular-nums">{dv === null ? '—' : m.fmt(dv)}</TableCell>
                        <TableCell className="text-right tabular-nums">{rv === null ? '—' : m.fmt(rv)}</TableCell>
                        <DeltaCell value={delta(cmp.deltas?.disrupted_vs_baseline)} kind={m.delta} goodWhenUp={m.goodWhenUp} />
                        <DeltaCell value={delta(cmp.deltas?.recovered_vs_disrupted)} kind={m.delta} goodWhenUp={m.goodWhenUp} />
                        <DeltaCell value={delta(cmp.deltas?.recovered_vs_baseline)} kind={m.delta} goodWhenUp={m.goodWhenUp} />
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {risk ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Deadline exposure across plans
                </CardTitle>
                <CardDescription>
                  Units that arrive after their destination deadline. A route delay raises this without removing capacity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Units late</TableHead>
                      <TableHead className="text-right">Max lateness</TableHead>
                      <TableHead>Destinations affected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {([
                      ['Baseline', risk.baseline],
                      ['Disrupted', risk.disrupted],
                      ['Recovered', risk.recovered],
                    ] as const).map(([label, rk]) => (
                      <TableRow key={label}>
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell className="text-right tabular-nums">{rk ? Math.round(rk.at_risk_units).toLocaleString() : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{rk ? `${rk.max_late_days}d` : '—'}</TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {rk && rk.at_risk_destinations.length ? rk.at_risk_destinations.join(', ') : 'none'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Visual comparison</CardTitle>
              <CardDescription>Each metric uses its own scale — mixing them on one axis hides the smaller values.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                {chart('Fulfillment (%)', 'fulfillment_rate', '%', '#0f172a')}
                {chart('Unmet units', 'unmet', '', '#dc2626')}
                {chart('Cost ($)', 'total_cost', '', '#334155')}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Trade-off
              </CardTitle>
              <CardDescription>Derived from computed KPIs and residual demand.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-slate-700">{cmp.tradeoff_narrative}</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function DeltaCell({
  value,
  kind,
  goodWhenUp,
}: {
  value: number | null;
  kind?: DeltaKey;
  goodWhenUp: boolean;
}) {
  if (!kind || value === null || value === undefined) {
    return <TableCell className="text-right text-slate-300">—</TableCell>;
  }
  if (Math.abs(value) < 1e-9) return <TableCell className="text-right text-slate-400">0</TableCell>;

  const positive = value > 0;
  const good = goodWhenUp ? positive : !positive;
  const magnitude =
    kind === 'fulfillment_delta'
      ? `${(Math.abs(value) * 100).toFixed(1)}pp`
      : kind === 'cost_delta'
        ? `$${Math.round(Math.abs(value)).toLocaleString()}`
        : Math.round(Math.abs(value)).toLocaleString();

  return (
    <TableCell className={`text-right font-medium tabular-nums ${good ? 'text-emerald-700' : 'text-red-700'}`}>
      {positive ? '+' : '−'}
      {magnitude}
    </TableCell>
  );
}
