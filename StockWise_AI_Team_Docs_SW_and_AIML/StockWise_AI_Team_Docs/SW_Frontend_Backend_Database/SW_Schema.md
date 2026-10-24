# SW Database Implementation Contract

Implement entities from `../Shared/Schema.md`. P0 tables: products, locations, sales_records, inventory_balances, data_imports, demand_forecasts, recommendations, allocation_plans, allocation_lines, approvals, order_transfers/internal actions, audit_logs and users/roles if auth is in scope. Add stock_batches/suppliers/purchase_orders when supported by data/workflow.

Requirements: stable IDs; FKs and uniqueness; business date separate from creation timestamp; explicit units; numeric money/precision quantities; model/version/data cutoff on forecasts; plan version/constraint summary; actor/decision/time/reason on approvals; idempotency key; indexes for SKU/location/date/status/expiry; tenant scope if applicable.

Transactions: import job and row summary; approval verifies permission/current plan version; retries return original result; notification event stored separately so provider failure does not roll back approval. Test inventory-position semantics and prevent double counting. Never store forecast as actual sales.
