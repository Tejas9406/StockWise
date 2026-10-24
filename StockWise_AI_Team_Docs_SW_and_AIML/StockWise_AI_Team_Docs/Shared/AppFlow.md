# App Flow

1. Sign in if auth is enabled and choose location/organization context.
2. Upload documented CSVs for sales, inventory, products, locations and batches/expiry.
3. Preview mappings, validate rows, show errors and duplicates, confirm import.
4. Persist accepted rows and display data quality/freshness.
5. Run/retrieve forecasts; display model/baseline label, horizon and cutoff.
6. Review stockout, excess, slow-moving and expiry risks.
7. Inspect replenishment/allocation proposal, inputs, assumptions and constraints.
8. Compare with simple baseline; reject infeasible plans.
9. Approve/reject with actor, timestamp, reason and plan version.
10. Create internal action record; call external integration only when configured and verified.
11. Display truthful notification status.
12. Record actual outcomes and evaluate later.

## Failure paths
Invalid CSV → row-level errors. Stale data → warning/block unsafe recommendations. Forecast failure → documented fallback or explicit failure. Infeasible optimizer → reason, never silent constraint violation. Stale approval → refresh plan. Duplicate retry → return original action. Provider failure → preserve approved action and show failure state. Unauthorized request → reject on backend.

Navigation: Overview, Inventory, Demand & Risk, Allocation Planner, Expiry & Clearance, Orders & Approvals, Alerts, Data Health/Settings. Hide or clearly mark unimplemented screens.
