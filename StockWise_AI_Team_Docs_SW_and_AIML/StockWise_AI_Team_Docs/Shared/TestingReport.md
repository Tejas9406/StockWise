# Testing Strategy and Results

**Template only until tests are actually run. Never mark PASS without command, environment and result.**

## SW tests
Unit: validation, permissions, state transitions, idempotency. DB: migrations, constraints, transactions, seed. Import: malformed/empty/duplicate CSV, missing columns, encoding. API: auth, filters, stale plans, approve/reject, provider failure. Frontend: loading/error/empty/stale states, forms, charts, permissions. E2E: import → forecast/risk → allocation → approval → action/audit.

## AI/ML tests
Data schema, missingness, duplicates, unit consistency, cutoff/leakage. Forecast chronological backtest, baseline comparison, zero/intermittent demand, cold-start fallback, finite nonnegative output. Replenishment hand-calculated fixtures. Allocation supply/demand/capacity/route constraints, infeasible/timeout cases, independent validation and baseline comparison. Expiry/transit/missing-margin edge cases. Artifact load/version and fallback.

## E2E acceptance
1. Clean DB, migrations and seed.
2. Import dataset; verify accepted/rejected rows and freshness.
3. Forecast or labeled fallback.
4. Detect seeded risks.
5. Create feasible allocation or explicit infeasible result.
6. Compare baseline on identical inputs.
7. Check explanation.
8. Approve/reject; verify persistence, audit and idempotent retry.
9. Simulate provider failure.
10. Run deployed smoke test.

| Date/commit | Command/scenario | Environment | Expected | Actual | Status/evidence |
|---|---|---|---|---|---|
| Pending | Fill with real command | TBD | Define | Not run | NOT RUN |

Report pass/fail/skipped counts, known issues, unverified features and tester/date.
