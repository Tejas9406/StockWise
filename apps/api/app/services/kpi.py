from __future__ import annotations

from typing import Any, Dict, List

from app.domain.schemas import KPISnapshot


def _attr(obj, field, default=None):
    if isinstance(obj, dict):
        return obj.get(field, default)
    return getattr(obj, field, default)


def compute_delivery_risk(allocations, routes, destinations) -> Dict[str, Any]:
    """Flag shipments that cannot meet their destination deadline.

    A shipment is at risk when ``route.time_days > destination.deadline_days``
    (or when a destination deadline is missing but the route is slower than the
    network median). This is a KPI-level signal only: it never changes feasibility.
    """
    route_by_id = {str(_attr(r, "id")): r for r in (routes or [])}
    deadline_by_dest = {}
    for d in destinations or []:
        dl = _attr(d, "deadline_days")
        if dl is not None and str(dl).strip() != "":
            try:
                deadline_by_dest[str(_attr(d, "id"))] = float(dl)
            except (TypeError, ValueError):
                pass

    at_risk_units = 0.0
    at_risk_rows: List[Dict[str, Any]] = []
    destinations_at_risk = set()
    max_delay = 0.0

    for a in allocations or []:
        qty = float(_attr(a, "quantity", 0) or 0)
        if qty <= 0:
            continue
        route = route_by_id.get(str(_attr(a, "route_id")))
        if route is None:
            continue
        try:
            transit = float(_attr(route, "time_days", 0) or 0)
        except (TypeError, ValueError):
            continue
        dest = str(_attr(a, "destination_id"))
        deadline = deadline_by_dest.get(dest)
        if deadline is None:
            continue
        slack = deadline - transit
        if slack < 0:
            at_risk_units += qty
            destinations_at_risk.add(dest)
            max_delay = max(max_delay, -slack)
            at_risk_rows.append(
                {
                    "destination_id": dest,
                    "route_id": str(_attr(route, "id")),
                    "quantity": round(qty, 2),
                    "transit_days": round(transit, 2),
                    "deadline_days": round(deadline, 2),
                    "late_by_days": round(-slack, 2),
                }
            )

    return {
        "at_risk_units": round(at_risk_units, 2),
        "at_risk_destinations": sorted(destinations_at_risk),
        "at_risk_shipments": at_risk_rows[:50],
        "max_late_days": round(max_delay, 2),
        "definition": "A shipment is late when route.time_days > destination.deadline_days.",
    }


def compute_kpis(allocation_result, inventory, demand, routes) -> KPISnapshot:
    """
    Compute all KPIs from allocation_result, inventory, demand, routes.

    allocation_result: AllocationResult (or dict with same fields)
    inventory: List[Inventory | dict]
    demand: List[Demand | dict]
    routes: List[Route | dict]

    KPIs:
      total_inventory sum
      total_demand sum
      fulfilled = total_demand - unmet sum
      fulfillment_rate
      total_cost
      wh_utilization (from allocation_result.utilization if available)
      route_utilization (from allocation_result.utilization if available)
      at_risk_destinations count where unmet>0 and priority<=2
      risk_score 0-100 = weighted (unmet_rate*50 + route_util*20 + at_risk*15 + cost_per_unit_factor*15)
      risk_breakdown dict
    """

    def _qty(obj, field="quantity"):
        if isinstance(obj, dict):
            return float(obj.get(field, 0) or 0)
        return float(getattr(obj, field, 0) or 0)

    # Normalize allocation_result access
    if isinstance(allocation_result, dict):
        allocs = allocation_result.get("allocations", [])
        unmet_list = allocation_result.get("unmet", [])
        total_cost = float(allocation_result.get("total_cost", 0) or 0)
        utilization = allocation_result.get("utilization", {}) or {}
        fulfillment_rate_raw = allocation_result.get("fulfillment_rate")
    else:
        allocs = getattr(allocation_result, "allocations", []) or []
        unmet_list = getattr(allocation_result, "unmet", []) or []
        total_cost = float(getattr(allocation_result, "total_cost", 0) or 0)
        utilization = getattr(allocation_result, "utilization", {}) or {}
        fulfillment_rate_raw = getattr(allocation_result, "fulfillment_rate", None)

    # total inventory / demand
    total_inventory = sum(_qty(x) for x in (inventory or []))
    total_demand = sum(_qty(x) for x in (demand or []))

    unmet_total = 0.0
    for u in unmet_list:
        if isinstance(u, dict):
            unmet_total += float(u.get("quantity", 0) or 0)
        else:
            unmet_total += float(getattr(u, "quantity", 0) or 0)

    fulfilled = max(0.0, total_demand - unmet_total)
    if total_demand > 0:
        fulfillment_rate = fulfilled / total_demand
    else:
        fulfillment_rate = 1.0
    # If allocation_result has fulfillment_rate, prefer its value but ensure consistency
    if fulfillment_rate_raw is not None:
        try:
            fulfillment_rate = float(fulfillment_rate_raw)
        except Exception:
            pass

    # utilization
    wh_utilization = 0.0
    route_utilization = 0.0
    if isinstance(utilization, dict):
        wh_utilization = float(utilization.get("wh_utilization", 0) or 0)
        route_utilization = float(utilization.get("route_utilization", 0) or 0)
        # If not provided but we can compute from used_inventory
        if wh_utilization == 0 and total_inventory > 0:
            used_inv = utilization.get("used_inventory")
            if used_inv is not None:
                try:
                    wh_utilization = float(used_inv) / total_inventory if total_inventory else 0
                except Exception:
                    pass

    # at_risk_destinations: count where unmet>0 and priority<=2 (1 highest urgency)
    at_risk_set = set()
    for u in unmet_list:
        if isinstance(u, dict):
            qty = float(u.get("quantity", 0) or 0)
            pri = u.get("priority", 3)
            dst = u.get("destination_id")
        else:
            qty = float(getattr(u, "quantity", 0) or 0)
            pri = getattr(u, "priority", 3)
            dst = getattr(u, "destination_id", None)
        try:
            pri = int(pri)
        except Exception:
            pri = 3
        if qty > 1e-9 and pri <= 2:
            if dst:
                at_risk_set.add(str(dst))
    at_risk_destinations = len(at_risk_set)

    # Risk score 0-100
    # documented weights: unmet_rate*50 + route_util*20 + at_risk*15 + cost_per_unit_factor*15
    unmet_rate = (unmet_total / total_demand) if total_demand > 0 else 0.0
    # route_util contribution 0-20
    route_util_component = route_utilization * 20

    # at_risk factor: normalize by max possible? Use min(at_risk/5,1)*15  (assume up to 5 at risk => max)
    # To keep 0-15 range, cap denominator
    total_dest = 0
    if demand:
        dest_ids = set()
        for d in demand:
            if isinstance(d, dict):
                dest_ids.add(str(d.get("destination_id", "")))
            else:
                dest_ids.add(str(getattr(d, "destination_id", "")))
        total_dest = len([x for x in dest_ids if x])
    if total_dest > 0:
        at_risk_factor = min(at_risk_destinations / max(total_dest, 1), 1.0)
    else:
        at_risk_factor = 0.0
    at_risk_component = at_risk_factor * 15

    # cost_per_unit_factor: total_cost / (fulfilled or 1) normalized. Assume high cost = >100 per unit is high risk
    # normalized as min(cost_per_unit /100, 1) *15
    cost_per_unit = (total_cost / fulfilled) if fulfilled > 0 else 0.0
    cost_factor_norm = min(cost_per_unit / 100.0, 1.0) if cost_per_unit else 0.0
    cost_component = cost_factor_norm * 15

    unmet_component = unmet_rate * 50

    risk_score = unmet_component + route_util_component + at_risk_component + cost_component
    risk_score = max(0.0, min(100.0, risk_score))

    risk_breakdown: Dict[str, Any] = {
        "unmet_rate": round(unmet_rate, 4),
        "unmet_component": round(unmet_component, 2),
        "route_utilization": round(route_utilization, 4),
        "route_component": round(route_util_component, 2),
        "at_risk_destinations": at_risk_destinations,
        "at_risk_factor": round(at_risk_factor, 4),
        "at_risk_component": round(at_risk_component, 2),
        "cost_per_unit": round(cost_per_unit, 4),
        "cost_factor_norm": round(cost_factor_norm, 4),
        "cost_component": round(cost_component, 2),
        "total_risk_score": round(risk_score, 2),
        "weights": {"unmet_rate": 50, "route_util": 20, "at_risk": 15, "cost_per_unit": 15},
        "description": "risk_score = unmet_rate*50 + route_utilization*20 + (at_risk_dest/total_dest)*15 + min(cost_per_unit/100,1)*15, capped 0-100",
    }

    return KPISnapshot(
        total_inventory=round(total_inventory, 4),
        total_demand=round(total_demand, 4),
        fulfilled=round(fulfilled, 4),
        fulfillment_rate=round(fulfillment_rate, 6),
        unmet=round(unmet_total, 4),
        total_cost=round(total_cost, 4),
        wh_utilization=round(wh_utilization, 6),
        route_utilization=round(route_utilization, 6),
        at_risk_destinations=at_risk_destinations,
        risk_score=round(risk_score, 2),
        risk_breakdown=risk_breakdown,
    )
