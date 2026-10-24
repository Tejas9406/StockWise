# SW Implementation Plan

1. **Contract:** inspect repo; agree schema, units, API payloads/errors and `.env.example`. Acceptance: all four members approve contract.
2. **DB/import:** migrations, seed, CSV mapping/validation/duplicates, import history. Acceptance: clean DB setup and import tests pass.
3. **API/UI:** products/locations/inventory APIs; overview/import/inventory/risk screens. Acceptance: UI uses API data and handles failures.
4. **ML integration:** connect forecast/risk/replenishment/allocation; persist versions/plans; show explanations. Acceptance: UI values match service output.
5. **Approval/audit:** auth, plan version checks, idempotent action record, audit and optional notification. Acceptance: retry creates no duplicate action.
6. **Hardening/release:** tests, CORS/secrets/logs/health, deploy all layers, run E2E smoke test.

Publish contract changes before merging. A labeled local mock is acceptable temporarily but must be replaced by real service output before acceptance.
