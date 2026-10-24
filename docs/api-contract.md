# API contract — `/api/v1`

All endpoints return JSON except `/scenarios/{id}/export`, which returns CSV.
Errors use a single envelope:

```json
{ "detail": "human readable message", "code": "machine_code", "errors": [] }
```

| Status | Meaning in this API |
|---|---|
| 200 | Read or successful action |
| 201 | (reserved) created — current endpoints return 200 with the created object |
| 400 | Invalid input, bad disruption params, unparseable CSV |
| 404 | Dataset / plan / scenario not found |
| 413 | Upload exceeded the per-file size limit |
| 422 | FastAPI request-shape validation failure |
| 500 | Unexpected error — no stack trace is returned to the client |

---

## Datasets

### `POST /datasets/sample`
Loads the bundled deterministic sample network from `data/samples/`.
No body. Idempotent per call (each call creates a new dataset id).

```json
{
  "dataset_id": "uuid",
  "name": "Sample Network (bundled)",
  "created_at": "2026-10-24T17:00:00+00:00",
  "validation_report": { "valid": true, "issues": [], "summary": { "total_issues": 0, "errors": 0, "warnings": 0 } },
  "preview": { "warehouses": [ ... ], "destinations": [ ... ], "products": [ ... ],
               "routes": [ ... ], "inventory": [ ... ], "demand": [ ... ] }
}
```

### `POST /datasets/import`
`multipart/form-data` with exactly six files: `warehouses`, `destinations`, `products`,
`routes`, `inventory`, `demand`. Each must end in `.csv` and be under the configured limit
(default 5 MB). Returns the same shape as `/datasets/sample`.

### `GET /datasets/`
```json
{ "datasets": [ { "id": "...", "name": "...", "created_at": "...", "meta": { "...": "raw rows" } } ] }
```

### `GET /datasets/{id}`
Returns the stored dataset document including `meta.validation_report`.

### `POST /datasets/{id}/validate`
Re-runs validation against the stored rows and returns a `ValidationReport`.

---

## Plans

### `POST /plans`
```json
{ "dataset_id": "uuid", "solver": "greedy" }
```
`solver` is optional (`greedy | ortools | auto`). Defaults to server config.

Response:
```json
{
  "id": "uuid", "dataset_id": "uuid", "type": "baseline", "status": "completed",
  "solver": "greedy", "created_at": "...",
  "allocations": [{ "warehouse_id": "WH-02", "destination_id": "DST-01", "product_id": "PRD-A",
                    "route_id": "RT-03", "quantity": 300.0 }],
  "unmet": [{ "destination_id": "DST-08", "product_id": "PRD-C", "quantity": 160.0, "priority": 3 }],
  "kpis": { "total_inventory": 7000, "total_demand": 4970, "fulfilled": 4970,
            "fulfillment_rate": 1.0, "unmet": 0, "total_cost": 24240,
            "wh_utilization": 0.71, "route_utilization": 0.55,
            "at_risk_destinations": 0, "risk_score": 16.6,
            "risk_breakdown": { "unmet_component": 0, "route_component": 11.0,
                                "at_risk_component": 0, "cost_component": 5.6,
                                "description": "risk_score = ..." } },
  "diagnostics": { "elapsed_seconds": 0.002, "solver": "greedy" },
  "utilization": { "wh_utilization": 0.71, "route_utilization": 0.55 }
}
```

### `GET /plans/`
`?limit=25&plan_type=baseline` → `{ "plans": [{ "id", "type", "kpis", "allocation_count", ... }], "total": n }`

### `GET /plans/{id}`
Same shape as the create response.

---

## Scenarios

### `POST /scenarios`
```json
{
  "baseline_plan_id": "uuid",
  "disruption": { "type": "inventory_shortage",
                  "params": { "warehouse_id": "WH-02", "product_id": "PRD-A", "reduction_pct": 60 } }
}
```

Disruption parameter schemas:

| Type | Required params | Effect on planning inputs |
|---|---|---|
| `inventory_shortage` | `warehouse_id`, `product_id`, `reduction_pct` (0–100) | `quantity *= (1 − pct/100)` |
| `supply_interruption` | `warehouse_id`, `product_id` | `quantity = 0` |
| `route_closure` | `route_id` | `available = false` |
| `route_delay` | `route_id`, `extra_days` (≥ 0) | `time_days += extra_days` (capacity unchanged) |

Response:
```json
{
  "scenario": { "id", "baseline_plan_id", "disruption", "disrupted_plan_id", "status": "disrupted", "created_at" },
  "disrupted_plan": { "...": "full plan document" },
  "impact": {
    "fulfillment_delta": -0.1006, "cost_delta": -1620, "unmet_delta": 500,
    "at_risk_units": 0, "at_risk_delta": 0, "max_late_days": 0,
    "delivery_risk": { "at_risk_units": 0, "at_risk_destinations": [], "at_risk_shipments": [],
                       "max_late_days": 0, "definition": "..." },
    "disruption_description": "Route closure: set route RT-03 available=False"
  }
}
```

Errors: `400` for unknown type or missing/invalid params, `404` for unknown baseline plan.

### `GET /scenarios/`
`?limit=25` → recent scenarios with `kpis.{baseline,disrupted,recovered}`.

### `GET /scenarios/{id}`
`{ "scenario": {...}, "baseline_plan": {...}, "disrupted_plan": {...}, "recovered_plan": {...}|null }`

### `POST /scenarios/{id}/recover`
No body. Re-plans with contingency lanes enabled.

```json
{
  "recovered_plan": { "...": "plan document" },
  "recovery_actions": [
    { "type": "activate_contingency_lane", "details": ["RT-13"], "explanation": "Activated 1 contingency lane(s): RT-13", "avg_cost_per_unit": 7.6 },
    { "type": "reallocate", "warehouse_id": "WH-03", "destination_id": "DST-01", "product_id": "PRD-A",
      "route_id": "RT-13", "quantity_delta": 300.0, "activated_contingency_lane": true,
      "cost_per_unit": 7.6, "explanation": "Added 300 units from WH-03 to DST-01 for PRD-A via RT-13 (contingency lane)" },
    { "type": "residual_unmet", "details": [ ... ], "explanation": "Residual unmet demand: ..." }
  ],
  "residual_unmet": [ { "destination_id": "...", "product_id": "...", "quantity": 0, "priority": 1 } ]
}
```

### `GET /scenarios/{id}/compare`
```json
{
  "baseline":  { "plan_id", "kpis", "plan" },
  "disrupted": { "plan_id", "kpis", "plan" },
  "recovered": { "plan_id", "kpis", "plan" } | null,
  "deltas": {
    "disrupted_vs_baseline":  { "fulfillment_delta": -0.1006, "cost_delta": -1620, "unmet_delta": 500 },
    "recovered_vs_disrupted": { "fulfillment_delta": 0.1006, "cost_delta": 3410, "unmet_delta": -500 },
    "recovered_vs_baseline":  { "fulfillment_delta": 0, "cost_delta": 1790, "unmet_delta": 0 }
  },
  "delivery_risk": { "baseline": {...}, "disrupted": {...}, "recovered": {...} },
  "tradeoff_narrative": "Disruption reduced fulfillment from 100.0% to 89.9%; ... Recovery restored 10.1% fulfillment at $+3410.00 extra cost. All demand is now fulfilled."
}
```

### `GET /scenarios/{id}/export`
`text/csv; charset=utf-8` with `Content-Disposition: attachment; filename="pre-mortem-scenario-xxxxxxxx.csv"`.

Structure: `Scenario: <id>` then one block per plan (`Plan: <id> (<type>)`) containing
`Allocations`, `Unmet`, and `KPIs` sections. Values are the stored computed plan — nothing is
recomputed at export time.

---

## Operational

### `GET /health`
```json
{ "status": "ok", "version": "1.0.0", "solver": "greedy", "db": "ok" }
```

### `GET /forecast?destination_id=&product_id=&horizon=`
Baseline moving-average forecast (window 3) with widened p10/p90 band. **Labeled
`model: "baseline"` and `fallback: true`** — this is not a trained model and no accuracy is
claimed. Allocation never consumes it implicitly.

```json
{ "destination_id": "DST-01", "product_id": "PRD-A", "horizon": 4, "model": "baseline",
  "forecast": [ { "period": 1, "mean": 300.0, "p10": 240.0, "p90": 360.0 } ],
  "history_used": [ { "quantity": 300.0 } ] }
```
