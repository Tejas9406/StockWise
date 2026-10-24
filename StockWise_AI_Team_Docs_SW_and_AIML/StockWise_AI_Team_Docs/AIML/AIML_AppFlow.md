# AI/ML Pipeline and Integration Flow

1. Receive validated records and confirm schema, units, coverage and cutoff.
2. Build SKU-location-date series; record missing observations and possible stockout-censored sales.
3. Backtest baseline chronologically; evaluate candidate on same windows.
4. Select candidate only if justified; otherwise retain baseline.
5. Return forecast values, horizon, version, cutoff, warnings and optional validated intervals.
6. Read usable stock, reservations, confirmed incoming, lead time and safety-stock policy.
7. Compute risk and replenishment deterministically.
8. Build allocation candidates and solve under explicit constraints.
9. Independently validate plan; attach reason codes, assumptions, feasibility and baseline comparison.
10. Return typed output to SW; never directly approve or execute.

Failures: insufficient history → fallback/explicit status; stale inventory → warn/block; missing lead time/capacity/expiry → disclose unavailable constraint; NaN/negative output → reject/fallback; infeasible solver → explicit status, never fabricated plan.
