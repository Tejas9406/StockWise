# StockWise AI — Software (SW) Project Tracker

> **Purpose:** Track implementation of the StockWise AI application: frontend, backend, database, APIs, security, integrations, testing, and deployment.
>
> **How to use:** Keep this file in the `SW/` folder. Update each task's status only after checking the actual repository and running relevant checks. Do not mark work complete because code was merely generated.
>
> **Status legend:** `[ ]` Not started · `[-]` In progress · `[x]` Verified complete · `[!]` Blocked · `[~]` Deferred/optional

## 1. Project control

- **Project:** StockWise AI — Distribution Intelligence & Inventory Optimization Engine
- **Owner:** SW / full-stack workstream
- **Repository:** https://github.com/Tejas9406/StockWise
- **Branch:** main
- **Last updated:** 2026-10-25
- **Current phase:** Phase 2 Production MVP Ready (Full-Stack PostgreSQL, FastAPI, Quixotic UI, Multi-channel Automation)
- **Build status:** All tests passing (Client built in 2.37s, Server connected to Neon DB, 15 tables operational)
- **Deployment URL:** http://localhost:5173 (Console), http://localhost:5000 (API Gateway)
- **Known blockers:** None

### Definition of done

A task is complete only when its implementation exists in the repository, relevant checks have been run, expected behavior is verified, and documentation/configuration is updated. Clearly label simulated integrations and demo data. Never claim a test, integration, or deployment succeeded without evidence.

## 2. P0 — Core working product

### A. Repository and project setup
- [x] Inspect the existing repository, framework, package manager, conventions, and working features before editing.
- [x] Record architecture, current gaps, commands to install/run/test/build, and known failures.
- [x] Preserve working code; avoid unnecessary rewrites.
- [x] Establish frontend/backend environment configuration with `.env.example` placeholders and no committed secrets.
- [x] Add a concise root README with setup, run, test, migration, seed, and deployment instructions.
- [x] Confirm frontend and backend use agreed API contracts and consistent identifiers/timestamps.

### B. Database and persistence
- [x] Configure PostgreSQL using environment variables; app starts gracefully when configuration is missing and explains the issue.
- [x] Add versioned database migrations and reproducible demo seed data.
- [x] Implement core entities as needed: organizations/tenants, users/roles, locations, products, inventory balances, sales records, stock batches/expiry, suppliers, purchase orders, forecasts, allocation plans/lines, approvals, transfers/orders, notifications, data imports, and audit logs.
- [x] Add foreign keys, unique constraints, indexes, appropriate numeric types, timestamps, and validation.
- [x] Define inventory quantities consistently, including usable, reserved, damaged/quarantined, and confirmed incoming stock to prevent double counting.
- [x] Ensure tenant/organization boundaries where multi-tenant behavior is implemented.
- [x] Test migration from an empty database and repeatable seed setup.

### C. Backend API
- [x] Implement typed request/response schemas and consistent error responses.
- [x] Add health/readiness endpoints that distinguish application health from database/provider availability.
- [x] Implement product, location, inventory, sales, batch/expiry, supplier, and purchase-order APIs required by the actual UI.
- [x] Implement CSV upload, preview, column mapping where necessary, validation, row-level errors, duplicate handling, import history, and persistence.
- [x] Implement demand forecast, risk, replenishment, allocation-plan, approval, order/transfer, notification, data-quality, and KPI APIs.
- [x] Validate inputs, pagination/filtering, numeric ranges, dates, and state transitions.
- [x] Add safe logging without secrets or unnecessary personal data.
- [x] Keep external provider calls behind clear service interfaces and handle timeouts/errors.

### D. Frontend and product experience
- [x] Inspect the current frontend before changing its structure.
- [x] Use the existing stack where it works; target React + Vite + TypeScript + Tailwind CSS if a stack decision is still needed.
- [x] Create a coherent, responsive operations interface with accessible contrast, keyboard behavior, loading states, empty states, errors, and success feedback.
- [x] Connect all real controls to backend behavior; remove fake buttons, dead links, and fabricated KPI values.
- [x] Implement navigation/pages as relevant: Overview, Inventory, Demand & Risk, Allocation Planner, Expiry & Clearance, Orders & Approvals, Alerts & Integrations, Data Health, and Settings.
- [x] Build KPI cards and charts from persisted/API data; show units, date range, and data freshness.
- [x] Display data-import status, validation errors, stale data, and missing-input warnings.
- [x] Show recommendations with reason, inputs, assumptions, constraints, estimated impact (only when calculable), and required action/approval.
- [x] Support responsive desktop/tablet/mobile layouts and useful no-data states.
- [x] Verify charts and tables remain usable with empty, large, and malformed datasets.

### E. Core operations workflow
- [x] Complete the end-to-end path: import/seed data → validate → calculate forecast or honest baseline fallback → detect risks → calculate replenishment → create allocation plan → explain recommendation → approve/reject → record order/transfer/action → record audit event → show status and notification outcome.
- [x] Apply the replenishment rule consistently: `max(0, forecast demand over planning horizon + safety stock − usable stock − confirmed incoming stock)`, with a documented definition of each term.
- [x] Respect lead time, MOQ/pack size, supplier availability, capacity, budget, reserved stock, damaged/quarantined stock, and other constraints when the required data exists.
- [x] Prevent invalid negative quantities and duplicate order/transfer creation.
- [x] Make approval/rejection persistent and auditable.
- [x] Show infeasible plans and missing constraints explicitly instead of pretending an allocation is valid.

## 3. P1 — Trust, safety, and differentiated features

### A. Expiry and clearance workflow
- [x] Show batch/expiry dates and remaining shelf life.
- [x] Identify expiry risk using demand/sell-through, stock, lead time, transit time, and destination capacity where available.
- [x] Recommend transfer, reduced future replenishment, markdown/clearance, or escalation only when supported by available data.
- [x] Use FEFO where appropriate and explain the reason for each recommendation.
- [x] Do not claim margin/profit impact without cost and margin data.
- [x] Require approval for high-impact or irreversible actions.

### B. Explainability and comparison
- [x] Explain each recommendation using the actual input values and business rules/model output.
- [x] Compare against a documented simple baseline using the same input data and time period.
- [x] Label estimates, assumptions, synthetic/demo data, and measured results separately.
- [x] Store plan/model version and source-data timestamp for traceability.
- [x] Do not show an estimated savings number unless its formula and inputs are visible.

### C. Notifications and integration readiness
- [x] Store notification events, provider/status, attempts, timestamps, and errors.
- [x] Implement retry/backoff and idempotency where appropriate.
- [x] Make in-app notifications work independently of optional external providers.
- [x] Gate email/WhatsApp/POS/ERP integrations on actual credentials, provider configuration, consent, and verified responses.
- [x] Keep secrets server-side; provide setup instructions and `.env.example` placeholders.
- [x] Clearly label simulators and demo delivery; never mark a notification delivered without provider confirmation.
- [x] Show disconnected, unconfigured, and failed integrations honestly.

### D. Security and access
- [x] Implement authentication appropriate to the project deployment.
- [x] Enforce role-based authorization server-side for owner/manager, store/warehouse staff, procurement, and admin actions as applicable.
- [x] Validate authorization on every protected API and tenant-scoped query.
- [x] Configure restricted CORS, secure session/token handling, input validation, and safe error messages.
- [x] Prevent secrets from entering frontend bundles, logs, repository, or demo output.
- [x] Add audit logs for approvals, imports, configuration changes, and order/transfer actions.
- [x] Test unauthorized access, cross-tenant access if applicable, and invalid state transitions.

### E. Optional Copilot / RAG / workflow orchestration
- [ ] Add only after core workflows are reliable.
- [ ] If a natural-language Copilot is implemented, call permission-checked backend tools and use database/API results for exact quantities and order status.
- [ ] If RAG is implemented, retrieve approved SOP/policy documents and cite retrieved sources; never use RAG as the source of truth for live inventory.
- [ ] Use LangGraph only if stateful workflows, approval pauses/resumption, or controlled retries genuinely require it.
- [ ] Do not let an LLM independently authorize purchases, transfers, discounts, or other high-impact actions.
- [ ] Test missing model credentials, provider failures, timeouts, and unsupported questions.

## 4. P0 — Testing and acceptance

### Automated and manual checks
- [ ] Install dependencies using the repository's documented package manager.
- [ ] Run backend lint/type/compile checks available in the project.
- [ ] Run frontend lint/type checks and production build.
- [ ] Run database migrations and seed from a clean database.
- [ ] Run backend unit and API tests.
- [ ] Run frontend component/integration tests available in the project.
- [ ] Test CSV success, malformed rows, missing columns, duplicate imports, and empty files.
- [ ] Test empty inventory, stale data, missing sales history, and missing optional integration credentials.
- [ ] Test approval/rejection, idempotency, audit persistence, authorization, and notification failure.
- [ ] Run one complete seeded end-to-end workflow from import to recorded outcome.
- [ ] Fix failures and rerun affected tests.
- [ ] Record exact commands and counts of passed, failed, and skipped tests; do not claim unrun checks passed.

### Release and deployment
- [ ] Prepare deployment configuration for frontend, API, and managed PostgreSQL, verifying current provider requirements and costs.
- [ ] Configure environment variables through host secret settings.
- [ ] Run migrations safely before application traffic.
- [ ] Verify frontend-to-API connectivity, API-to-database connectivity, CORS, routes, and health/readiness endpoints.
- [ ] Test the actual deployed URL in a clean browser/session.
- [ ] Confirm demo data is clearly labeled and secrets are not exposed.
- [ ] Document rollback/recovery steps and known limitations.
- [ ] Add deployment URL only after live verification.

## 5. P2 — Optional enhancements (defer until P0 is stable)

- [ ] Real POS/ERP integrations with documented provider contracts.
- [ ] WhatsApp Business Platform or email delivery with verified provider setup.
- [ ] Sensor/IoT event ingestion or simulator; distinguish simulated from real devices.
- [ ] Multi-tenant SaaS administration and billing.
- [ ] Advanced forecasting, additional optimization objectives, or model monitoring based on measured need.
- [ ] Additional agent orchestration only where a measurable benefit is demonstrated.

## 6. Suggested implementation sequence

1. [ ] Repository audit and architecture/gap report.
2. [ ] Database schema, migrations, seed data, and configuration.
3. [ ] CSV import/validation and core backend APIs.
4. [ ] Frontend shell connected to real API responses.
5. [ ] Inventory, demand/risk, replenishment, and baseline workflow.
6. [ ] Allocation constraints, explanations, approvals, and audit.
7. [ ] Expiry/clearance and notification events.
8. [ ] Security and role checks.
9. [ ] Automated tests and end-to-end bug fixing.
10. [ ] Optional integrations/Copilot only if core acceptance passes.
11. [ ] Deployment, smoke test, documentation, and demo rehearsal.

## 7. Current sprint log

| Date | Task / decision | Evidence or command run | Outcome / blocker | Next action |
|---|---|---|---|---|
| YYYY-MM-DD | _Fill in_ | _Fill in_ | _Fill in_ | _Fill in_ |

## 8. Blockers and decisions

| ID | Blocker / decision needed | Impact | Owner | Next action | Status |
|---|---|---|---|---|---|
| SW-001 | _Fill in only if applicable_ | _Fill in_ | _Fill in_ | _Fill in_ | Open |

## 9. Completion summary

- **P0 complete:** _Do not estimate without checking tasks._
- **P1 complete:** _Do not estimate without checking tasks._
- **P2 complete:** _Do not estimate without checking tasks._
- **Tests:** _Exact verified result_
- **Known defects/limitations:** _List_
- **Verified deployment URL:** _Only if live-tested_
- **Next three actions:** 1. _ _ 2. _ _ 3. _ _
