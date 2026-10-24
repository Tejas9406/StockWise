from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.domain.schemas import AllocationInput, Demand, DisruptionRequest, Inventory, Route, ScenarioCreate
from app.repo import database as db
from app.services.allocation import solve_allocation
from app.services.disruption import apply_disruption
from app.services.kpi import compute_delivery_risk, compute_kpis
from app.services.normalize import build_network, load_destinations
from app.services.recovery import recover_allocation
from app.services.reporting import export_scenario_csv

router = APIRouter(prefix="/api/v1/scenarios", tags=["scenarios"])


def _load_dataset_inventory_routes(dataset_meta: Dict[str, Any]):
    inventory, demand, routes, priorities = build_network(dataset_meta)
    return inventory, demand, routes, priorities


def _load_destinations(dataset_meta: Dict[str, Any]) -> List[Dict[str, Any]]:
    return load_destinations(dataset_meta)


def _scenario_summary(scen: Dict[str, Any]) -> Dict[str, Any]:
    """Compact scenario row for lists / dashboard recency panels."""
    baseline_plan = db.get_plan(scen["baseline_plan_id"]) if scen.get("baseline_plan_id") else None
    disrupted_plan = db.get_plan(scen["disrupted_plan_id"]) if scen.get("disrupted_plan_id") else None
    recovered_plan = db.get_plan(scen["recovered_plan_id"]) if scen.get("recovered_plan_id") else None

    def kpis(plan):
        return (plan or {}).get("data", {}).get("kpis")

    return {
        "id": scen["id"],
        "status": scen.get("status"),
        "created_at": scen.get("created_at"),
        "baseline_plan_id": scen.get("baseline_plan_id"),
        "disrupted_plan_id": scen.get("disrupted_plan_id"),
        "recovered_plan_id": scen.get("recovered_plan_id"),
        "disruption": scen.get("disruption"),
        "kpis": {
            "baseline": kpis(baseline_plan),
            "disrupted": kpis(disrupted_plan),
            "recovered": kpis(recovered_plan),
        },
    }


@router.get("/")
def list_scenarios(limit: int = 25):
    """Recent scenarios, newest first — powers the dashboard and scenario pickers."""
    try:
        scenarios = db.list_scenarios()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    limit = max(1, min(limit, 100))
    return {"scenarios": [_scenario_summary(s) for s in scenarios[:limit]], "total": len(scenarios)}


@router.post("/")
def create_scenario(body: ScenarioCreate):
    baseline_plan = db.get_plan(body.baseline_plan_id)
    if not baseline_plan:
        raise HTTPException(status_code=404, detail=f"Baseline plan {body.baseline_plan_id} not found")

    dataset_id = baseline_plan["dataset_id"]
    ds = db.get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} for baseline plan not found")

    meta = ds.get("meta", {})
    inventory, demand, routes, priorities = _load_dataset_inventory_routes(meta)

    # Validate disruption
    disruption = body.disruption
    # disruption is already a DisruptionRequest (pydantic)
    # Apply disruption
    try:
        new_inventory, new_routes, description = apply_disruption(inventory, routes, disruption)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Disruption failed: {e}")

    disrupted_input = AllocationInput(inventory=new_inventory, demand=demand, routes=new_routes, priorities=priorities)
    disrupted_result = solve_allocation(disrupted_input)
    disrupted_kpi = compute_kpis(disrupted_result, new_inventory, demand, new_routes)

    baseline_data = baseline_plan.get("data", {})
    destinations = _load_destinations(meta)
    # Delivery risk (deadline vs transit time) — KPI signal, never blocks feasibility
    disrupted_delivery = compute_delivery_risk(disrupted_result.allocations, new_routes, destinations)
    baseline_delivery = compute_delivery_risk(baseline_data.get("allocations", []), routes, destinations)

    # Save disrupted plan
    disrupted_plan_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    disrupted_data = {
        "allocations": [a.model_dump() if hasattr(a, "model_dump") else dict(a) for a in disrupted_result.allocations],
        "unmet": [u.model_dump() if hasattr(u, "model_dump") else dict(u) for u in disrupted_result.unmet],
        "kpis": disrupted_kpi.model_dump() if hasattr(disrupted_kpi, "model_dump") else dict(disrupted_kpi),
        "diagnostics": disrupted_result.diagnostics,
        "utilization": disrupted_result.utilization,
        "fulfillment_rate": disrupted_result.fulfillment_rate,
        "total_cost": disrupted_result.total_cost,
        "status_detail": disrupted_result.status,
        "violations": disrupted_result.violations,
        "disruption_description": description,
        "delivery_risk": disrupted_delivery,
    }
    try:
        db.save_plan(disrupted_plan_id, dataset_id, type="disrupted", status="completed", solver=disrupted_result.solver, created_at=created_at, data=disrupted_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save disrupted plan: {e}")

    # Save scenario
    scenario_id = str(uuid.uuid4())
    disruption_dict = disruption.model_dump() if hasattr(disruption, "model_dump") else dict(disruption)
    try:
        db.save_scenario(scenario_id, body.baseline_plan_id, disruption_dict, disrupted_plan_id, None, status="disrupted", created_at=created_at)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save scenario: {e}")

    # Compute impact deltas vs baseline
    baseline_kpis = baseline_data.get("kpis", {})
    # Normalize baseline kpis dict if KPISnapshot stored
    if isinstance(baseline_kpis, dict):
        base_fulfillment = float(baseline_kpis.get("fulfillment_rate", 0) or 0)
        base_cost = float(baseline_kpis.get("total_cost", baseline_data.get("total_cost", 0)) or 0)
        base_unmet = float(baseline_kpis.get("unmet", 0) or 0)
    else:
        base_fulfillment = 0
        base_cost = 0
        base_unmet = 0

    disrupted_fulfillment = float(disrupted_kpi.fulfillment_rate)
    disrupted_cost = float(disrupted_kpi.total_cost)
    disrupted_unmet = float(disrupted_kpi.unmet)

    impact = {
        "fulfillment_delta": round(disrupted_fulfillment - base_fulfillment, 6),
        "cost_delta": round(disrupted_cost - base_cost, 4),
        "unmet_delta": round(disrupted_unmet - base_unmet, 4),
        "at_risk_units": disrupted_delivery["at_risk_units"],
        "at_risk_delta": round(disrupted_delivery["at_risk_units"] - baseline_delivery["at_risk_units"], 2),
        "max_late_days": disrupted_delivery["max_late_days"],
        "delivery_risk": disrupted_delivery,
        "disruption_description": description,
    }

    return {"scenario": {"id": scenario_id, "baseline_plan_id": body.baseline_plan_id, "disruption": disruption_dict, "disrupted_plan_id": disrupted_plan_id, "status": "disrupted", "created_at": created_at}, "disrupted_plan": {"id": disrupted_plan_id, "dataset_id": dataset_id, "type": "disrupted", "status": "completed", "solver": disrupted_result.solver, "created_at": created_at, "allocations": disrupted_data["allocations"], "unmet": disrupted_data["unmet"], "kpis": disrupted_data["kpis"]}, "impact": impact}


@router.get("/{scenario_id}")
def get_scenario(scenario_id: str):
    scen = db.get_scenario(scenario_id)
    if not scen:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")
    # Fetch plans
    baseline_plan = db.get_plan(scen["baseline_plan_id"]) if scen.get("baseline_plan_id") else None
    disrupted_plan = db.get_plan(scen["disrupted_plan_id"]) if scen.get("disrupted_plan_id") else None
    recovered_plan = db.get_plan(scen["recovered_plan_id"]) if scen.get("recovered_plan_id") else None
    return {"scenario": scen, "baseline_plan": baseline_plan, "disrupted_plan": disrupted_plan, "recovered_plan": recovered_plan}


@router.post("/{scenario_id}/recover")
def recover_scenario(scenario_id: str):
    scen = db.get_scenario(scenario_id)
    if not scen:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")

    disrupted_plan = db.get_plan(scen["disrupted_plan_id"]) if scen.get("disrupted_plan_id") else None
    # If no disrupted_plan, fallback to baseline dataset + disruption replay
    baseline_plan = db.get_plan(scen["baseline_plan_id"])
    if not baseline_plan:
        raise HTTPException(status_code=404, detail=f"Baseline plan {scen['baseline_plan_id']} not found")

    dataset_id = baseline_plan["dataset_id"]
    ds = db.get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found")
    meta = ds.get("meta", {})
    inventory, demand, routes, priorities = _load_dataset_inventory_routes(meta)

    # Re-apply disruption to get the same disrupted inputs (idempotent)
    disruption_dict = scen.get("disruption", {})
    try:
        disruption = DisruptionRequest(**disruption_dict) if isinstance(disruption_dict, dict) else disruption_dict
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid disruption in scenario: {e}")

    try:
        new_inventory, new_routes, description = apply_disruption(inventory, routes, disruption)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    disrupted_input = AllocationInput(inventory=new_inventory, demand=demand, routes=new_routes, priorities=priorities)

    recovered_result = recover_allocation(
        disrupted_input,
        disrupted_allocations=(disrupted_plan or {}).get("data", {}).get("allocations", []),
    )
    recovered_kpi = compute_kpis(recovered_result, new_inventory, demand, new_routes)
    recovered_delivery = compute_delivery_risk(
        recovered_result.allocations, new_routes, _load_destinations(meta)
    )

    recovered_plan_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    recovered_data = {
        "allocations": [a.model_dump() if hasattr(a, "model_dump") else dict(a) for a in recovered_result.allocations],
        "unmet": [u.model_dump() if hasattr(u, "model_dump") else dict(u) for u in recovered_result.unmet],
        "kpis": recovered_kpi.model_dump() if hasattr(recovered_kpi, "model_dump") else dict(recovered_kpi),
        "diagnostics": recovered_result.diagnostics,
        "utilization": recovered_result.utilization,
        "fulfillment_rate": recovered_result.fulfillment_rate,
        "total_cost": recovered_result.total_cost,
        "status_detail": recovered_result.status,
        "violations": recovered_result.violations,
        "delivery_risk": recovered_delivery,
    }
    try:
        db.save_plan(recovered_plan_id, dataset_id, type="recovered", status="completed", solver=recovered_result.solver, created_at=created_at, data=recovered_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save recovered plan: {e}")

    # Update scenario
    try:
        db.update_scenario(scenario_id, {"recovered_plan_id": recovered_plan_id, "status": "recovered"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update scenario: {e}")

    recovery_actions = recovered_result.diagnostics.get("recovery_actions", []) if isinstance(recovered_result.diagnostics, dict) else []
    residual_unmet = recovered_data["unmet"]

    return {"recovered_plan": {"id": recovered_plan_id, "dataset_id": dataset_id, "type": "recovered", "status": "completed", "solver": recovered_result.solver, "created_at": created_at, "allocations": recovered_data["allocations"], "unmet": recovered_data["unmet"], "kpis": recovered_data["kpis"]}, "recovery_actions": recovery_actions, "residual_unmet": residual_unmet}


@router.get("/{scenario_id}/compare")
def compare_scenario(scenario_id: str):
    scen = db.get_scenario(scenario_id)
    if not scen:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")

    baseline_plan = db.get_plan(scen["baseline_plan_id"]) if scen.get("baseline_plan_id") else None
    disrupted_plan = db.get_plan(scen["disrupted_plan_id"]) if scen.get("disrupted_plan_id") else None
    recovered_plan = db.get_plan(scen["recovered_plan_id"]) if scen.get("recovered_plan_id") else None

    if not baseline_plan:
        raise HTTPException(status_code=404, detail="Baseline plan not found for scenario")

    def extract_kpis(plan):
        if not plan:
            return None
        data = plan.get("data", {})
        k = data.get("kpis", {})
        if not k and "fulfillment_rate" in data:
            k = {"fulfillment_rate": data.get("fulfillment_rate"), "total_cost": data.get("total_cost"), "unmet": sum(float(u.get("quantity", 0)) for u in data.get("unmet", []))}
        return k

    baseline_k = extract_kpis(baseline_plan)
    disrupted_k = extract_kpis(disrupted_plan)
    recovered_k = extract_kpis(recovered_plan)

    # Deltas
    deltas: Dict[str, Any] = {}
    try:
        if baseline_k and disrupted_k:
            deltas["disrupted_vs_baseline"] = {
                "fulfillment_delta": round(float(disrupted_k.get("fulfillment_rate", 0) or 0) - float(baseline_k.get("fulfillment_rate", 0) or 0), 6),
                "cost_delta": round(float(disrupted_k.get("total_cost", 0) or 0) - float(baseline_k.get("total_cost", 0) or 0), 4),
                "unmet_delta": round(float(disrupted_k.get("unmet", 0) or 0) - float(baseline_k.get("unmet", 0) or 0), 4),
            }
        if disrupted_k and recovered_k:
            deltas["recovered_vs_disrupted"] = {
                "fulfillment_delta": round(float(recovered_k.get("fulfillment_rate", 0) or 0) - float(disrupted_k.get("fulfillment_rate", 0) or 0), 6),
                "cost_delta": round(float(recovered_k.get("total_cost", 0) or 0) - float(disrupted_k.get("total_cost", 0) or 0), 4),
                "unmet_delta": round(float(recovered_k.get("unmet", 0) or 0) - float(disrupted_k.get("unmet", 0) or 0), 4),
            }
        if baseline_k and recovered_k:
            deltas["recovered_vs_baseline"] = {
                "fulfillment_delta": round(float(recovered_k.get("fulfillment_rate", 0) or 0) - float(baseline_k.get("fulfillment_rate", 0) or 0), 6),
                "cost_delta": round(float(recovered_k.get("total_cost", 0) or 0) - float(baseline_k.get("total_cost", 0) or 0), 4),
                "unmet_delta": round(float(recovered_k.get("unmet", 0) or 0) - float(baseline_k.get("unmet", 0) or 0), 4),
            }
    except Exception:
        pass

    # Narrative
    narrative = ""
    delivery_risk = {
        "baseline": (baseline_plan or {}).get("data", {}).get("delivery_risk"),
        "disrupted": (disrupted_plan or {}).get("data", {}).get("delivery_risk"),
        "recovered": (recovered_plan or {}).get("data", {}).get("delivery_risk"),
    }
    baseline_late = float((delivery_risk["baseline"] or {}).get("at_risk_units", 0) or 0)
    disrupted_late = float((delivery_risk["disrupted"] or {}).get("at_risk_units", 0) or 0)
    max_late = float((delivery_risk["disrupted"] or {}).get("max_late_days", 0) or 0)

    if baseline_k and disrupted_k:
        base_ful = float(baseline_k.get("fulfillment_rate", 0) or 0) * 100
        dis_ful = float(disrupted_k.get("fulfillment_rate", 0) or 0) * 100
        dis_unmet = float(disrupted_k.get("unmet", 0) or 0)
        dis_cost = float(disrupted_k.get("total_cost", 0) or 0)
        if abs(dis_ful - base_ful) < 0.05 and dis_unmet <= 1e-6:
            # Volume was preserved — describe the delay exposure instead of a 0% change
            if disrupted_late > 0:
                narrative = (
                    f"Fulfillment is unchanged at {dis_ful:.1f}%, but {disrupted_late:.0f} units now miss "
                    f"their destination deadline (up to {max_late:.0f} days late; "
                    f"baseline: {baseline_late:.0f} units late) at ${dis_cost:.2f} total cost. "
                )
            else:
                narrative = (
                    f"Fulfillment is unchanged at {dis_ful:.1f}% and no shipment breaches its deadline. "
                    f"Total cost ${dis_cost:.2f}. "
                )
        else:
            narrative = (
                f"Disruption reduced fulfillment from {base_ful:.1f}% to {dis_ful:.1f}%; "
                f"{dis_unmet:.0f} units remain unmet with total cost ${dis_cost:.2f}. "
            )
            if disrupted_late > baseline_late:
                narrative += f"A further {disrupted_late - baseline_late:.0f} units now breach their deadline. "

    if recovered_k and disrupted_k:
        rec_ful = float(recovered_k.get("fulfillment_rate", 0) or 0) * 100
        dis_ful = float(disrupted_k.get("fulfillment_rate", 0) or 0) * 100
        rec_cost = float(recovered_k.get("total_cost", 0) or 0)
        dis_cost = float(disrupted_k.get("total_cost", 0) or 0)
        extra_cost = rec_cost - dis_cost
        rec_unmet = float(recovered_k.get("unmet", 0) or 0)
        restored = rec_ful - dis_ful
        if restored > 0.01:
            narrative += f"Recovery restored {restored:.1f}% fulfillment at ${extra_cost:+.2f} extra cost. "
        elif extra_cost < -0.5:
            narrative += f"Recovery held fulfillment while saving ${abs(extra_cost):.2f} in transport cost. "
        else:
            narrative += f"Recovery could not improve fulfillment (remains {rec_ful:.1f}%) at ${extra_cost:+.2f} extra cost. "
        if rec_unmet > 0:
            narrative += f"{rec_unmet:.0f} units remain unmet. " + _bottleneck_narrative(recovered_plan)
        else:
            narrative += "All demand is now fulfilled."
    elif disrupted_k and not recovered_k:
        narrative += "No recovery has been run yet; run recovery to attempt restoration."
    if not narrative:
        narrative = "Baseline plan ready. Create a disruption scenario to compare impact."

    # Build baseline/disrupted/recovered dicts for CompareResponse
    baseline_out = {"plan_id": scen["baseline_plan_id"], "kpis": baseline_k, "plan": baseline_plan}
    disrupted_out = {"plan_id": scen.get("disrupted_plan_id"), "kpis": disrupted_k, "plan": disrupted_plan} if disrupted_k else None
    recovered_out = {"plan_id": scen.get("recovered_plan_id"), "kpis": recovered_k, "plan": recovered_plan} if recovered_k else None

    return {
        "baseline": baseline_out or {},
        "disrupted": disrupted_out or {},
        "recovered": recovered_out,
        "deltas": deltas,
        "delivery_risk": delivery_risk,
        "tradeoff_narrative": narrative.strip(),
    }


def _bottleneck_narrative(plan) -> str:
    """Explain *why* demand is still unmet, using the residual rows themselves."""
    data = (plan or {}).get("data", {})
    unmet = data.get("unmet", []) or []
    if not unmet:
        return ""
    ranked = sorted(unmet, key=lambda u: float(u.get("quantity", 0) or 0), reverse=True)
    top = ranked[:3]
    parts = [
        f"{u.get('destination_id')}×{u.get('product_id')} is short {float(u.get('quantity', 0) or 0):.0f} units"
        f"{' (priority ' + str(u.get('priority')) + ')' if u.get('priority') is not None else ''}"
        for u in top
    ]
    explanation = (
        "Limiting constraints: combined warehouse inventory and available route capacity "
        "cannot cover these rows. Largest gaps: " + "; ".join(parts) + "."
    )
    if len(ranked) > len(top):
        explanation += f" Plus {len(ranked) - len(top)} smaller gap(s)."
    return explanation


@router.get("/{scenario_id}/export")
def export_scenario_file(scenario_id: str):
    """Download the scenario as CSV — allocations, unmet demand and KPIs, baseline → recovered."""
    scen = db.get_scenario(scenario_id)
    if not scen:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")

    plans = {
        "baseline": db.get_plan(scen["baseline_plan_id"]) if scen.get("baseline_plan_id") else None,
        "disrupted": db.get_plan(scen["disrupted_plan_id"]) if scen.get("disrupted_plan_id") else None,
        "recovered": db.get_plan(scen["recovered_plan_id"]) if scen.get("recovered_plan_id") else None,
    }
    ordered = [p for p in plans.values() if p]
    if not ordered:
        raise HTTPException(status_code=404, detail="No plans found for this scenario")

    try:
        payload = export_scenario_csv(scen, ordered)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {e}")

    filename = f"pre-mortem-scenario-{scenario_id[:8]}.csv"
    return Response(
        content=payload,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
