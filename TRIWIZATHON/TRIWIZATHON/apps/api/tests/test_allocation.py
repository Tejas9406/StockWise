"""Behavioural tests for the allocation engine.

These assert *mathematical invariants* rather than "the function returned something":
no shipment may exceed inventory, demand, or lane capacity, and conservation must hold.
"""

from __future__ import annotations

import pytest

from app.domain.schemas import AllocationInput, Demand, Inventory, Route
from app.services.allocation import solve_allocation


def _toy_network() -> AllocationInput:
    return AllocationInput(
        inventory=[
            Inventory(warehouse_id="WH-A", product_id="P1", quantity=100),
            Inventory(warehouse_id="WH-B", product_id="P1", quantity=50),
        ],
        demand=[
            Demand(destination_id="D1", product_id="P1", quantity=80),
            Demand(destination_id="D2", product_id="P1", quantity=90),
        ],
        routes=[
            Route(id="R1", warehouse_id="WH-A", destination_id="D1", capacity=60, cost_per_unit=2.0, time_days=1),
            Route(id="R2", warehouse_id="WH-B", destination_id="D1", capacity=40, cost_per_unit=3.0, time_days=2),
            Route(id="R3", warehouse_id="WH-A", destination_id="D2", capacity=45, cost_per_unit=2.5, time_days=1),
            Route(id="R4", warehouse_id="WH-B", destination_id="D2", capacity=40, cost_per_unit=3.5, time_days=2),
        ],
        priorities={"D1": 1, "D2": 2},
    )


def _totals(result):
    inv = {}
    for a in result.allocations:
        inv[(a.warehouse_id, a.product_id)] = inv.get((a.warehouse_id, a.product_id), 0) + a.quantity
    routes = {}
    for a in result.allocations:
        routes[a.route_id] = routes.get(a.route_id, 0) + a.quantity
    dem = {}
    for a in result.allocations:
        dem[(a.destination_id, a.product_id)] = dem.get((a.destination_id, a.product_id), 0) + a.quantity
    return inv, routes, dem


def test_respects_inventory_capacity_and_demand():
    inp = _toy_network()
    result = solve_allocation(inp)

    inv_tot, route_tot, dem_tot = _totals(result)

    for inv in inp.inventory:
        assert inv_tot.get((inv.warehouse_id, inv.product_id), 0) <= inv.quantity + 1e-6

    for route in inp.routes:
        assert route_tot.get(route.id, 0) <= route.capacity + 1e-6

    for demand in inp.demand:
        assert dem_tot.get((demand.destination_id, demand.product_id), 0) <= demand.quantity + 1e-6


def test_conservation_demand_equals_allocated_plus_unmet():
    inp = _toy_network()
    result = solve_allocation(inp)

    allocated = sum(a.quantity for a in result.allocations)
    unmet = sum(u.quantity for u in result.unmet)
    total_demand = sum(d.quantity for d in inp.demand)

    assert allocated + unmet == pytest.approx(total_demand, abs=1e-6)
    # 140 units of demand but only 130 units of reachable route capacity
    assert unmet > 0


def test_prioritises_high_priority_destination_when_scarce():
    inp = _toy_network()
    result = solve_allocation(inp)

    by_dest = {}
    for a in result.allocations:
        by_dest[a.destination_id] = by_dest.get(a.destination_id, 0) + a.quantity

    # D1 is priority 1 and should be served before D2 takes scarce stock
    assert by_dest.get("D1", 0) >= by_dest.get("D2", 0)


def test_unavailable_route_is_never_used():
    inp = _toy_network()
    for r in inp.routes:
        r.available = False
    result = solve_allocation(inp)

    assert result.allocations == []
    assert sum(u.quantity for u in result.unmet) == pytest.approx(sum(d.quantity for d in inp.demand))


def test_contingency_lane_dormant_unless_recovery_activates_it():
    inp = _toy_network()
    # Add an expensive backup lane that could cover the shortfall
    inp.routes.append(
        Route(
            id="R5",
            warehouse_id="WH-B",
            destination_id="D2",
            capacity=30,
            cost_per_unit=9.0,
            time_days=3,
            backup=True,
        )
    )

    normal = solve_allocation(inp, allow_backup=False)
    assert "R5" not in {a.route_id for a in normal.allocations}

    recovered = solve_allocation(inp, allow_backup=True)
    if "R5" in {a.route_id for a in recovered.allocations}:
        assert sum(a.quantity for a in recovered.allocations) > sum(a.quantity for a in normal.allocations)


def test_product_eligibility_is_enforced():
    inp = _toy_network()
    inp.routes[0].product_ids = ["OTHER"]

    result = solve_allocation(inp)
    shipped_on_r1 = [a for a in result.allocations if a.route_id == "R1"]

    assert shipped_on_r1 == []


def test_zero_demand_network_is_handled():
    inp = AllocationInput(
        inventory=[Inventory(warehouse_id="WH-A", product_id="P1", quantity=10)],
        demand=[Demand(destination_id="D1", product_id="P1", quantity=0)],
        routes=[Route(id="R1", warehouse_id="WH-A", destination_id="D1", capacity=10, cost_per_unit=1, time_days=1)],
        priorities={"D1": 1},
    )
    result = solve_allocation(inp)

    assert result.allocations == []
    assert result.fulfillment_rate == pytest.approx(1.0)


def test_solver_status_is_explicit():
    inp = _toy_network()
    result = solve_allocation(inp)

    assert result.status in {"optimal", "feasible", "infeasible", "error"}
    assert result.solver in {"greedy", "ortools", "pulp"}
    assert isinstance(result.diagnostics, dict)
