# Product Requirements Document

## Problem and users
FMCG distributors and regional retailers balance availability, inventory cost, transfers and expiry across locations. Target users: operations/distribution managers, warehouse/store managers, procurement coordinators, executives and administrators.

## Objective
Deliver a reliable, explainable workflow: import data, validate it, forecast demand, detect risks, calculate replenishment, optimize transfers, explain recommendations, obtain approval, record action and evaluate outcomes.

## P0 — required
- CSV import, preview/mapping, validation errors, duplicate handling and import history.
- Products, locations, sales, inventory and batch/expiry records when available.
- Data quality/freshness indicators.
- Usable-stock and inventory-position calculations with documented semantics.
- Baseline demand forecast; evaluate a candidate model only if data supports it.
- Stockout, excess and expiry-risk detection.
- Replenishment suggestions and feasible multi-location allocation.
- Baseline comparison, explanations, approval/rejection, action records and audit trail.
- Connected dashboard, inventory, risk and allocation screens.
- Tests, seeded demo and deployed smoke test.

## P1 — only after P0
Expiry-aware clearance, email notifications, stronger role management, model monitoring, and optionally RAG/copilot or stateful workflow orchestration if a real need remains.

## Deferred by default
Multiple autonomous agents, deep learning without evidence, microservices, Kafka/Kubernetes, mandatory vector DB, and live POS/ERP/WhatsApp/IoT integrations without access.

## Quality requirements
Server-side validation and authorization; idempotent actions; traceable inputs; visible stale/missing data; safe failure states; reproducible setup; no fake buttons or hard-coded live metrics.

## KPIs to measure, not assume
Forecast MAE/WAPE/bias; stockout/unmet demand; expiry waste; transfer cost; planning time; import failures; API errors; duplicate actions; approval turnaround. Claim improvements only when measured against a documented baseline.

## Acceptance scenario
Import a multi-SKU/multi-location dataset; identify shortage plus excess/expiry risk; produce forecast/fallback; recommend a feasible allocation; explain it; approve/reject; verify persisted action and audit history.
