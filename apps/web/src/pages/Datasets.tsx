import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileCheck, AlertTriangle, Info, Database, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  listDatasets,
  importDataset,
  loadSampleDataset,
  getDataset,
  type Dataset,
  type ImportDatasetResponse,
  type ValidationReport,
} from '../lib/api';
import { useAppStore } from '../stores/appStore';

const TABLES = ['warehouses', 'destinations', 'products', 'routes', 'inventory', 'demand'] as const;

const TEMPLATES: Record<string, string> = {
  warehouses: 'id,name,region,lat,lng\nWH-01,Central Hub,Midwest,41.88,-87.62',
  destinations: 'id,name,priority,region,deadline_days\nDST-01,Metro General Hospital,1,Northeast,5',
  products: 'id,name,unit,weight_kg\nPRD-A,Industrial Sensor,units,2.5',
  routes:
    'id,warehouse_id,destination_id,capacity,cost_per_unit,time_days,available,product_ids,backup\nRT-01,WH-01,DST-01,600,4.5,2,true,,false',
  inventory: 'warehouse_id,product_id,quantity\nWH-01,PRD-A,800',
  demand: 'destination_id,product_id,quantity\nDST-01,PRD-A,300',
};

export default function Datasets() {
  const qc = useQueryClient();
  const { datasetId, setDatasetId, setPlanId } = useAppStore();
  const [files, setFiles] = React.useState<Record<string, File | null>>(() =>
    Object.fromEntries(TABLES.map((t) => [t, null])),
  );
  const [lastImport, setLastImport] = React.useState<ImportDatasetResponse | null>(null);

  const { data: listData, isFetching: listLoading } = useQuery({
    queryKey: ['datasets'],
    queryFn: listDatasets,
  });

  const selectedDatasetQuery = useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: () => getDataset(datasetId!),
    enabled: !!datasetId,
  });

  const onImported = (res: ImportDatasetResponse) => {
    setLastImport(res);
    setDatasetId(res.dataset_id);
    setPlanId(null);
    qc.invalidateQueries({ queryKey: ['datasets'] });
  };

  const uploadMut = useMutation({ mutationFn: (fd: FormData) => importDataset(fd), onSuccess: onImported });
  const sampleMut = useMutation({ mutationFn: loadSampleDataset, onSuccess: onImported });

  const busy = uploadMut.isPending || sampleMut.isPending;
  const error = uploadMut.error ?? sampleMut.error;

  const canUpload = TABLES.every((t) => files[t]);

  const doUpload = () => {
    const fd = new FormData();
    for (const t of TABLES) if (files[t]) fd.append(t, files[t]!);
    uploadMut.mutate(fd);
  };

  const validation: ValidationReport | undefined =
    lastImport?.validation_report ??
    (selectedDatasetQuery.data?.meta?.validation_report as ValidationReport | undefined);

  const preview: Record<string, Record<string, unknown>[]> | null = lastImport?.preview
    ? lastImport.preview
    : selectedDatasetQuery.data
      ? extractPreview(selectedDatasetQuery.data)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Datasets</h1>
        <p className="mt-1 text-sm text-slate-500">
          Load the bundled network or upload six CSVs. Every import is validated before planning.
        </p>
      </div>

      <Card className="border-slate-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" /> Bundled sample network
          </CardTitle>
          <CardDescription>
            4 warehouses · 8 destinations · 3 products · 20 lanes (12 primary, 8 contingency). No external keys required.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button onClick={() => sampleMut.mutate()} disabled={busy}>
            {sampleMut.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Load sample dataset
          </Button>
          {datasetId ? <Badge variant="secondary">Active: {datasetId.slice(0, 8)}</Badge> : null}
          <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['datasets'] })} disabled={listLoading}>
            {listLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh list
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">{String((error as Error).message)}</CardContent>
        </Card>
      ) : null}
      {lastImport && !error ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Dataset imported — {lastImport.dataset_id.slice(0, 8)} · proceed to the Planner.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload your own CSVs
          </CardTitle>
          <CardDescription>Six files required. Columns must match the templates exactly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TABLES.map((t) => (
              <div key={t} className="rounded-lg border p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t}</div>
                <Input
                  type="file"
                  accept=".csv"
                  className="mt-2"
                  onChange={(e) => setFiles((prev) => ({ ...prev, [t]: e.target.files?.[0] ?? null }))}
                />
                <div className="mt-1 truncate text-xs text-slate-500">{files[t]?.name ?? 'No file chosen'}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => {
                    const blob = new Blob([TEMPLATES[t]], { type: 'text/csv' });
                    const href = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = href;
                    a.download = `${t}.template.csv`;
                    a.click();
                    URL.revokeObjectURL(href);
                  }}
                >
                  Download template
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={doUpload} disabled={!canUpload || busy}>
              {uploadMut.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Validate &amp; import
            </Button>
            <span className="text-xs text-slate-500">
              {canUpload ? 'All six files selected.' : `${TABLES.filter((t) => !files[t]).length} file(s) still required.`}
            </span>
          </div>
        </CardContent>
      </Card>

      {validation ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validation.valid ? <FileCheck className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
              Validation report
              <Badge variant={validation.valid ? 'success' : 'warning'}>{validation.valid ? 'Valid' : 'Has issues'}</Badge>
            </CardTitle>
            <CardDescription>
              {validation.issues.length} issue(s) detected. Invalid rows are reported, never silently dropped.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {validation.issues.length === 0 ? (
              <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
                No issues — schema, types, references and duplicates all check out.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Row</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validation.issues.map((iss, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant={iss.severity === 'error' ? 'destructive' : iss.severity === 'warning' ? 'warning' : 'secondary'}>
                          {iss.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{iss.field ?? '—'}</TableCell>
                      <TableCell>{iss.row ?? '—'}</TableCell>
                      <TableCell className="max-w-md">{iss.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-2 p-6 text-sm text-slate-500">
            <Info className="h-4 w-4" /> Import or select a dataset to see its validation report.
          </CardContent>
        </Card>
      )}

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>Data preview</CardTitle>
            <CardDescription>First five rows of each table in the active dataset.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {TABLES.map((t) => {
              const rows = preview[t] ?? [];
              if (!rows.length) return null;
              const cols = Object.keys(rows[0] ?? {});
              return (
                <div key={t}>
                  <div className="mb-2 text-sm font-semibold capitalize">
                    {t} <span className="font-normal text-slate-500">· {rows.length} shown</span>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {cols.map((c) => (
                            <TableHead key={c}>{c}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.slice(0, 5).map((r, i) => (
                          <TableRow key={i}>
                            {cols.map((c) => (
                              <TableCell key={c} className="whitespace-nowrap font-mono text-xs">
                                {String(r[c] ?? '—')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Datasets in this workspace</CardTitle>
          <CardDescription>Select one to make it the active planning context.</CardDescription>
        </CardHeader>
        <CardContent>
          {!listData?.datasets?.length ? (
            <div className="py-6 text-center text-sm text-slate-500">No datasets yet — load the sample to begin.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Warehouses</TableHead>
                  <TableHead>Routes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listData.datasets.map((ds) => (
                  <TableRow key={ds.id} className={ds.id === datasetId ? 'bg-slate-50' : undefined}>
                    <TableCell className="font-mono text-xs">{ds.id.slice(0, 12)}…</TableCell>
                    <TableCell className="text-sm">{ds.name}</TableCell>
                    <TableCell className="text-xs">{ds.meta?.warehouses?.length ?? 0}</TableCell>
                    <TableCell className="text-xs">{ds.meta?.routes?.length ?? 0}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {ds.created_at ? new Date(ds.created_at).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={ds.id === datasetId ? 'default' : 'outline'}
                        onClick={() => {
                          setDatasetId(ds.id);
                          setPlanId(null);
                          setLastImport(null);
                        }}
                      >
                        {ds.id === datasetId ? 'Active' : 'Use'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function extractPreview(ds: Dataset): Record<string, Record<string, unknown>[]> {
  const out: Record<string, Record<string, unknown>[]> = {};
  for (const t of TABLES) {
    const arr = (ds.meta as Record<string, unknown>)[t];
    out[t] = Array.isArray(arr) ? (arr as Record<string, unknown>[]).slice(0, 5) : [];
  }
  return out;
}
