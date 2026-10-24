# Optimization model

## Decision variables

For every demand row `(d, p)` and every lane `r = (w → d)` that can carry `p`:

```
x[r, p] ≥ 0     units of product p shipped from w to d on lane r
u[d, p] ≥ 0     unmet units for demand row (d, p)
```

A lane may serve a demand row only if it is `available`, its `product_ids` allow `p` (or is
null), and the origin warehouse holds stock of `p`.

## Constraints

```
(1) Inventory      Σ_r  x[r, p]  ≤  inventory[w(r), p]        ∀ (w, p)
(2) Demand         Σ_r  x[r, p] + u[d, p] = demand[d, p]      ∀ (d, p)
(3) Lane capacity  Σ_p  x[r, p]  ≤  capacity[r]               ∀ r
(4) Availability   x[r, p] = 0                                if r.available = false
(5) Product rule   x[r, p] = 0                                if r.product_ids excludes p
(6) No lane        x[r, p] = 0                                if no lane exists w → d
```

## Objective

```
minimise  Σ_r Σ_p cost_per_unit[r] · x[r, p]
        + Σ_(d,p) penalty_unmet · priority_weight(d) · u[d, p]
```

- `penalty_unmet = 1000.0` per unit. This deliberately dwarfs any lane cost (max $9.00/unit in
  the sample network), so the solver fills demand whenever any feasible lane exists and only
  reports unmet demand when it is genuinely unavoidable.
- `priority_weight(d) = 6 − priority(d)`, so priority 1 → weight 5 and priority 5 → weight 1.
  Serving a critical destination is worth up to 5× a low-priority one.

## Solver

`settings.solver` selects the engine:

| Value | Behaviour |
|---|---|
| `greedy` (default) | Deterministic heuristic, always available |
| `ortools` | LP via OR-Tools `GLOP`, exact optimum for the formulation above |
| `auto` | Tries OR-Tools, falls back to greedy on `ImportError` |

**Greedy procedure.** Sort demand rows by `(priority asc, quantity desc)`. For each row, walk
eligible lanes ordered by `cost_per_unit asc`, allocating
`min(remaining demand, remaining inventory at origin, remaining lane capacity)`. Record any
leftover as unmet. This is *feasible* and priority-respecting but is **not claimed optimal** —
`diagnostics.solver` always states which engine ran, and `fallback` is set when OR-Tools was
requested but unavailable.

## Status semantics

| `status` | Meaning |
|---|---|
| `optimal` | All demand covered (greedy) or LP proved optimal |
| `feasible` | Valid plan with residual unmet demand |
| `infeasible` | Constraints cannot be satisfied at all |
| `error` | Solver failed; diagnostics carry the reason |

Feasibility ≠ optimality. The UI shows the solver name and status next to every plan.

## Backup (contingency) lanes

`route.backup = true` marks contracted contingency capacity. These lanes are **excluded** from
baseline and disrupted planning (`allow_backup=False`) and become eligible only during recovery
(`allow_backup=True`) at their premium cost.

This is a real change to the optimisation, not a relabel:

- Baseline / disrupted solve: `eligible = {r : r.available and not r.backup}`
- Recovery solve: `eligible = {r : r.available}`

Consequence in the sample network: closing `RT-03` costs 500 units of DST-01 demand; recovery
activates `RT-13` (WH-03 → DST-01, $7.60/unit) and restores full coverage for +$3,410. Without
the backup lane the shortfall is reported as residual, not papered over.

## Documented assumptions

1. **Route delay does not change capacity.** It raises `time_days`, which feeds the delivery-risk
   KPI (`transit_days > deadline_days`) but never makes a shipment infeasible. This is a stated
   modelling choice; enforcing deadlines as hard constraints is a future extension.
2. **Split shipments are allowed** — one demand row may be served by several lanes.
3. **Units are homogeneous per product.** No weight/volume packing constraints are modelled even
   though `weight_kg` exists on products.
4. **Inventory is not shared across products** — no substitution.
5. **Deterministic.** No randomness; identical inputs produce identical outputs.

## Risk score

```
risk_score = 50·(unmet / demand)
           + 20·route_utilization
           + 15·(at_risk_destinations / total_destinations)
           + 15·min(cost_per_unit_fulfilled / 100, 1)
```
`at_risk_destinations` counts destinations with unmet demand and priority ≤ 2. Capped to
[0, 100]. The full breakdown is returned in `kpis.risk_breakdown` and rendered in the Planner.
