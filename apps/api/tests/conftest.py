"""Test fixtures — every test gets an isolated SQLite database."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

import pytest

# The app resolves DATABASE_URL at import time; set it before importing anything
# from `app`. Must happen at collection time, not inside a fixture.
_TMP_DB_DIR = tempfile.mkdtemp(prefix="pmd-test-")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_TMP_DB_DIR}/app.db")

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def dataset(client) -> dict:
    res = client.post("/api/v1/datasets/sample")
    assert res.status_code == 200, res.text
    return res.json()


@pytest.fixture
def baseline(client, dataset) -> dict:
    res = client.post("/api/v1/plans", json={"dataset_id": dataset["dataset_id"]})
    assert res.status_code == 200, res.text
    return res.json()


@pytest.fixture
def network(dataset) -> dict:
    """The raw sample rows, so tests can assert against source data."""
    import csv
    import io

    root = Path(__file__).resolve().parents[3]
    sample_dir = root / "data" / "samples"
    tables = {}
    for name in ("warehouses", "destinations", "products", "routes", "inventory", "demand"):
        text = (sample_dir / f"{name}.csv").read_text(encoding="utf-8-sig")
        tables[name] = [dict(r) for r in csv.DictReader(io.StringIO(text))]
    return tables
