# StockWise AI — AIML Project Tracker

> **Purpose:** Track data engineering, demand forecasting, risk detection, replenishment calculations, network allocation, expiry decisions, evaluation, and model reliability for StockWise AI.
>
> **How to use:** Keep this file in the `AIML/` folder. Mark tasks complete only when the implementation and evidence exist. Baseline methods are valid deliverables; do not add complex ML merely to make the project look more AI-heavy.
>
> **Status legend:** `[ ]` Not started · `[-]` In progress · `[x]` Verified complete · `[!]` Blocked · `[~]` Deferred/optional

## 1. Project control

- **Project:** StockWise AI — Distribution Intelligence & Inventory Optimization Engine
- **Owner:** AIML / data and decision intelligence workstream
- **Repository / module path:** https://github.com/Tejas9406/StockWise (`ml-service/`, `apps/api/`, `server/services/`)
- **Dataset source and license:** Verified FMCG operational dataset, reproducible sample CSVs (`data/samples/`)
- **Last updated:** 2026-10-25
- **Current phase:** Phase 2 Production ML + FEFO Optimization Engine
- **Current model/baseline version:** v2.1-ensemble (GradientBoostingRegressor + PuLP MILP constrained solver + Moving Average WAPE baseline)
- **Known blockers:** None

### Definition of done

A model or decision component is complete only when data assumptions, implementation, evaluation, failure behavior, and interface contract are documented and tested. Do not invent accuracy, business impact, or model outputs. Label synthetic data and simulation results.

## 2. P0 — Data foundation

### A. Data sources and schema
- [x] Inventory all available files, sample datasets, APIs, and business inputs before choosing a model.
- [x] Record source, license, collection time, granularity, units, date range, missing fields, and known limitations.
- [x] Define canonical schemas for products/SKUs, locations, timestamps, sales, inventory balances, batches/expiry, suppliers, lead times, costs, capacities, and confirmed incoming orders.
- [x] Define SKU/location/time grain and time zone conventions.
- [x] Validate identifiers and relationships across sales, inventory, products, locations, and batches.
- [x] Build realistic demo data only where necessary and label it as synthetic.
- [x] Avoid implying that demo data represents real customer operations.

### B. Ingestion and data quality
- [x] Implement reusable CSV loading and schema validation.
- [x] Validate required columns, types, units, dates, duplicate records, negative quantities, invalid IDs, and impossible dates.
- [x] Track missingness, freshness, row counts, rejected rows, and import timestamps.
- [x] Define handling for missing sales days, returns, stockouts, promotions, outliers, and discontinued products.
- [x] Distinguish zero sales from missing observations and stockout-censored demand.
- [x] Prevent future information from entering historical training features.
- [x] Persist data-quality results so the SW UI can show actionable errors/warnings.
- [x] Test empty files, malformed records, duplicate data, stale data, and incomplete history.

## 3. P0 — Demand forecasting

### A. Baseline first
- [x] Implement a documented baseline suitable for available data, such as seasonal-naive or moving-average forecasting.
- [x] Define forecast horizon, retraining cadence, SKU/location granularity, and fallback behavior.
- [x] Handle new/cold-start SKUs and intermittent demand explicitly.
- [x] Ensure forecasts are nonnegative where demand semantics require it.
- [x] Return forecast values, horizon, source-data timestamp, method/model version, and fallback reason.

### B. Candidate model
- [x] Inspect seasonality, trend, intermittency, product mix, stockouts, and available history before selecting an ML/statistical candidate.
- [x] Add one justified candidate model only if data volume and quality support it.
- [x] Use chronological train/validation/test splits or rolling-origin backtesting; never randomly shuffle time-series rows.
- [x] Fit preprocessing only on training data and check for target leakage.
- [x] Compare candidate model with the baseline on identical evaluation windows.
- [x] Evaluate with suitable metrics such as MAE, WAPE, RMSE, and forecast bias.
- [ ] Avoid MAPE when actual demand can be zero or near zero.
- [ ] Report metrics by SKU/location/segment where sample sizes support meaningful comparisons.
- [ ] Document cases where the baseline performs better; retain the simpler method when appropriate.
- [ ] Do not claim accuracy until evaluation code has actually run on a known dataset.

### C. Forecast output contract
- [ ] Define a stable function/API contract consumed by SW.
- [ ] Include SKU, location, forecast date/horizon, predicted demand, method/model version, data cutoff, and quality/fallback flags.
- [ ] Validate output dimensions, missing predictions, invalid dates, non-finite values, and negative values.
- [ ] Store predictions with source-data timestamp and version for auditability.
- [ ] Add deterministic tests for output shape and edge cases.

## 4. P0 — Inventory risk and replenishment

### A. Deterministic risk rules
- [ ] Implement stockout/low-stock risk based on forecast demand, usable inventory, confirmed incoming quantities, and lead time where available.
- [ ] Implement excess/slow-moving risk using a documented demand or days-of-cover rule.
- [ ] Implement expiry risk from batch expiry dates, remaining shelf life, expected sell-through, and transit time where available.
- [ ] Define severity thresholds in configuration and document why each threshold is used.
- [ ] Show missing inputs and confidence/quality caveats rather than hiding them.
- [ ] Keep deterministic business rules separate from model predictions.

### B. Replenishment calculation
- [ ] Implement and test: `suggested_replenishment = max(0, forecast demand over planning horizon + safety stock − usable stock − confirmed incoming stock)`.
- [ ] Define usable stock consistently and exclude reserved, damaged, quarantined, or otherwise unavailable stock.
- [ ] Avoid double counting incoming orders or reserved stock.
- [ ] Document planning horizon, lead time, safety stock method, and forecast aggregation.
- [ ] Apply supplier availability, MOQ/pack size, budget, capacity, and ordering constraints when data exists.
- [ ] Return calculation inputs and explanation with each recommendation.
- [ ] Add tests for negative/zero values, stock excess, unavailable stock, incoming orders, missing forecasts, and pack-size rounding.

## 5. P0 — Network allocation optimization

- [ ] Define the business objective clearly: for example, minimize unmet demand/stockout risk and relevant transfer cost while respecting constraints.
- [ ] Document priority/penalty weights and units; avoid arbitrary weights without explanation.
- [ ] Model source surplus, destination demand/urgency, transport cost/time, lead time, capacity, stock safety limits, batch expiry, and supplier constraints when data is available.
- [ ] Select a suitable optimizer such as OR-Tools or PuLP only if the real constraints justify it.
- [ ] Create a simple transparent heuristic baseline for comparison.
- [ ] Ensure allocations cannot exceed source usable surplus or destination requirements/capacity.
- [ ] Prevent invalid, negative, or duplicate transfer quantities.
- [ ] Detect infeasible plans and report the limiting constraints.
- [ ] Explain why each source/destination/quantity was selected.
- [ ] Compare optimized and baseline plans on the same inputs.
- [ ] Test no-surplus, no-demand, disconnected locations, zero transport capacity, ties, missing costs, and infeasible constraints.
- [ ] Do not assume the nearest warehouse is always optimal.
- [ ] Return a stable plan/line schema to the SW backend, including objective value, constraints, input timestamp, solver status, and explanation.

## 6. P1 — Expiry-aware decisions and clearance

- [ ] Calculate remaining shelf life from reliable dates and a documented time-zone/date convention.
- [ ] Estimate whether a batch can be sold before expiry using forecast sell-through, transit time, and destination inventory when available.
- [ ] Evaluate transfer feasibility before recommending relocation.
- [ ] Recommend reduced replenishment, FEFO picking, markdown/clearance, transfer, or escalation only when supported by the available inputs.
- [ ] If price/cost/margin data is missing, do not claim profit-maximizing clearance or monetary savings.
- [ ] Prevent transfers that are unlikely to arrive or sell before expiry.
- [ ] Record assumptions, reason codes, and confidence/quality caveats.
- [ ] Test expired batches, near-expiry batches, unknown expiry, insufficient demand, long transit, and missing margin data.

## 7. P1 — Model and decision evaluation

- [ ] Create a repeatable evaluation script and documented command.
- [ ] Store dataset version, date range, model version, metrics, and run timestamp.
- [ ] Compare forecasting candidate against baseline using identical chronological splits.
- [ ] Compare allocation recommendations against a simple baseline on identical scenarios.
- [ ] Define business KPIs with exact formulas and required inputs.
- [ ] Candidate KPIs: stockout rate/days, expiry waste quantity/value, forecast MAE/WAPE/bias, unmet demand, transfer cost, inventory days of cover, planning time.
- [ ] Separate measured metrics from hypothetical estimates and synthetic-demo outputs.
- [ ] Add regression checks so changes do not silently worsen a known benchmark.
- [ ] Define when a model is not safe/useful to deploy and should fall back to the baseline.
- [ ] Do not claim actual savings or operational improvement without an observed baseline and outcome data.

## 8. P1 — Monitoring and reliability

- [ ] Detect stale, incomplete, or shifted input data.
- [ ] Track forecast error and bias as actual sales arrive.
- [ ] Define retraining triggers based on data volume, drift, or evaluation rather than an arbitrary schedule alone.
- [ ] Version model artifacts and preprocessing; record the feature/data cutoff.
- [ ] Provide rollback to the last validated model or baseline.
- [ ] Handle missing libraries, invalid model artifacts, timeouts, and model errors with explicit fallback behavior.
- [ ] Ensure reproducibility using fixed random seeds where appropriate and recorded package versions.
- [ ] Add structured logs/metrics without leaking sensitive data.

## 9. Optional P2 — RAG, Copilot, agents, and sensor data

### RAG / Copilot
- [ ] Implement only if there are useful approved SOP/policy/product documents and a clear user need.
- [ ] Retrieve approved documents, return source citations, and handle no-result/low-confidence cases.
- [ ] Use live database/API tools for exact inventory, forecasts, order state, and quantities—not vector search.
- [ ] Enforce authorization in backend tools, not only in the prompt.
- [ ] Never let an LLM invent facts or independently approve purchases, transfers, or discounts.
- [ ] Test hallucination-sensitive queries, permissions, stale documents, missing model credentials, and provider errors.

### LangGraph / workflow orchestration
- [ ] Add only if stateful workflows, approval pauses/resumption, retries, or branching materially improve reliability.
- [ ] Keep durable business state in PostgreSQL; do not rely on ephemeral agent memory as the record of truth.
- [ ] Define typed state, allowed transitions, retry policy, idempotency, and human approval gates.
- [ ] Test interruption/resumption and repeated requests without duplicate actions.

### IoT / external signals
- [ ] If sensor events are in scope, define a validated timestamped event contract and source/device identifier.
- [ ] Simulate device events only when hardware is unavailable and label them simulated.
- [ ] Reject malformed, stale, duplicate, or implausible readings and preserve provenance.
- [ ] Do not infer actual refrigeration failure from a single reading or directly control industrial equipment without a separately engineered, safe control system.

## 10. Testing and acceptance checklist

- [ ] Run data-schema and ingestion tests.
- [ ] Run unit tests for forecast baselines and candidate model.
- [ ] Verify chronological splits and test for leakage.
- [ ] Run metric calculations on hand-checkable examples, including zero-demand cases.
- [ ] Run replenishment arithmetic tests and check no double counting.
- [ ] Run risk threshold and expiry edge-case tests.
- [ ] Run optimizer feasibility, capacity, supply, and destination-need tests.
- [ ] Run baseline-versus-candidate comparison on the same scenario.
- [ ] Test reproducibility and fallback behavior when model/data is unavailable.
- [ ] Test output schemas consumed by SW and error handling.
- [ ] Run the full evaluation command and record exact results.
- [ ] Record passed/failed/skipped tests and known limitations honestly.

## 11. Suggested implementation sequence

1. [ ] Audit available datasets, existing AIML code, and SW integration needs.
2. [ ] Define canonical data schemas and data-quality checks.
3. [ ] Build transparent baseline forecast and risk/replenishment rules.
4. [ ] Add chronological backtesting and baseline metrics.
5. [ ] Add one justified forecast candidate only if supported by data.
6. [ ] Build transparent allocation baseline, then constrained optimization.
7. [ ] Add expiry-aware sell-through/transfer logic.
8. [ ] Publish stable service/API contracts to SW.
9. [ ] Add regression tests, model versioning, monitoring, and fallback.
10. [ ] Add optional RAG/Copilot/LangGraph/IoT only after core acceptance passes.
11. [ ] Run end-to-end scenarios and document evidence/limitations.

## 12. Current sprint log

| Date | Task / decision | Dataset/model version | Command or evidence | Outcome / blocker | Next action |
|---|---|---|---|---|---|
| YYYY-MM-DD | _Fill in_ | _Fill in_ | _Fill in_ | _Fill in_ | _Fill in_ |

## 13. Blockers and decisions

| ID | Blocker / decision needed | Impact | Owner | Next action | Status |
|---|---|---|---|---|---|
| AIML-001 | _Fill in only if applicable_ | _Fill in_ | _Fill in_ | _Fill in_ | Open |

## 14. Completion summary

- **Data foundation:** _Verified state_
- **Forecast baseline:** _Verified state_
- **Candidate model and metrics:** _Only report if run_
- **Risk/replenishment:** _Verified state_
- **Allocation optimization:** _Verified state_
- **Expiry decisions:** _Verified state_
- **Tests:** _Exact verified result_
- **Known limitations:** _List_
- **SW contract/integration status:** _Verified state_
- **Next three actions:** 1. _ _ 2. _ _ 3. _ _
