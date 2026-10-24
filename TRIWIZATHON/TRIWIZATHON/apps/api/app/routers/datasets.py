from __future__ import annotations

import csv
import io
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.repo import database as db
from app.services.validation import parse_csv, validate_dataset

router = APIRouter(prefix="/api/v1/datasets", tags=["datasets"])

SAMPLE_TABLES = ("warehouses", "destinations", "products", "routes", "inventory", "demand")


def _sample_dir() -> Optional[Path]:
    """Locate the bundled sample CSVs across local + Docker layouts."""
    here = Path(__file__).resolve()
    candidates = [here.parents[i] / "data" / "samples" for i in range(2, 6)]
    candidates.append(Path.cwd() / "data" / "samples")
    candidates.append(Path.cwd().parent / "data" / "samples")
    candidates.append(Path.cwd().parent.parent / "data" / "samples")
    for cand in candidates:
        try:
            if all((cand / f"{t}.csv").is_file() for t in SAMPLE_TABLES):
                return cand
        except OSError:
            continue
    return None


def _read_sample_csv(path: Path) -> List[Dict[str, Any]]:
    text = path.read_text(encoding="utf-8-sig")
    return [dict(row) for row in csv.DictReader(io.StringIO(text))]


def _persist_dataset(wh_data, dest_data, prod_data, route_data, inv_data, dem_data, name: str) -> Dict[str, Any]:
    report = validate_dataset(wh_data, dest_data, prod_data, route_data, inv_data, dem_data)
    dataset_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    meta = {
        "warehouses": wh_data,
        "destinations": dest_data,
        "products": prod_data,
        "routes": route_data,
        "inventory": inv_data,
        "demand": dem_data,
        "validation_report": report.model_dump() if hasattr(report, "model_dump") else report,
    }
    db.save_dataset(dataset_id, name=name, created_at=created_at, meta=meta)
    preview = {
        "warehouses": wh_data[:5],
        "destinations": dest_data[:5],
        "products": prod_data[:5],
        "routes": route_data[:5],
        "inventory": inv_data[:5],
        "demand": dem_data[:5],
    }
    return {
        "dataset_id": dataset_id,
        "name": name,
        "created_at": created_at,
        "validation_report": report.model_dump() if hasattr(report, "model_dump") else report,
        "preview": preview,
    }


def _parse_upload(file: UploadFile | None) -> List[Dict[str, Any]]:
    if file is None:
        return []
    try:
        # Use parse_csv helper which handles UploadFile
        return parse_csv(file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse {file.filename}: {e}")


def _preview(records: List[Dict[str, Any]], n: int = 5) -> List[Dict[str, Any]]:
    return records[:n]


@router.post("/import")
async def import_dataset(
    warehouses: UploadFile = File(...),
    destinations: UploadFile = File(...),
    products: UploadFile = File(...),
    routes: UploadFile = File(...),
    inventory: UploadFile = File(...),
    demand: UploadFile = File(...),
):
    uploads = {
        "warehouses": warehouses,
        "destinations": destinations,
        "products": products,
        "routes": routes,
        "inventory": inventory,
        "demand": demand,
    }
    # Enforce a size limit before parsing anything
    for name, upload in uploads.items():
        size = getattr(upload, "size", None)
        if size is not None and size > settings.max_upload_bytes:
            raise HTTPException(
                status_code=413,
                detail=(
                    f"{name}.csv is {size} bytes; the limit is "
                    f"{settings.max_upload_bytes} bytes per file."
                ),
            )
        filename = (upload.filename or "").lower()
        if filename and not filename.endswith(".csv"):
            raise HTTPException(status_code=400, detail=f"{name} must be a .csv file (got '{upload.filename}')")

    # Read each CSV
    try:
        wh_data = parse_csv(warehouses)
        dest_data = parse_csv(destinations)
        prod_data = parse_csv(products)
        route_data = parse_csv(routes)
        inv_data = parse_csv(inventory)
        dem_data = parse_csv(demand)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing failed: {e}")

    try:
        result = _persist_dataset(
            wh_data, dest_data, prod_data, route_data, inv_data, dem_data,
            name=f"upload-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save dataset: {e}")
    return result


@router.post("/sample")
def load_sample_dataset():
    """Load the bundled deterministic sample dataset (offline, no uploads needed)."""
    sample_dir = _sample_dir()
    if sample_dir is None:
        raise HTTPException(status_code=404, detail="Bundled sample data not found in data/samples/")

    tables: Dict[str, List[Dict[str, Any]]] = {}
    try:
        for t in SAMPLE_TABLES:
            tables[t] = _read_sample_csv(sample_dir / f"{t}.csv")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read sample data: {e}")

    try:
        return _persist_dataset(
            tables["warehouses"], tables["destinations"], tables["products"],
            tables["routes"], tables["inventory"], tables["demand"],
            name="Sample Network (bundled)",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save sample dataset: {e}")


@router.get("/")
def list_datasets():
    try:
        datasets = db.list_datasets()
        return {"datasets": datasets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{dataset_id}")
def get_dataset(dataset_id: str):
    ds = db.get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")
    return ds


@router.post("/{dataset_id}/validate")
def validate_existing(dataset_id: str):
    ds = db.get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")
    meta = ds.get("meta", {})
    wh = meta.get("warehouses", [])
    dest = meta.get("destinations", [])
    prod = meta.get("products", [])
    routes = meta.get("routes", [])
    inv = meta.get("inventory", [])
    dem = meta.get("demand", [])
    report = validate_dataset(wh, dest, prod, routes, inv, dem)
    return report.model_dump() if hasattr(report, "model_dump") else report
