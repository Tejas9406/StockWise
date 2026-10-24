# Shared Data Schema

Logical contract; finalize SQL types, constraints and migrations jointly.

## Entities
`organizations` (if multi-tenant), `users`, `locations`, `products`, `suppliers`, `sales_records`, `inventory_balances`, `stock_batches`, `purchase_orders`, `data_imports`, `demand_forecasts`, `allocation_plans`, `allocation_lines`, `recommendations`, `approvals`, `order_transfers`, `notification_events`, `audit_logs`, `model_evaluations`; optional later: `sensor_events`, `integration_configs`, `policy_documents`.

## Definitions
- **On-hand:** recorded physical quantity before subtracting reserved/unusable amounts.
- **Usable stock:** on-hand minus reserved, damaged, quarantined or otherwise unavailable quantity under explicit rules.
- **Confirmed incoming:** quantities from confirmed, non-cancelled incoming orders/transfers, counted once.
- **Inventory position:** define consistently; a suggested definition is usable stock + confirmed incoming − allocated/backordered demand not already reflected elsewhere. Avoid double counting.
- **Forecast:** estimate for a defined future period, not actual sales.
- **Allocation plan:** proposal until approved.
- **Action record:** internal record, not proof of external execution.
- **Expiry risk:** estimated risk, not confirmed waste.

Use stable keys, foreign keys, unique constraints, UTC timestamps plus business dates, explicit units, numeric types for money/precision quantities, source/import IDs, tenant scope if applicable, and indexes for common SKU/location/date/status/expiry queries.
