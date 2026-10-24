from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.domain.schemas import AllocationInput, AllocationResult
from app.services.allocation import solve_allocation


def _qty(a) -> float:
    return float(a.get("quantity", 0) if isinstance(a, dict) else getattr(a, "quantity", 0) or 0)


def _compare_allocations(
    before: List[Any], after: List[Any], routes: List[Any]
) -> List[Dict[str, Any]]:
    """Diff two allocation sets keyed by (warehouse, destination, product, route)."""
    cost_by_route: Dict[str, float] = {}
    backup_by_route: Dict[str, bool] = {}
    for r in routes:
        rid = r.get("id") if isinstance(r, dict) else getattr(r, "id", None)
        cost = r.get("cost_per_unit") if isinstance(r, dict) else getattr(r, "cost_per_unit", 0)
        is_backup = r.get("backup") if isinstance(r, dict) else getattr(r, "backup", False)
        if rid:
            cost_by_route[str(rid)] = float(cost or 0)
            backup_by_route[str(rid)] = bool(is_backup)

    def key(a):
        return (
            str(a.get("warehouse_id") if isinstance(a, dict) else getattr(a, "warehouse_id", "")),
            str(a.get("destination_id") if isinstance(a, dict) else getattr(a, "destination_id", "")),
            str(a.get("product_id") if isinstance(a, dict) else getattr(a, "product_id", "")),
            str(a.get("route_id") if isinstance(a, dict) else getattr(a, "route_id", "")),
        )

    before_map: Dict[tuple, float] = {}
    for a in before or []:
        before_map[key(a)] = before_map.get(key(a), 0.0) + _qty(a)
    after_map: Dict[tuple, float] = {}
    for a in after or []:
        after_map[key(a)] = after_map.get(key(a), 0.0) + _qty(a)

    actions: List[Dict[str, Any]] = []
    for k in sorted(set(before_map) | set(after_map)):
        delta = round(after_map.get(k, 0.0) - before_map.get(k, 0.0), 4)
        if abs(delta) < 1e-6:
            continue
        wh, dst, prod, route = k
        actions.append(
            {
                "type": "reallocate" if delta > 0 else "reduce",
                "warehouse_id": wh,
                "destination_id": dst,
                "product_id": prod,
                "route_id": route,
                "quantity_delta": delta,
                "activated_contingency_lane": bool(delta > 0 and backup_by_route.get(route, False)),
                "cost_per_unit": cost_by_route.get(route),
                "explanation": (
                    f"{'Added' if delta > 0 else 'Reduced'} {abs(delta):.0f} units "
                    f"{'from' if delta > 0 else 'on'} {wh} to {dst} for {prod} via {route}"
                    + (" (contingency lane)" if delta > 0 and backup_by_route.get(route, False) else "")
                ),
            }
        )
    return actions


def recover_allocation(
    disrupted_input: AllocationInput,
    disrupted_allocations: Optional[List[Any]] = None,
) -> AllocationResult:
    """Re-plan under disrupted conditions using recovery-only levers.

    Levers actually applied (each is a real change to the optimisation, not a label):
      1. Contingency lanes (``route.backup``) are activated at their premium cost.
      2. Demand is re-ordered by destination priority then deadline urgency, so scarce
         capacity protects the most critical destinations first.

    If the network genuinely cannot cover demand, the residual unmet rows are returned
    unchanged and the caller reports the limiting constraint rather than inventing success.
    """
    result = solve_allocation(disrupted_input, allow_backup=True)

    actions: List[Dict[str, Any]] = []

    activated = sorted(
        {
            str(a.route_id)
            for a in result.allocations
            if _is_backup_route(a.route_id, disrupted_input.routes)
        }
    )
    if activated:
        premium = sum(
            float(r.cost_per_unit)
            for r in disrupted_input.routes
            if str(r.id) in activated
        )
        actions.append(
            {
                "type": "activate_contingency_lane",
                "details": activated,
                "explanation": f"Activated {len(activated)} contingency lane(s): {', '.join(activated)}",
                "avg_cost_per_unit": round(premium / max(len(activated), 1), 4),
            }
        )

    diffs = _compare_allocations(disrupted_allocations or [], result.allocations, disrupted_input.routes)
    if diffs:
        actions.extend(diffs[:20])

    if result.unmet:
        total_unmet = sum(float(u.quantity) for u in result.unmet)
        actions.append(
            {
                "type": "residual_unmet",
                "details": [u.model_dump() for u in result.unmet[:20]],
                "explanation": (
                    f"Residual unmet demand: {total_unmet:.0f} units across "
                    f"{len(result.unmet)} destination-product pairs — beyond available "
                    f"inventory and lane capacity even with contingency lanes."
                ),
            }
        )
    else:
        actions.append(
            {
                "type": "fully_recovered",
                "details": [],
                "explanation": "All demand is covered after recovery.",
            }
        )

    if result.diagnostics is None:
        result.diagnostics = {}
    result.diagnostics["recovery_actions"] = actions
    result.diagnostics["contingency_lanes_activated"] = activated
    return result


def _is_backup_route(route_id: str, routes: List[Any]) -> bool:
    for r in routes:
        rid = r.get("id") if isinstance(r, dict) else getattr(r, "id", None)
        if str(rid) == str(route_id):
            is_backup = r.get("backup") if isinstance(r, dict) else getattr(r, "backup", False)
            return bool(is_backup)
    return False
