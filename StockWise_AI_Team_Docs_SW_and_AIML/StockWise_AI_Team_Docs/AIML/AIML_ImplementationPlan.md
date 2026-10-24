# AI/ML Implementation Plan

1. **Data profile:** source/license, schema, missingness, coverage, granularity and anomalies. Acceptance: reproducible report.
2. **Baseline forecast:** naïve/seasonal-naïve or moving average; chronological backtest and metrics. Acceptance: callable module, no leakage.
3. **Candidate model:** one justified model; same split/metrics; versioned artifact. Promote only if it improves the target use; otherwise keep baseline.
4. **Risk/replenishment:** pure functions and hand-calculated tests. Acceptance: semantics agreed with SW.
5. **Allocation:** objective, constraints, solver, independent validator and baseline comparison. Acceptance: valid plan or explicit infeasible result.
6. **Expiry:** sell-through/transit feasibility and guarded recommendations. Acceptance: edge tests; no unsupported profit claims.
7. **Integration/lifecycle:** typed outputs, metadata, fallback, monitoring, E2E test.

Do not start optional LLM/RAG/LangGraph work until forecasting, risk, replenishment, allocation and integration gates pass.
