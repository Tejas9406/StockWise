# Challenges and Decision Log

## Decisions
- Modular monolith first: simpler until measured needs justify splitting.
- CSV-first: repeatable demo without vendor credentials.
- Baseline before advanced ML: credible comparison.
- Deterministic arithmetic for stock quantities; no LLM arithmetic.
- Constrained solver for allocation; independently validate results.
- Approval for consequential actions.
- RAG/agents optional, not mandatory.

## Risks and mitigations
- Poor/sparse data: warnings, fallback and limited claims.
- Stockout-censored sales: observed sales may understate demand.
- Leakage: chronological splits and feature cutoffs.
- Inventory semantic mismatch: agree definitions before coding.
- Infeasible plan: explain infeasibility, never silently violate constraints.
- Missing margin/expiry/lead-time data: restrict recommendations.
- Duplicate retries: idempotency key and DB uniqueness/transaction.
- Provider outage: optional adapter, timeout/retry and visible status.
- Unauthorized access: backend authorization and tenant scoping.
- Scope creep: prioritize one complete P0 workflow.
- Demo integrity: label synthetic data, simulated execution and unverified metrics.

## Decision log template
Date; decision; context; options; chosen option/rationale; SW impact; ML impact; test/evidence; owner; revisit condition.
