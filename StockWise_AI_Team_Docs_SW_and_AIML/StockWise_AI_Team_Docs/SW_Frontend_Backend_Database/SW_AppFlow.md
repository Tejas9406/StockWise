# SW App Flow and UI Requirements

Data Health → Upload CSV → Preview/map → Validate → Confirm import → Inventory/Risk → Forecast/Allocation → Recommendation detail → Approve/Reject → Action record → Audit/notification status.

- **Import:** documented template, preview, row-level errors, duplicate handling, counts and timestamp.
- **Overview:** real metrics, data freshness, links to records.
- **Inventory:** SKU/location filters; on-hand, usable, reserved/unusable, incoming and expiry where available.
- **Demand/Risk:** forecast horizon, model/baseline, cutoff, warnings and distinction between predicted/confirmed events.
- **Allocation:** source/destination/SKU/quantity, costs/arrival if available, constraints, infeasibility reasons and baseline comparison.
- **Approvals:** reasons, assumptions, plan version, approve/reject, stale-plan protection, persisted action status.
- **Design:** professional light theme, neutral surfaces, navy text, restrained blue/green, amber warnings, red critical, accessible and responsive controls.
- **State:** DB/API is source of truth; refetch after mutations; retry safely; label demo data.
