from __future__ import annotations

import copy
from typing import Any, Dict, List, Tuple

from app.domain.schemas import DisruptionRequest


def apply_disruption(inventory, routes, disruption: DisruptionRequest) -> Tuple[List[Any], List[Any], str]:
    """
    Apply disruption without mutating originals. Returns (new_inventory, new_routes, description).
    Valid disruption types:
      - inventory_shortage: params {warehouse_id, product_id, reduction_pct}
      - supply_interruption: params {warehouse_id, product_id}
      - route_closure: params {route_id}
      - route_delay: params {route_id, extra_days}
    Raises ValueError with message if invalid params.
    """
    # Deep copy so originals untouched
    new_inventory = copy.deepcopy(inventory) if inventory is not None else []
    new_routes = copy.deepcopy(routes) if routes is not None else []

    dtype = disruption.type
    params: Dict[str, Any] = disruption.params or {}

    if dtype == "inventory_shortage":
        warehouse_id = params.get("warehouse_id")
        product_id = params.get("product_id")
        reduction_pct = params.get("reduction_pct")
        if not warehouse_id or not product_id:
            raise ValueError("inventory_shortage requires warehouse_id and product_id")
        if reduction_pct is None:
            raise ValueError("inventory_shortage requires reduction_pct")
        try:
            pct = float(reduction_pct)
        except Exception:
            raise ValueError("reduction_pct must be a number")
        if pct < 0 or pct > 100:
            raise ValueError("reduction_pct must be between 0 and 100")
        # Find matching inventory entries and reduce
        found = False
        for inv in new_inventory:
            # Support both dict and object
            wh = inv.get("warehouse_id") if isinstance(inv, dict) else getattr(inv, "warehouse_id", None)
            prod = inv.get("product_id") if isinstance(inv, dict) else getattr(inv, "product_id", None)
            if str(wh) == str(warehouse_id) and str(prod) == str(product_id):
                found = True
                if isinstance(inv, dict):
                    orig = float(inv.get("quantity", 0) or 0)
                    inv["quantity"] = round(orig * (1 - pct / 100.0), 6)
                else:
                    orig = float(getattr(inv, "quantity", 0) or 0)
                    inv.quantity = round(orig * (1 - pct / 100.0), 6)
        if not found:
            raise ValueError(f"No inventory found for warehouse '{warehouse_id}' and product '{product_id}'")
        description = f"Inventory shortage: reduced {warehouse_id}/{product_id} by {pct}%"

    elif dtype == "supply_interruption":
        warehouse_id = params.get("warehouse_id")
        product_id = params.get("product_id")
        if not warehouse_id or not product_id:
            raise ValueError("supply_interruption requires warehouse_id and product_id")
        found = False
        for inv in new_inventory:
            wh = inv.get("warehouse_id") if isinstance(inv, dict) else getattr(inv, "warehouse_id", None)
            prod = inv.get("product_id") if isinstance(inv, dict) else getattr(inv, "product_id", None)
            if str(wh) == str(warehouse_id) and str(prod) == str(product_id):
                found = True
                if isinstance(inv, dict):
                    inv["quantity"] = 0
                else:
                    inv.quantity = 0
        if not found:
            raise ValueError(f"No inventory found for warehouse '{warehouse_id}' and product '{product_id}'")
        description = f"Supply interruption: set {warehouse_id}/{product_id} quantity to 0"

    elif dtype == "route_closure":
        route_id = params.get("route_id")
        if not route_id:
            raise ValueError("route_closure requires route_id")
        found = False
        for r in new_routes:
            rid = r.get("id") if isinstance(r, dict) else getattr(r, "id", None)
            if str(rid) == str(route_id):
                found = True
                if isinstance(r, dict):
                    r["available"] = False
                else:
                    r.available = False
        if not found:
            raise ValueError(f"Route '{route_id}' not found")
        description = f"Route closure: set route {route_id} available=False"

    elif dtype == "route_delay":
        route_id = params.get("route_id")
        extra_days = params.get("extra_days")
        if not route_id:
            raise ValueError("route_delay requires route_id")
        if extra_days is None:
            raise ValueError("route_delay requires extra_days")
        try:
            ed = float(extra_days)
        except Exception:
            raise ValueError("extra_days must be a number")
        if ed < 0:
            raise ValueError("extra_days must be non-negative")
        found = False
        for r in new_routes:
            rid = r.get("id") if isinstance(r, dict) else getattr(r, "id", None)
            if str(rid) == str(route_id):
                found = True
                if isinstance(r, dict):
                    orig = float(r.get("time_days", 0) or 0)
                    r["time_days"] = round(orig + ed, 4)
                else:
                    orig = float(getattr(r, "time_days", 0) or 0)
                    r.time_days = round(orig + ed, 4)
        if not found:
            raise ValueError(f"Route '{route_id}' not found")
        description = f"Route delay: increased route {route_id} time_days by {ed} days"

    else:
        raise ValueError(f"Unknown disruption type '{dtype}'. Allowed: inventory_shortage, supply_interruption, route_closure, route_delay")

    return new_inventory, new_routes, description
