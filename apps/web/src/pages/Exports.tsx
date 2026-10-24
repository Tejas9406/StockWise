import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Eye, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { compareScenario, exportScenario, listScenarios } from '../lib/api';
import { useAppStore } from '../stores/appStore';

export default function Exports() {
  const { scenarioId, setScenarioId } = useAppStore();
  const [sid, setSid] = React.useState(scenarioId ?? '');
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);

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
  const b = cmp?.baseline?.kpis;
  const d = cmp?.disrupted?.kpis;
  const r = cmp?.recovered?.kpis;

  const doExport = async () => {
    setError(null);
    setDone(null);
    setDownloading(true);
    try {
      const blob = await exportScenario(sid);
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `pre-mortem-scenario-${sid.slice(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      setDone(`Downloaded pre-mortem-scenario-${sid.slice(0, 8)}.csv (${Math.max(1, Math.round(blob.size / 1024))} KB)`);
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Exports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Download the scenario exactly as computed — allocations, unmet demand and KPIs for every plan in the chain.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Export scenario results
          </CardTitle>
          <CardDescription>CSV is generated server-side from stored plan data, so it matches the dashboard exactly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label htmlFor="export-scenario" className="text-xs font-medium text-slate-600">
                Scenario
              </label>
              <Select
                id="export-scenario"
                value={sid}
                onChange={(e) => {
                  setSid(e.target.value);
                  setScenarioId(e.target.value);
                  setDone(null);
                  setError(null);
                }}
              >
                <option value="">Select a scenario…</option>
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id.slice(0, 8)} · {(s.disruption?.type ?? '').replace(/_/g, ' ')} · {s.status}
                  </option>
                ))}
              </Select>
              {!scenarios.length ? (
                <p className="mt-1 text-xs text-amber-600">
                  No scenarios yet — <Link className="underline" to="/disruption">create one first</Link>.
                </p>
              ) : null}
            </div>
            <div className="flex items-end">
              <Button onClick={doExport} disabled={!sid || downloading} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {downloading ? 'Preparing…' : 'Download CSV'}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          ) : null}
          {done ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{done}</div> : null}
        </CardContent>
      </Card>

      {cmp ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Export preview
            </CardTitle>
            <CardDescription>These are the exact values written to the file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Baseline {String(cmp.baseline?.plan_id ?? '—').slice(0, 8)}</Badge>
              {cmp.disrupted ? <Badge variant="destructive">Disrupted {String(cmp.disrupted.plan_id).slice(0, 8)}</Badge> : null}
              {cmp.recovered ? <Badge variant="success">Recovered {String(cmp.recovered.plan_id).slice(0, 8)}</Badge> : null}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Baseline</TableHead>
                    <TableHead className="text-right">Disrupted</TableHead>
                    <TableHead className="text-right">Recovered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ['Fulfillment', (k: typeof b & object) => `${(k.fulfillment_rate * 100).toFixed(1)}%`],
                    ['Fulfilled units', (k: typeof b & object) => Math.round(k.fulfilled).toLocaleString()],
                    ['Unmet units', (k: typeof b & object) => Math.round(k.unmet).toLocaleString()],
                    ['Total cost', (k: typeof b & object) => `$${Math.round(k.total_cost).toLocaleString()}`],
                    ['WH utilization', (k: typeof b & object) => `${(k.wh_utilization * 100).toFixed(0)}%`],
                    ['Route utilization', (k: typeof b & object) => `${(k.route_utilization * 100).toFixed(0)}%`],
                    ['Risk score', (k: typeof b & object) => k.risk_score.toFixed(1)],
                  ].map(([label, fmt]) => (
                    <TableRow key={String(label)}>
                      <TableCell className="font-medium">{String(label)}</TableCell>
                      <TableCell className="text-right tabular-nums">{b ? (fmt as (k: typeof b & object) => string)(b) : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{d ? (fmt as (k: typeof b & object) => string)(d) : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{r ? (fmt as (k: typeof b & object) => string)(r) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">Trade-off</div>
              <p className="text-sm text-slate-700">{cmp.tradeoff_narrative}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
