"""Coercion helpers that turn raw CSV row dicts into typed domain objects.

CSV cells arrive as strings. Pydantic will reject an empty ``backup`` cell or a
``"true"`` string, and a rejected route must never be silently dropped from the
plan — that would quietly remove capacity from the network. These helpers
normalise every field explicitly so callers can rely on a total function.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.domain.schemas import Demand, Inventory, Route

_TRUTHY = {"true", "1", "yes", "y", "t"}
_FALSY = {"false", "0", "no", "n", "f", "", "none", "null"}


def as_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value).strip().lower()
    if text in _TRUTHY:
        return True
    if text in _FALSY:
        return False
    return default


def as_float(value: Any, default: float = 0.0) -> float:
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def as_optional_float(value: Any) -> Optional[float]:
    if value is None or str(value).strip() == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def as_product_ids(value: Any) -> Optional[List[str]]:
    if value is None:
        return None
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()] or None
    text = str(value).strip()
    if not text or text.lower() in ("null", "none", "[]"):
        return None
    parts = text.replace(";", ",").replace("|", ",").split(",")
    cleaned = [p.strip() for p in parts if p.strip()]
    return cleaned or None


def route_from_row(row: Dict[str, Any]) -> Optional[Route]:
    """Build a Route from a raw CSV row; returns None only if identifiers are missing."""
    rid = row.get("id")
    wh = row.get("warehouse_id")
    dst = row.get("destination_id")
    if not rid or not wh or not dst:
        return None
    return Route(
        id=str(rid).strip(),
        warehouse_id=str(wh).strip(),
        destination_id=str(dst).strip(),
        capacity=as_float(row.get("capacity"), 0.0),
        cost_per_unit=as_float(row.get("cost_per_unit"), 0.0),
        time_days=as_float(row.get("time_days"), 0.0),
        available=as_bool(row.get("available"), True),
        product_ids=as_product_ids(row.get("product_ids")),
        backup=as_bool(row.get("backup"), False),
    )


def inventory_from_row(row: Dict[str, Any]) -> Optional[Inventory]:
    wh = row.get("warehouse_id")
    prod = row.get("product_id")
    if not wh or not prod:
        return None
    return Inventory(
        warehouse_id=str(wh).strip(),
        product_id=str(prod).strip(),
        quantity=as_float(row.get("quantity"), 0.0),
    )


def demand_from_row(row: Dict[str, Any]) -> Optional[Demand]:
    dst = row.get("destination_id")
    prod = row.get("product_id")
    if not dst or not prod:
        return None
    return Demand(
        destination_id=str(dst).strip(),
        product_id=str(prod).strip(),
        quantity=as_float(row.get("quantity"), 0.0),
    )


def build_network(meta: Dict[str, Any]):
    """Return (inventory, demand, routes, priorities) from stored dataset meta."""
    inventory = [r for r in (inventory_from_row(x) for x in meta.get("inventory", [])) if r]
    demand = [r for r in (demand_from_row(x) for x in meta.get("demand", [])) if r]
    routes = [r for r in (route_from_row(x) for x in meta.get("routes", [])) if r]

    priorities: Dict[str, int] = {}
    for d in meta.get("destinations", []):
        if not isinstance(d, dict):
            continue
        did = d.get("id")
        pri = d.get("priority")
        if did is None or pri is None or pri == "":
            continue
        try:
            priorities[str(did)] = int(float(pri))
        except (TypeError, ValueError):
            continue
    return inventory, demand, routes, priorities


def load_destinations(meta: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Normalise destination rows for deadline-based delivery-risk checks."""
    out: List[Dict[str, Any]] = []
    for d in meta.get("destinations", []):
        if not isinstance(d, dict):
            continue
        did = d.get("id")
        if did is None:
            continue
        out.append(
            {
                "id": str(did),
                "priority": d.get("priority"),
                "deadline_days": as_optional_float(d.get("deadline_days")),
            }
        )
    return out
