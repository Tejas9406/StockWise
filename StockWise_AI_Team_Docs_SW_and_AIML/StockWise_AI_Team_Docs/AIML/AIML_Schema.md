# AI/ML Data and Output Contracts

## Forecast input
SKU ID, location ID, business date, sales quantity, explicit unit, optional price/promotion features only if known at prediction time, optional inventory-availability indicator, data cutoff timestamp.

## Forecast output
SKU/location, target date/horizon, finite nonnegative predicted quantity, optional validated interval, model/baseline ID and version, training window, cutoff, generated timestamp, warnings and fallback flag.

## Decision input
Product/location IDs; on-hand/reserved/damaged/quarantined/usable quantities; confirmed incoming with expected dates/status; forecast demand/horizon; lead time/safety stock; supplier MOQ/pack/availability; capacity/transfer cost/lead time; expiry; explicit units and timestamps.

## Allocation output
Plan/run ID and version; source/destination/SKU/quantity; optional batch/arrival/cost; solver status/objective; constraint validation; baseline plan/value; reason codes/assumptions/warnings; input snapshot/cutoff and generated time.

Quantities finite, nonnegative and unit-consistent. Missing values explicit. Output reproducible. SW owns persistence and approval.
