# SW Technical Specification

## Frontend
React + Vite + TypeScript + Tailwind; Plotly where useful. Shared typed API client. UI displays server-validated outputs, not its own business calculations. Handle loading, empty, error, stale and permission-denied states. No fake metrics/buttons.

## Backend
FastAPI routers by domain, Pydantic schemas, service layer separate from route handlers, existing database layer/ORM if working, consistent errors/pagination/timestamps, request IDs, backend-enforced authorization and organization scope.

## Database
PostgreSQL, versioned migrations, deterministic seed, foreign keys, unique constraints, transactions, idempotency keys and indexes. Store import/source IDs. Avoid double-counting stock in open orders/transfers.

## Minimum screens
Overview; data import/validation; inventory explorer; demand/risk; allocation planner; recommendation detail/approval; audit/action history; settings only when implemented.

## Minimum APIs
Imports/status; products/locations/inventory; forecasts; risks/recommendations; allocation plans; approve/reject; action status; audit/notifications; health/readiness. Finalize exact schemas with ML before coding.

## Acceptance
CSV persisted; API matches DB; auth enforced; retry cannot duplicate action; approval records actor/time/reason; provider failure does not erase approved action; clean setup instructions work.
