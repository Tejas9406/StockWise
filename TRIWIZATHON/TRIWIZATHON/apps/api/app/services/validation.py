from __future__ import annotations

import io
from typing import Any, Dict, List

try:
    import pandas as pd  # type: ignore

    _HAS_PANDAS = True
except ImportError:
    pd = None  # type: ignore
    _HAS_PANDAS = False

from app.domain.schemas import ValidationIssue, ValidationReport


def _csv_fallback_parse(file) -> List[Dict[str, Any]]:
    """Pure-python CSV fallback when pandas is unavailable."""
    import csv

    text = None
    if hasattr(file, "file") and hasattr(file, "filename"):
        try:
            file.file.seek(0)
        except Exception:
            pass
        raw = file.file.read()
        if isinstance(raw, bytes):
            text = raw.decode("utf-8", errors="replace")
        else:
            text = str(raw)
        try:
            file.file.seek(0)
        except Exception:
            pass
    elif isinstance(file, (bytes, bytearray)):
        text = bytes(file).decode("utf-8", errors="replace")
    elif hasattr(file, "read"):
        try:
            file.seek(0)
        except Exception:
            pass
        raw = file.read()
        if isinstance(raw, bytes):
            text = raw.decode("utf-8", errors="replace")
        else:
            text = str(raw)
        try:
            file.seek(0)
        except Exception:
            pass
    elif isinstance(file, str):
        if "\n" in file and "," in file:
            text = file
        else:
            # treat as file path
            with open(file, "r", encoding="utf-8", errors="replace") as f:
                text = f.read()
    else:
        raise ValueError(f"Unsupported file type for CSV parsing: {type(file)}")

    reader = csv.DictReader(io.StringIO(text))
    records: List[Dict[str, Any]] = []
    for row in reader:
        cleaned: Dict[str, Any] = {}
        for k, v in row.items():
            if v is None or (isinstance(v, str) and v.strip() == ""):
                cleaned[k] = None
            else:
                vs = str(v).strip()
                # try numeric coercion later in validation; keep string for now but attempt float/int
                cleaned[k] = vs
        records.append(cleaned)
    return records


def parse_csv(file) -> List[Dict[str, Any]]:
    """
    Parse an uploaded file (or file-like/bytes) into list[dict] using pandas.
    Accepts FastAPI UploadFile, bytes, or any file-like object.
    Falls back to csv module if pandas is not available.
    """
    if not _HAS_PANDAS:
        return _csv_fallback_parse(file)
    try:
        # FastAPI UploadFile
        if hasattr(file, "file") and hasattr(file, "filename"):
            try:
                file.file.seek(0)
            except Exception:
                pass
            df = pd.read_csv(file.file)
        elif isinstance(file, (bytes, bytearray)):
            df = pd.read_csv(io.BytesIO(file))
        elif hasattr(file, "read"):
            try:
                file.seek(0)
            except Exception:
                pass
            content = file.read()
            if isinstance(content, bytes):
                df = pd.read_csv(io.BytesIO(content))
            else:
                df = pd.read_csv(io.StringIO(str(content)))
            try:
                file.seek(0)
            except Exception:
                pass
        elif isinstance(file, str):
            if "\n" in file and "," in file:
                df = pd.read_csv(io.StringIO(file))
            else:
                df = pd.read_csv(file)
        else:
            df = pd.read_csv(file)

        df = df.replace({pd.NA: None})
        records = df.to_dict(orient="records")
        cleaned: List[Dict[str, Any]] = []
        for r in records:
            nr: Dict[str, Any] = {}
            for k, v in r.items():
                if pd.isna(v):
                    nr[k] = None
                else:
                    nr[k] = v
            cleaned.append(nr)
        return cleaned
    except Exception as e:
        # fallback to csv module on pandas failure
        try:
            return _csv_fallback_parse(file)
        except Exception:
            raise ValueError(f"Failed to parse CSV: {e}") from e


def _is_missing(v: Any) -> bool:
    if v is None:
        return True
    if _HAS_PANDAS and isinstance(v, float):
        try:
            if pd.isna(v):  # type: ignore
                return True
        except Exception:
            pass
    if isinstance(v, float) and (v != v):  # NaN check without pandas
        return True
    if isinstance(v, str) and v.strip() == "":
        return True
    return False


def validate_dataset(
    warehouses: List[Dict[str, Any]],
    destinations: List[Dict[str, Any]],
    products: List[Dict[str, Any]],
    routes: List[Dict[str, Any]],
    inventory: List[Dict[str, Any]],
    demand: List[Dict[str, Any]],
) -> ValidationReport:
    issues: List[ValidationIssue] = []

    def add_issue(message: str, severity: str = "error", field: str | None = None, row: int | None = None):
        issues.append(ValidationIssue(message=message, severity=severity, field=field, row=row))

    # Helper to check duplicate ids
    def check_duplicates(records: List[Dict[str, Any]], entity: str, id_field: str = "id"):
        seen: Dict[Any, int] = {}
        for idx, rec in enumerate(records):
            val = rec.get(id_field)
            if _is_missing(val):
                add_issue(f"{entity} row {idx}: missing {id_field}", severity="error", field=id_field, row=idx)
                continue
            key = str(val).strip()
            if key in seen:
                add_issue(
                    f"Duplicate {entity} id '{key}' at row {idx} (first at row {seen[key]})",
                    severity="error",
                    field=id_field,
                    row=idx,
                )
            else:
                seen[key] = idx
        return seen

    wh_ids_seen = check_duplicates(warehouses, "warehouse", "id")
    dest_ids_seen = check_duplicates(destinations, "destination", "id")
    prod_ids_seen = check_duplicates(products, "product", "id")
    route_ids_seen = check_duplicates(routes, "route", "id")

    # Collect valid id sets for referential checks
    wh_ids = set(wh_ids_seen.keys())
    dest_ids = set(dest_ids_seen.keys())
    prod_ids = set(prod_ids_seen.keys())

    # Warehouses: check required fields
    for idx, w in enumerate(warehouses):
        for field in ("id", "name", "region"):
            if _is_missing(w.get(field)):
                add_issue(f"Warehouse row {idx}: missing/invalid {field}", severity="error", field=field, row=idx)
        for coord in ("lat", "lng"):
            v = w.get(coord)
            if v is not None and not _is_missing(v):
                try:
                    float(v)
                except Exception:
                    add_issue(f"Warehouse row {idx}: invalid {coord} '{v}'", severity="error", field=coord, row=idx)

    # Products
    for idx, p in enumerate(products):
        for field in ("id", "name", "unit"):
            if _is_missing(p.get(field)):
                add_issue(f"Product row {idx}: missing/invalid {field}", severity="error", field=field, row=idx)
        if p.get("weight_kg") is not None and not _is_missing(p.get("weight_kg")):
            try:
                wv = float(p["weight_kg"])
                if wv < 0:
                    add_issue(f"Product row {idx}: weight_kg negative {wv}", severity="error", field="weight_kg", row=idx)
            except Exception:
                add_issue(f"Product row {idx}: invalid weight_kg '{p.get('weight_kg')}'", severity="error", field="weight_kg", row=idx)

    # Destinations
    for idx, d in enumerate(destinations):
        for field in ("id", "name", "region"):
            if _is_missing(d.get(field)):
                add_issue(f"Destination row {idx}: missing/invalid {field}", severity="error", field=field, row=idx)
        # priority 1-5
        pri = d.get("priority")
        if _is_missing(pri):
            add_issue(f"Destination row {idx}: missing priority", severity="error", field="priority", row=idx)
        else:
            try:
                pi = int(float(pri)) if isinstance(pri, float) else int(pri)
                if pi < 1 or pi > 5:
                    add_issue(f"Destination row {idx}: priority {pi} out of range 1-5", severity="error", field="priority", row=idx)
            except Exception:
                add_issue(f"Destination row {idx}: invalid priority '{pri}'", severity="error", field="priority", row=idx)
        if d.get("deadline_days") is not None and not _is_missing(d.get("deadline_days")):
            try:
                dv = int(float(d["deadline_days"]))
                if dv < 0:
                    add_issue(f"Destination row {idx}: deadline_days negative", severity="error", field="deadline_days", row=idx)
            except Exception:
                add_issue(f"Destination row {idx}: invalid deadline_days '{d.get('deadline_days')}'", severity="error", field="deadline_days", row=idx)

    # Routes
    for idx, r in enumerate(routes):
        for field in ("id", "warehouse_id", "destination_id", "capacity", "cost_per_unit", "time_days"):
            if _is_missing(r.get(field)):
                add_issue(f"Route row {idx}: missing/invalid {field}", severity="error", field=field, row=idx)
        # referential integrity
        if not _is_missing(r.get("warehouse_id")) and str(r.get("warehouse_id")).strip() not in wh_ids:
            add_issue(f"Route row {idx}: warehouse_id '{r.get('warehouse_id')}' does not exist", severity="error", field="warehouse_id", row=idx)
        if not _is_missing(r.get("destination_id")) and str(r.get("destination_id")).strip() not in dest_ids:
            add_issue(f"Route row {idx}: destination_id '{r.get('destination_id')}' does not exist", severity="error", field="destination_id", row=idx)
        # capacity non-negative
        for field in ("capacity", "cost_per_unit", "time_days"):
            v = r.get(field)
            if not _is_missing(v):
                try:
                    fv = float(v)
                    if fv < 0:
                        add_issue(f"Route row {idx}: {field} negative {fv}", severity="error", field=field, row=idx)
                except Exception:
                    add_issue(f"Route row {idx}: invalid {field} '{v}'", severity="error", field=field, row=idx)
        # available bool check (warning if invalid type)
        if r.get("available") is not None and not isinstance(r.get("available"), bool):
            # try to coerce string
            val = str(r.get("available")).lower()
            if val not in ("true", "false", "1", "0", "yes", "no"):
                add_issue(f"Route row {idx}: invalid available flag '{r.get('available')}'", severity="warning", field="available", row=idx)
        # product_ids filter validation
        pids = r.get("product_ids")
        if pids is not None and not _is_missing(pids):
            # Can be string like "p1;p2" or list
            if isinstance(pids, str):
                # try parse as comma/semicolon separated
                parts = [x.strip() for x in pids.replace(";", ",").split(",") if x.strip()]
                for pid in parts:
                    if pid not in prod_ids:
                        add_issue(f"Route row {idx}: product_id '{pid}' in product_ids does not exist", severity="warning", field="product_ids", row=idx)
            elif isinstance(pids, list):
                for pid in pids:
                    if str(pid).strip() not in prod_ids:
                        add_issue(f"Route row {idx}: product_id '{pid}' in product_ids does not exist", severity="warning", field="product_ids", row=idx)

    # Inventory
    for idx, inv in enumerate(inventory):
        for field in ("warehouse_id", "product_id", "quantity"):
            if _is_missing(inv.get(field)):
                add_issue(f"Inventory row {idx}: missing/invalid {field}", severity="error", field=field, row=idx)
        if not _is_missing(inv.get("warehouse_id")) and str(inv.get("warehouse_id")).strip() not in wh_ids:
            add_issue(f"Inventory row {idx}: warehouse_id '{inv.get('warehouse_id')}' does not exist", severity="error", field="warehouse_id", row=idx)
        if not _is_missing(inv.get("product_id")) and str(inv.get("product_id")).strip() not in prod_ids:
            add_issue(f"Inventory row {idx}: product_id '{inv.get('product_id')}' does not exist", severity="error", field="product_id", row=idx)
        q = inv.get("quantity")
        if not _is_missing(q):
            try:
                fq = float(q)
                if fq < 0:
                    add_issue(f"Inventory row {idx}: quantity negative {fq}", severity="error", field="quantity", row=idx)
            except Exception:
                add_issue(f"Inventory row {idx}: invalid quantity '{q}'", severity="error", field="quantity", row=idx)

    # Demand
    for idx, dem in enumerate(demand):
        for field in ("destination_id", "product_id", "quantity"):
            if _is_missing(dem.get(field)):
                add_issue(f"Demand row {idx}: missing/invalid {field}", severity="error", field=field, row=idx)
        if not _is_missing(dem.get("destination_id")) and str(dem.get("destination_id")).strip() not in dest_ids:
            add_issue(f"Demand row {idx}: destination_id '{dem.get('destination_id')}' does not exist", severity="error", field="destination_id", row=idx)
        if not _is_missing(dem.get("product_id")) and str(dem.get("product_id")).strip() not in prod_ids:
            add_issue(f"Demand row {idx}: product_id '{dem.get('product_id')}' does not exist", severity="error", field="product_id", row=idx)
        q = dem.get("quantity")
        if not _is_missing(q):
            try:
                fq = float(q)
                if fq < 0:
                    add_issue(f"Demand row {idx}: quantity negative {fq}", severity="error", field="quantity", row=idx)
            except Exception:
                add_issue(f"Demand row {idx}: invalid quantity '{q}'", severity="error", field="quantity", row=idx)

    errors = sum(1 for i in issues if i.severity == "error")
    warnings = sum(1 for i in issues if i.severity == "warning")
    valid = errors == 0
    summary = {"total_issues": len(issues), "errors": errors, "warnings": warnings}
    return ValidationReport(valid=valid, issues=issues, summary=summary)
