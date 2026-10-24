"""End-to-end API tests: load → plan → disrupt → impact → recover → compare → export."""

from __future__ import annotations

import csv
import io

import pytest


def _sum_unmet(plan) -> float:
    return sum(float(u["quantity"]) for u in plan["unmet"])


def _kpi(plan, key) -> float:
    return float(plan["kpis"][key])


def test_health_reports_db_and_solver(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["db"] == "ok"
    assert body["solver"] in {"greedy", "ortools", "auto"}


def test_sample_dataset_is_valid_and_complete(client, dataset, network):
    report = dataset["validation_report"]
    assert report["valid"] is True
    assert report["issues"] == []

    assert len(network["warehouses"]) == 4
    assert len(network["destinations"]) == 8
    assert len(network["products"]) == 3
    assert len(network["routes"]) == 20
    assert len(network["inventory"]) == 12
    assert len(network["demand"]) == 24


def test_baseline_fully_fulfils_sample_network(baseline):
    assert _kpi(baseline, "fulfillment_rate") == pytest.approx(1.0, abs=1e-9)
    assert _sum_unmet(baseline) == pytest.approx(0.0)
    assert len(baseline["allocations"]) > 0


def test_baseline_respects_inventory_and_route_capacity(baseline, network):
    shipped_by_wh = {}
    for a in baseline["allocations"]:
        key = (a["warehouse_id"], a["product_id"])
        shipped_by_wh[key] = shipped_by_wh.get(key, 0.0) + float(a["quantity"])

    inventory = {(r["warehouse_id"], r["product_id"]): float(r["quantity"]) for r in network["inventory"]}
    for key, shipped in shipped_by_wh.items():
        assert shipped <= inventory[key] + 1e-6, f"over-shipped {key}"

    shipped_by_route = {}
    for a in baseline["allocations"]:
        shipped_by_route[a["route_id"]] = shipped_by_route.get(a["route_id"], 0.0) + float(a["quantity"])

    capacity = {r["id"]: float(r["capacity"]) for r in network["routes"]}
    for rid, shipped in shipped_by_route.items():
        assert shipped <= capacity[rid] + 1e-6, f"route {rid} over capacity"


def test_baseline_never_uses_contingency_lanes(baseline, network):
    backup = {r["id"] for r in network["routes"] if r["backup"].lower() == "true"}
    used = {a["route_id"] for a in baseline["allocations"]}
    assert used.isdisjoint(backup), f"baseline used contingency lanes: {used & backup}"


def test_inventory_shortage_degrades_fulfillment(client, baseline):
    res = client.post(
        "/api/v1/scenarios",
        json={
            "baseline_plan_id": baseline["id"],
            "disruption": {
                "type": "inventory_shortage",
                "params": {"warehouse_id": "WH-02", "product_id": "PRD-A", "reduction_pct": 60},
            },
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert _kpi(body["disrupted_plan"], "fulfillment_rate") < 1.0
    assert _sum_unmet(body["disrupted_plan"]) > 0
    assert body["impact"]["unmet_delta"] > 0
    assert "WH-02" in body["impact"]["disruption_description"]


def test_route_closure_removes_lane_and_raises_unmet(client, baseline):
    res = client.post(
        "/api/v1/scenarios",
        json={"baseline_plan_id": baseline["id"], "disruption": {"type": "route_closure", "params": {"route_id": "RT-03"}}},
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert _kpi(body["disrupted_plan"], "fulfillment_rate") < 1.0
    assert "RT-03" not in {a["route_id"] for a in body["disrupted_plan"]["allocations"]}


def test_supply_interruption_zeroes_inventory(client, baseline):
    res = client.post(
        "/api/v1/scenarios",
        json={
            "baseline_plan_id": baseline["id"],
            "disruption": {"type": "supply_interruption", "params": {"warehouse_id": "WH-03", "product_id": "PRD-C"}},
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert _kpi(body["disrupted_plan"], "fulfillment_rate") < 1.0
    assert body["impact"]["unmet_delta"] > 0


def test_route_delay_affects_latness_not_volume(client, baseline):
    res = client.post(
        "/api/v1/scenarios",
        json={
            "baseline_plan_id": baseline["id"],
            "disruption": {"type": "route_delay", "params": {"route_id": "RT-06", "extra_days": 8}},
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()

    # Documented semantics: delay does not remove capacity, so volume is preserved
    assert _kpi(body["disrupted_plan"], "fulfillment_rate") == pytest.approx(1.0, abs=1e-9)
    # ...but shipments now breach destination deadlines
    assert body["impact"]["at_risk_units"] > 0
    assert body["impact"]["max_late_days"] > 0


def test_recovery_restores_fulfillment_at_extra_cost(client, baseline):
    scen = client.post(
        "/api/v1/scenarios",
        json={"baseline_plan_id": baseline["id"], "disruption": {"type": "route_closure", "params": {"route_id": "RT-03"}}},
    ).json()

    sid = scen["scenario"]["id"]
    disrupted_kpi = scen["disrupted_plan"]["kpis"]

    res = client.post(f"/api/v1/scenarios/{sid}/recover")
    assert res.status_code == 200, res.text
    body = res.json()

    recovered_kpi = body["recovered_plan"]["kpis"]
    assert recovered_kpi["fulfillment_rate"] > disrupted_kpi["fulfillment_rate"]
    assert recovered_kpi["total_cost"] > disrupted_kpi["total_cost"]

    # Recovery must explain itself with structured actions
    assert len(body["recovery_actions"]) > 0
    kinds = {a["type"] for a in body["recovery_actions"]}
    assert "activate_contingency_lane" in kinds or "reallocate" in kinds


def test_recovery_reports_residual_when_impossible(client, baseline):
    # Destroy a product entirely at every warehouse -> unrecoverable
    scen = client.post(
        "/api/v1/scenarios",
        json={
            "baseline_plan_id": baseline["id"],
            "disruption": {"type": "supply_interruption", "params": {"warehouse_id": "WH-03", "product_id": "PRD-C"}},
        },
    ).json()

    sid = scen["scenario"]["id"]
    body = client.post(f"/api/v1/scenarios/{sid}/recover").json()

    assert body["recovered_plan"]["kpis"]["fulfillment_rate"] <= 1.0
    residual = body["residual_unmet"]
    assert isinstance(residual, list)
    if body["recovered_plan"]["kpis"]["unmet"] > 0:
        assert len(residual) > 0
        assert any(a["type"] == "residual_unmet" for a in body["recovery_actions"])


def test_compare_reports_deltas_and_narrative(client, baseline):
    scen = client.post(
        "/api/v1/scenarios",
        json={"baseline_plan_id": baseline["id"], "disruption": {"type": "route_closure", "params": {"route_id": "RT-03"}}},
    ).json()
    sid = scen["scenario"]["id"]
    client.post(f"/api/v1/scenarios/{sid}/recover")

    res = client.get(f"/api/v1/scenarios/{sid}/compare")
    assert res.status_code == 200, res.text
    body = res.json()

    assert set(body["deltas"]).issuperset({"disrupted_vs_baseline", "recovered_vs_disrupted", "recovered_vs_baseline"})
    assert body["deltas"]["disrupted_vs_baseline"]["unmet_delta"] > 0
    assert "fulfillment" in body["tradeoff_narrative"].lower()
    assert body["delivery_risk"] is not None


def test_export_matches_computed_plan(client, baseline):
    scen = client.post(
        "/api/v1/scenarios",
        json={
            "baseline_plan_id": baseline["id"],
            "disruption": {
                "type": "inventory_shortage",
                "params": {"warehouse_id": "WH-02", "product_id": "PRD-A", "reduction_pct": 30},
            },
        },
    ).json()
    sid = scen["scenario"]["id"]
    client.post(f"/api/v1/scenarios/{sid}/recover")

    res = client.get(f"/api/v1/scenarios/{sid}/export")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment" in res.headers["content-disposition"]

    rows = list(csv.reader(io.StringIO(res.text)))
    flat = [c for row in rows for c in row]
    assert any("Allocations" in c for c in flat)
    assert any("KPIs" in c for c in flat)

    header = ["warehouse_id", "destination_id", "product_id", "route_id", "quantity"]
    assert header in rows

    # Split the CSV into plan sections and verify each one independently
    sections: dict[str, list[float]] = {}
    current: str | None = None
    for row in rows:
        if row and row[0].startswith("Plan:"):
            current = row[0].split("(")[-1].rstrip(")").strip()
            sections.setdefault(current, [])
            continue
        if current and len(row) >= 5 and row[0].startswith("WH-"):
            sections[current].append(float(row[4]))

    assert {"baseline", "disrupted", "recovered"}.issubset(sections.keys())
    for plan_type, qtys in sections.items():
        assert qtys, f"no allocation rows exported for {plan_type}"
        assert all(q > 0 for q in qtys), f"{plan_type} contains a non-positive quantity"

    # The exported baseline must reproduce the computed baseline exactly
    baseline_total = sum(float(a["quantity"]) for a in baseline["allocations"])
    assert sum(sections["baseline"]) == pytest.approx(baseline_total, abs=1e-6)
    # And the exported disrupted plan must reproduce the disrupted plan exactly
    disrupted_total = sum(float(a["quantity"]) for a in scen["disrupted_plan"]["allocations"])
    assert sum(sections["disrupted"]) == pytest.approx(disrupted_total, abs=1e-6)


def test_invalid_disruption_is_rejected(client, baseline):
    res = client.post(
        "/api/v1/scenarios",
        json={"baseline_plan_id": baseline["id"], "disruption": {"type": "route_closure", "params": {}}},
    )
    assert res.status_code in {400, 422}

    res2 = client.post(
        "/api/v1/scenarios",
        json={
            "baseline_plan_id": baseline["id"],
            "disruption": {"type": "inventory_shortage", "params": {"warehouse_id": "WH-02", "product_id": "PRD-A", "reduction_pct": 250}},
        },
    )
    assert res2.status_code in {400, 422}


def test_unknown_plan_and_scenario_return_404(client):
    assert client.get("/api/v1/plans/does-not-exist").status_code == 404
    assert client.get("/api/v1/scenarios/does-not-exist").status_code == 404
    assert client.post("/api/v1/scenarios/nope/recover").status_code == 404


def test_plan_creation_is_reproducible(client, dataset):
    a = client.post("/api/v1/plans", json={"dataset_id": dataset["dataset_id"]}).json()
    b = client.post("/api/v1/plans", json={"dataset_id": dataset["dataset_id"]}).json()

    key = lambda alloc: sorted(
        (x["warehouse_id"], x["destination_id"], x["product_id"], x["route_id"], round(float(x["quantity"]), 4))
        for x in alloc
    )
    assert key(a["allocations"]) == key(b["allocations"])
    assert a["kpis"]["total_cost"] == pytest.approx(b["kpis"]["total_cost"])


def test_disruption_does_not_mutate_baseline(client, baseline):
    before = client.get(f"/api/v1/plans/{baseline['id']}").json()

    client.post(
        "/api/v1/scenarios",
        json={
            "baseline_plan_id": baseline["id"],
            "disruption": {"type": "inventory_shortage", "params": {"warehouse_id": "WH-02", "product_id": "PRD-A", "reduction_pct": 90}},
        },
    )

    after = client.get(f"/api/v1/plans/{baseline['id']}").json()
    assert after["kpis"] == before["kpis"]
    assert after["allocations"] == before["allocations"]


def test_validation_flags_broken_references(client):
    """Import a dataset whose demand references a destination that does not exist."""
    files = {
        "warehouses": ("warehouses.csv", "id,name,region\nWH-01,Hub,Midwest\n", "text/csv"),
        "destinations": ("destinations.csv", "id,name,priority,region\nDST-01,Clinic,1,North\n", "text/csv"),
        "products": ("products.csv", "id,name,unit\nPRD-A,Sensor,units\n", "text/csv"),
        "routes": (
            "routes.csv",
            "id,warehouse_id,destination_id,capacity,cost_per_unit,time_days,available,product_ids,backup\n"
            "RT-01,WH-01,DST-01,100,2,1,true,,false\n",
            "text/csv",
        ),
        "inventory": ("inventory.csv", "warehouse_id,product_id,quantity\nWH-01,PRD-A,50\n", "text/csv"),
        # DST-99 does not exist -> referential integrity violation
        "demand": ("demand.csv", "destination_id,product_id,quantity\nDST-99,PRD-A,10\n", "text/csv"),
    }
    res = client.post("/api/v1/datasets/import", files=files)
    assert res.status_code == 200, res.text
    report = res.json()["validation_report"]

    assert report["valid"] is False
    assert len(report["issues"]) > 0
    assert any("DST-99" in i["message"] or "destination" in i["message"].lower() for i in report["issues"])


def test_lists_expose_recent_plans_and_scenarios(client, baseline):
    plans = client.get("/api/v1/plans/").json()
    assert plans["total"] >= 1
    assert any(p["id"] == baseline["id"] for p in plans["plans"])

    scen = client.post(
        "/api/v1/scenarios",
        json={"baseline_plan_id": baseline["id"], "disruption": {"type": "route_closure", "params": {"route_id": "RT-03"}}},
    ).json()
    scenarios = client.get("/api/v1/scenarios/").json()
    assert any(s["id"] == scen["scenario"]["id"] for s in scenarios["scenarios"])
    assert scenarios["scenarios"][0]["disruption"]["type"] == "route_closure"


def test_kpis_are_internally_consistent(baseline):
    k = baseline["kpis"]
    assert k["fulfilled"] == pytest.approx(k["total_demand"] - k["unmet"], abs=1e-6)
    assert k["fulfillment_rate"] == pytest.approx(k["fulfilled"] / k["total_demand"], abs=1e-6)
    assert 0.0 <= k["wh_utilization"] <= 1.0
    assert 0.0 <= k["route_utilization"] <= 1.0
    assert 0.0 <= k["risk_score"] <= 100.0
    assert k["risk_breakdown"]["total_risk_score"] == pytest.approx(k["risk_score"], abs=0.01)
