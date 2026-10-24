# AI/ML Technical Pipeline

1. Prepare validated product-location-date series; mark missing observations and possible stockout-censored sales.
2. Establish baseline and chronological backtest windows.
3. Train one justified candidate; compare MAE/WAPE/bias where suitable; retain baseline if not better.
4. Generate nonnegative forecast with version/cutoff metadata.
5. Calculate usable stock and confirmed incoming consistently.
6. Compute projected stockout/excess/expiry risk and replenishment; apply known supplier/pack/capacity constraints.
7. Define allocation objective/constraints, solve and independently validate.
8. Compare with baseline on identical inputs.
9. Return explanations, assumptions, freshness, warnings and reason codes.
10. Evaluate forecasts against actuals and decisions against later outcomes.

Forecast quality uses chronological backtests; allocation uses feasibility/objective/baseline; business impact requires observed outcomes. A recommendation is not proof of realized savings.
