# SW Team README — Frontend, Backend, Database

## Mission
Deliver a reliable product shell that makes StockWise decisions usable, secure, traceable and deployable.

## Members
- **SW1 Frontend:** screens, charts, accessible interactions, API client, import UI, inventory/risk views, allocation planner, approvals and UI tests.
- **SW2 Backend/DB:** FastAPI, PostgreSQL, migrations, CSV import, APIs, auth/RBAC, action workflows, audit, provider adapters, logs and deployment.

## Order
1. Agree schema/API contracts with ML.
2. Build migrations, seed and CSV import.
3. Build domain APIs and test with API client.
4. Build UI on real APIs.
5. Integrate forecasts/risks/allocation.
6. Add approvals, audit, idempotent action records and notification status.
7. Test authorization/failure states and E2E.
8. Deploy and smoke-test.

## Done means
A user can import data, see persisted records, inspect actual decision outputs, approve/reject, and verify action/audit history. Core workflow works without optional paid integrations.
