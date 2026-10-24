# AI/ML Runtime and Release

Prefer an in-process Python module called by FastAPI initially if dependency/latency requirements permit; a separate service is optional. Pin dependencies; separate training from inference; version artifacts/checksums; keep secrets out of artifacts; record model/version, training window, cutoff and evaluation.

Release: run data/forecast/inventory/optimizer tests; backtest vs baseline; verify clean artifact loading; validate finite nonnegative/schema-correct outputs; run integrated E2E; record version/evidence; deploy and smoke test.

Monitor input freshness, forecast error/bias, drift and solver failures. Do not auto-promote unvalidated models. Keep last known-good artifact and rollback procedure. On inference failure, use baseline only when valid, otherwise return explicit unavailable status.

Release record: model/version, artifact checksum/location, training window/cutoff, backtest report, baseline comparison, commit/environment, smoke test and limitations.
