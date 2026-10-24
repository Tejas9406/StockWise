# Technical Pipeline

1. **Ingest:** CSV/API records with source, timestamp and import ID.
2. **Validate/normalize:** schema, units, IDs, duplicates, dates and business keys.
3. **Inventory state:** calculate usable and incoming stock with documented semantics.
4. **Forecast:** baseline and optional validated candidate for SKU-location-horizon.
5. **Risk:** evaluate stockout, excess and expiry/sell-through risk.
6. **Replenishment:** `suggested_qty = max(0, forecast_demand_over_horizon + safety_stock - inventory_position)`. Define inventory position precisely; apply MOQ/pack, supplier, budget and capacity constraints where known.
7. **Allocation:** optimize feasible source/destination movements under documented objective and constraints.
8. **Validate:** independently check quantities and constraints.
9. **Explain:** attach reason codes, inputs, assumptions, freshness, model version and warnings.
10. **Approve:** record authorized decision and plan version.
11. **Act/notify:** create internal action record idempotently; claim external execution only when confirmed by integration.
12. **Evaluate:** compare forecast with actuals and decisions with later outcomes.

Forecasts are estimates; optimizer output is a proposal; synthetic data demonstrates behavior but not commercial ROI.
