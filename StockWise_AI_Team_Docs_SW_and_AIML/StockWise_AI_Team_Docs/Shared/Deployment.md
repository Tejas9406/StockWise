# Deployment and Operations

## Configuration
Create `.env.example` with placeholder names only. Suggested settings include `DATABASE_URL`, `APP_ENV`, auth/secret configuration, `CORS_ORIGINS`, `LOG_LEVEL`, and optional provider keys. Use exact names from code; keep secrets server-side.

## Release
1. Pin dependencies and run tests/lint/type/build.
2. Provision PostgreSQL securely.
3. Apply migrations.
4. Deploy backend; verify `/health`, `/ready` and DB connectivity.
5. Configure frontend API URL and allowed origin; deploy frontend.
6. Run a small import and full seeded acceptance workflow.
7. Verify logs have no secrets and record URLs, commit, migration version and test evidence.

## Operations
Backups and restore test; migration/rollback plan; structured logs/request IDs; provider timeouts/retries; truthful integration statuses; appropriate data retention; model/version metadata. Disable risky automation if a release produces unsafe recommendations.

## Release record
Frontend URL; backend URL; DB environment (no credentials); commit; migration version; smoke test; limitations; verified by/date.

Do not claim deployment success until the deployed end-to-end workflow has been tested.
