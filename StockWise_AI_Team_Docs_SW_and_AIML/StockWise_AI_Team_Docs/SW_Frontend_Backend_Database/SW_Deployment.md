# SW Deployment Runbook

1. Run backend tests, frontend tests, lint/type/build checks.
2. Verify migrations/seed and `.env.example` placeholders only.
3. Provision PostgreSQL and configure secrets securely.
4. Apply migrations; deploy FastAPI; verify `/health`, `/ready` and DB connection.
5. Configure frontend API URL/CORS and deploy frontend.
6. Test a small CSV import and full seeded flow on deployed URL.
7. Check logs for secrets; record URLs, commit, migration and results.

Use backups and a restore test, migration/rollback plan, request IDs, provider timeouts/retries and explicit integration status. Keep credentials server-side. Disable risky automation if unsafe results appear.

Release record: frontend URL; backend URL; commit; migration; smoke test; known issues; verifier/date. Do not claim deployment until E2E test is run.
