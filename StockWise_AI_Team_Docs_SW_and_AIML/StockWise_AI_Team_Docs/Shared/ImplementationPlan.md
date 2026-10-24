# Implementation Plan and Team Ownership

## Team A — SW (2 members)
**A1 Frontend:** navigation, import UI, inventory/risk views, charts, allocation planner, approvals, responsive/accessibility, frontend tests. **A2 Backend/DB:** FastAPI, PostgreSQL/migrations, imports, APIs, auth/RBAC, workflow, audit, notification adapters, logs and deployment.

## Team B — AI/ML (2 members)
**B1 Data/forecasting:** profiling, preprocessing, baseline/candidate forecast, chronological backtesting, metrics, model versions and monitoring. **B2 Optimization:** risk rules, replenishment, constrained allocation, expiry logic, plan validation, objective/constraints and explanations.

## Shared contracts
Agree on schema, units, inventory semantics, CSV templates, API request/response payloads, error shape, forecast metadata, optimization objective and one E2E fixture.

## Gates
1. **Contract alignment:** scope, schema, API, sample data agreed.
2. **Data foundation:** imports persisted; ML can read the same semantics.
3. **Connected forecast:** baseline results displayed from actual API/module output.
4. **Decision engine:** replenishment/allocation tests and feasibility validation.
5. **Safe action workflow:** approval, audit and idempotency.
6. **Release:** tests, security review, deployment smoke test, demo rehearsal.

## PR rules
Small changes; tests with business logic; no credentials; notify teams of schema/API changes; record actual test evidence. Every phase needs an acceptance test, not just a code-complete claim.
