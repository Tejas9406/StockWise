# AI/ML Test Plan and Report

## Data
Required columns, IDs, dates, duplicates, missingness, units, cutoff and leakage checks.

## Forecast
Hand-calculated baseline fixtures; chronological split/horizon; MAE/WAPE/bias edge cases; zero/intermittent demand; cold-start fallback; finite nonnegative output; artifact save/load/version; reproducibility.

## Inventory
Usable-stock calculation; incoming not double-counted; shortage/sufficient/excess; horizon/safety stock; MOQ/pack rounding; missing-constraint warnings.

## Optimization
Supply conservation, nonnegative quantities, demand/capacity/route/lead-time/expiry constraints where implemented; infeasible and timeout behavior; independent validation; baseline comparison.

## Expiry/lifecycle
Expiry and transit boundaries, missing expiry/margin, no negative batches, no invented profit; fallback and monitoring calculations.

| Date/commit | Command/test | Expected | Actual | Status/evidence |
|---|---|---|---|---|
| Pending | Add real command | Define | Not run | NOT RUN |

Report dataset/version, training cutoff, windows, metrics by segment, model version, limitations, failures and promote/retain decision.
