# Technical Specification

## Stack
React + Vite + TypeScript + Tailwind; Python + FastAPI + Pydantic; PostgreSQL; pandas + NumPy; baseline forecasting plus scikit-learn/statistical candidate if justified; OR-Tools or suitable solver for constrained allocation; pytest and frontend/API tests. Preserve a working existing stack rather than rewriting unnecessarily.

## Architecture
Presentation → API/application → domain services → PostgreSQL persistence. Forecasting/evaluation and optimization are isolated modules behind agreed interfaces. Start as a modular monolith.

## Boundaries
- ML estimates demand; deterministic code calculates inventory arithmetic.
- Optimizer proposes plans; backend validates before approval.
- LLM, if added, may explain validated records or retrieve approved documents; it cannot invent quantities, bypass authorization or execute actions.
- Workflow state is stored in PostgreSQL, not only agent memory.
- High-impact actions require approval unless a narrow policy is documented and tested.

## Proposed API contract
`POST /api/v1/imports`; `GET /api/v1/imports/{id}`; `GET /api/v1/products`; `GET /api/v1/locations`; `GET /api/v1/inventory`; `POST /api/v1/forecasts/run`; `GET /api/v1/forecasts`; `POST /api/v1/allocation-plans`; `GET /api/v1/allocation-plans/{id}`; approve/reject recommendation endpoints; audit/notification queries; `/health` and `/ready`. Finalize payloads jointly before implementation.

## Production controls
Environment-based secrets; restricted CORS; backend authorization; tenant scoping if multi-tenant; migrations/backups; request IDs and redacted structured logs; idempotency keys; timeouts and bounded retries; explicit provider status; no secrets in browser bundles.
