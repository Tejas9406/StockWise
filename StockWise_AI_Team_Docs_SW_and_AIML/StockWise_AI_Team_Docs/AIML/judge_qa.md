# AI/ML Judge Q&A

**Why not LLM for forecasting?** Forecasting is numerical time-series work; compare a measurable baseline and suitable statistical/ML model. LLMs are not used for exact inventory arithmetic.

**How avoid overfitting?** Chronological backtesting, no future leakage, same baseline windows and segmented evaluation.

**What if data is small?** Use baseline or report insufficient data; do not claim unsupported accuracy.

**How replenishment calculated?** Forecast demand over a defined horizon + safety stock − inventory position, then apply known constraints; units and inventory semantics are tested.

**How allocation works?** Solver minimizes a stated objective subject to implemented constraints; independently validate and compare with baseline.

**How expiry handled?** Estimate sell-through before expiry using batch/demand/transit data; risk is not confirmed waste.

**What proves success?** Technical forecast/feasibility metrics plus later observed stockout, waste, cost and planning-time outcomes versus baseline.

**What if model fails?** Documented safe fallback or explicit unavailable status; monitor version, freshness, error and drift.

**Are all features AI?** No: forecasting uses ML/statistics, stock arithmetic deterministic logic, allocation constrained optimization, and security/workflows conventional software engineering.
