# AI/ML Technical Specification

## Suggested package
`aiml/data/{validation,preprocessing}.py`; `aiml/forecasting/{baseline,features,train,predict,evaluate,registry}.py`; `aiml/inventory/{position,risk,replenishment}.py`; `aiml/optimization/{allocation,constraints,validate_plan}.py`; `aiml/expiry/{risk,interventions}.py`; `aiml/schemas/{inputs,outputs}.py`; `aiml/monitoring/{drift,metrics}.py`; tests. Adapt to existing repo.

## Forecasting
Define SKU-location-time grain and horizon. Start with naïve/seasonal-naïve or moving-average baseline. Use chronological backtests; compare candidate on same windows. Metrics: MAE/WAPE/bias where suitable; avoid MAPE with zero actuals. Handle intermittent/new SKUs, missing days, nonnegative outputs and future leakage. Record model version, training window, data cutoff and evaluation.

## Inventory/replenishment
Pure deterministic functions with explicit units. Suggested base formula: `suggested_qty = max(0, forecast_demand_over_planning_horizon + safety_stock - inventory_position)`. Define inventory position consistently; account for usable stock, confirmed incoming, allocated demand and lead time without double counting. Apply MOQ/pack/supplier/budget/capacity constraints where known.

## Optimization
Define variables, objective, constraints and units. Candidate objective: minimize weighted unmet demand and relevant transfer/handling costs. Constraints may include supply, demand, capacity, route, lead time, expiry and supplier limits only where data exists. Independently validate solver output; report infeasible/timeout honestly; compare with simple baseline on identical inputs.

## Expiry and serving
Estimate sell-through before expiry with demand, existing stock and transit time. Profit-aware clearance only when margin data is valid. Return run ID, schema version, model/version, data cutoff, assumptions, warnings, reason codes and solver status. SW validates before persistence/approval. LLMs do not perform exact arithmetic.
