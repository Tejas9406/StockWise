const BASE: string = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL as string | undefined) ?? '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type HealthResponse = {
  status: string;
  version: string;
  solver: string;
  db: string;
};

export type ValidationIssue = {
  row?: number | null;
  field?: string | null;
  message: string;
  severity: string;
};

export type ValidationReport = {
  valid: boolean;
  issues: ValidationIssue[];
  summary: Record<string, unknown>;
};

export type DatasetPreview = Record<string, Record<string, unknown>[]>;

export type ImportDatasetResponse = {
  dataset_id: string;
  validation_report: ValidationReport;
  preview: DatasetPreview;
};

export type Dataset = {
  id: string;
  name: string;
  created_at: string;
  meta: {
    warehouses: Record<string, unknown>[];
    destinations: Record<string, unknown>[];
    products: Record<string, unknown>[];
    routes: Record<string, unknown>[];
    inventory: Record<string, unknown>[];
    demand: Record<string, unknown>[];
    validation_report?: ValidationReport;
    [k: string]: unknown;
  };
};

export type ListDatasetsResponse = {
  datasets: Dataset[];
};

export type KPISnapshot = {
  total_inventory: number;
  total_demand: number;
  fulfilled: number;
  fulfillment_rate: number;
  unmet: number;
  total_cost: number;
  wh_utilization: number;
  route_utilization: number;
  at_risk_destinations: number;
  risk_score: number;
  risk_breakdown: Record<string, unknown>;
};

export type AllocationItem = {
  warehouse_id: string;
  destination_id: string;
  product_id: string;
  route_id: string;
  quantity: number;
};

export type UnmetDemand = {
  destination_id: string;
  product_id: string;
  quantity: number;
  priority: number;
};

export type PlanResponse = {
  id: string;
  dataset_id: string;
  type: string;
  status: string;
  solver: string;
  created_at: string;
  allocations: AllocationItem[];
  unmet: UnmetDemand[];
  kpis: KPISnapshot;
  diagnostics?: Record<string, unknown>;
  utilization?: Record<string, unknown>;
};

export type DisruptionRequest = {
  type: string;
  params: Record<string, unknown>;
};

export type ImpactSummary = {
  fulfillment_delta: number;
  cost_delta: number;
  unmet_delta: number;
  at_risk_units?: number;
  at_risk_delta?: number;
  max_late_days?: number;
  delivery_risk?: DeliveryRisk;
  disruption_description: string;
};

export type DeliveryRisk = {
  at_risk_units: number;
  at_risk_destinations: string[];
  at_risk_shipments: {
    destination_id: string;
    route_id: string;
    quantity: number;
    transit_days: number;
    deadline_days: number;
    late_by_days: number;
  }[];
  max_late_days: number;
  definition: string;
};

export type RecoveryAction = {
  type: string;
  explanation: string;
  warehouse_id?: string;
  destination_id?: string;
  product_id?: string;
  route_id?: string;
  quantity_delta?: number;
  activated_contingency_lane?: boolean;
  cost_per_unit?: number;
  details?: unknown;
};

export type ScenarioSummary = {
  id: string;
  status: string;
  created_at: string;
  baseline_plan_id: string;
  disrupted_plan_id: string | null;
  recovered_plan_id: string | null;
  disruption: DisruptionRequest;
  kpis: {
    baseline: KPISnapshot | null;
    disrupted: KPISnapshot | null;
    recovered: KPISnapshot | null;
  };
};

export type PlanSummary = {
  id: string;
  dataset_id: string;
  type: string;
  status: string;
  solver: string;
  created_at: string;
  kpis: KPISnapshot;
  allocation_count: number;
  unmet_count: number;
};

export type ScenarioCreateResponse = {
  scenario: {
    id: string;
    baseline_plan_id: string;
    disruption: DisruptionRequest;
    disrupted_plan_id: string;
    status: string;
    created_at: string;
  };
  disrupted_plan: PlanResponse;
  impact: ImpactSummary;
};

export type ScenarioDetail = {
  scenario: {
    id: string;
    baseline_plan_id: string;
    disrupted_plan_id: string | null;
    recovered_plan_id: string | null;
    disruption: DisruptionRequest;
    status: string;
    created_at: string;
  };
  baseline_plan: (PlanResponse & { data?: unknown }) | null;
  disrupted_plan: (PlanResponse & { data?: unknown; id?: string }) | null;
  recovered_plan: (PlanResponse & { data?: unknown; id?: string }) | null;
};

export type RecoverResponse = {
  recovered_plan: PlanResponse;
  recovery_actions: RecoveryAction[];
  residual_unmet: UnmetDemand[];
};

export type CompareResponse = {
  baseline: { plan_id: string; kpis: KPISnapshot | null; plan: unknown };
  disrupted: { plan_id: string; kpis: KPISnapshot | null; plan: unknown } | null;
  recovered: { plan_id: string; kpis: KPISnapshot | null; plan: unknown } | null;
  deltas: Record<string, { fulfillment_delta: number; cost_delta: number; unmet_delta: number }>;
  delivery_risk?: {
    baseline: DeliveryRisk | null;
    disrupted: DeliveryRisk | null;
    recovered: DeliveryRisk | null;
  };
  tradeoff_narrative: string;
};

export type ForecastResponse = {
  destination_id: string;
  product_id: string;
  horizon: number;
  model: string;
  forecast: { period: number; quantity: number }[] | number[] | Record<string, unknown>[];
  history_used: Record<string, unknown>[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      detail = j.detail ?? j.message ?? JSON.stringify(j);
    } catch {
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

function url(path: string) {
  return `${BASE}${path}`;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
export async function health(): Promise<HealthResponse> {
  const res = await fetch(url('/api/v1/health'));
  return handle<HealthResponse>(res);
}

export async function listDatasets(): Promise<ListDatasetsResponse> {
  const res = await fetch(url('/api/v1/datasets/'));
  return handle<ListDatasetsResponse>(res);
}

export async function importDataset(formData: FormData): Promise<ImportDatasetResponse> {
  const res = await fetch(url('/api/v1/datasets/import'), {
    method: 'POST',
    body: formData,
  });
  return handle<ImportDatasetResponse>(res);
}

export async function loadSampleDataset(): Promise<ImportDatasetResponse & { name: string }> {
  const res = await fetch(url('/api/v1/datasets/sample'), { method: 'POST' });
  return handle<ImportDatasetResponse & { name: string }>(res);
}

export async function listScenarios(limit = 25): Promise<{ scenarios: ScenarioSummary[]; total: number }> {
  const res = await fetch(url(`/api/v1/scenarios/?limit=${limit}`));
  return handle<{ scenarios: ScenarioSummary[]; total: number }>(res);
}

export async function listPlans(limit = 25): Promise<{ plans: PlanSummary[]; total: number }> {
  const res = await fetch(url(`/api/v1/plans/?limit=${limit}`));
  return handle<{ plans: PlanSummary[]; total: number }>(res);
}

export async function getDataset(id: string): Promise<Dataset> {
  const res = await fetch(url(`/api/v1/datasets/${id}`));
  return handle<Dataset>(res);
}

export async function createPlan(datasetId: string, solver?: string): Promise<PlanResponse> {
  const res = await fetch(url('/api/v1/plans/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(solver ? { dataset_id: datasetId, solver } : { dataset_id: datasetId }),
  });
  return handle<PlanResponse>(res);
}

export async function getPlan(id: string): Promise<PlanResponse> {
  const res = await fetch(url(`/api/v1/plans/${id}`));
  return handle<PlanResponse>(res);
}

export async function createScenario(
  baselinePlanId: string,
  disruption: DisruptionRequest,
): Promise<ScenarioCreateResponse> {
  const res = await fetch(url('/api/v1/scenarios/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseline_plan_id: baselinePlanId, disruption }),
  });
  return handle<ScenarioCreateResponse>(res);
}

export async function getScenario(id: string): Promise<ScenarioDetail> {
  const res = await fetch(url(`/api/v1/scenarios/${id}`));
  return handle<ScenarioDetail>(res);
}

export async function recoverScenario(id: string): Promise<RecoverResponse> {
  const res = await fetch(url(`/api/v1/scenarios/${id}/recover`), {
    method: 'POST',
  });
  return handle<RecoverResponse>(res);
}

export async function compareScenario(id: string): Promise<CompareResponse> {
  const res = await fetch(url(`/api/v1/scenarios/${id}/compare`));
  return handle<CompareResponse>(res);
}

export async function exportScenario(id: string): Promise<Blob> {
  // Try server-side export first
  const res = await fetch(url(`/api/v1/scenarios/${id}/export`));
  if (res.ok) return await res.blob();
  // Fallback: generate CSV client-side from compare endpoint
  const cmp = await compareScenario(id);
  const rows: string[][] = [];
  rows.push(['Pre-Mortem Dispatch — Scenario Export', id]);
  rows.push([]);
  const plans: Array<{ label: string; kpis: KPISnapshot | null | undefined }> = [
    { label: 'baseline', kpis: cmp.baseline?.kpis },
    { label: 'disrupted', kpis: cmp.disrupted?.kpis ?? null },
    { label: 'recovered', kpis: cmp.recovered?.kpis ?? null },
  ];
  rows.push(['plan', 'metric', 'value']);
  for (const p of plans) {
    if (!p.kpis) continue;
    for (const [k, v] of Object.entries(p.kpis)) {
      rows.push([p.label, k, typeof v === 'object' ? JSON.stringify(v) : String(v)]);
    }
  }
  rows.push([]);
  rows.push(['narrative', cmp.tradeoff_narrative]);
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  return new Blob([csv], { type: 'text/csv' });
}

export async function forecast(params: {
  destination_id: string;
  product_id: string;
  horizon?: number;
}): Promise<ForecastResponse> {
  const q = new URLSearchParams({
    destination_id: params.destination_id,
    product_id: params.product_id,
    horizon: String(params.horizon ?? 4),
  });
  const res = await fetch(url(`/api/v1/forecast?${q.toString()}`));
  return handle<ForecastResponse>(res);
}
