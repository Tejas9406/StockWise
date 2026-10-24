# Shared Project README

**Product:** StockWise AI. **Problem:** Triwizathon PS2 — Distribution Intelligence & Inventory Optimization Engine.

## Team split
- **SW (2):** frontend, backend/API, PostgreSQL, imports, auth, workflow, audit, tests, deployment.
- **AI/ML (2):** data prep, forecasting/evaluation, risk/replenishment, constrained allocation, expiry logic, model monitoring.

## Main workflow
Import → validate → forecast → detect risk → calculate replenishment → optimize allocation → explain → approve/reject → record action → evaluate outcome.

## Rules
- No fabricated metrics, customers, integrations, model accuracy or savings.
- Synthetic demo data must be labeled.
- CSV is the fallback when integrations are unavailable.
- An internal action record is not proof of external execution.
- Forecasts are estimates; recommendations are proposals; outcomes must be measured.
- Exact quantities/status come from validated application records, not an LLM.
- Use the simplest solution that satisfies acceptance tests.
