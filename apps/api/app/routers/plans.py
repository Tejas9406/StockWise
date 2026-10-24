from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.domain.schemas import AllocationInput, Demand, Inventory, Route
from app.repo import database as db
from app.services.allocation import solve_allocation
from app.services.kpi import compute_delivery_risk, compute_kpis
from app.services.normalize import build_network, load_destinations

router = APIRouter(prefix="/api/v1/plans", tags=["plans"])


class PlanCreateRequest(BaseModel):
    dataset_id: str
    solver: Optional[str] = None


def _build_allocation_input(meta: Dict[str, Any], solver_override: Optional[str] = None) -> AllocationInput:
    inventory, demand, routes, priorities = build_network(meta)

    if solver_override:
        from app.core.config import settings

        if solver_override not in ("greedy", "ortools", "auto"):
            raise HTTPException(status_code=400, detail=f"Invalid solver '{solver_override}'; allowed greedy, ortools, auto")
        original = settings.solver
        settings.solver = solver_override
        try:
            inp = AllocationInput(inventory=inventory, demand=demand, routes=routes, priorities=priorities)
        finally:
            pass
        inp._solver_override_original = original  # type: ignore
    else:
        inp = AllocationInput(inventory=inventory, demand=demand, routes=routes, priorities=priorities)

    return inp


@router.post("/")
def create_plan(body: PlanCreateRequest):
    ds = db.get_dataset(body.dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail=f"Dataset {body.dataset_id} not found")
    meta = ds.get("meta", {})

    allocation_input = _build_allocation_input(meta, body.solver)

    # Solve
    from app.core.config import settings as cfg_settings

    original_solver = None
    if hasattr(allocation_input, "_solver_override_original"):
        original_solver = getattr(allocation_input, "_solver_override_original")
        # allocation_input currently has solver overridden via settings already
        try:
            result = solve_allocation(allocation_input)
        finally:
            cfg_settings.solver = original_solver
            # clean attr
            try:
                delattr(allocation_input, "_solver_override_original")
            except Exception:
                pass
    else:
        result = solve_allocation(allocation_input)

    # Compute KPIs
    kpi = compute_kpis(result, allocation_input.inventory, allocation_input.demand, allocation_input.routes)
    delivery_risk = compute_delivery_risk(
        result.allocations, allocation_input.routes, load_destinations(meta)
    )

    plan_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    solver_used = result.solver

    # Prepare data to save: allocations, unmet, kpis, diagnostics, utilization etc.
    data = {
        "allocations": [a.model_dump() if hasattr(a, "model_dump") else dict(a) for a in result.allocations],
        "unmet": [u.model_dump() if hasattr(u, "model_dump") else dict(u) for u in result.unmet],
        "kpis": kpi.model_dump() if hasattr(kpi, "model_dump") else dict(kpi),
        "diagnostics": result.diagnostics,
        "utilization": result.utilization,
        "fulfillment_rate": result.fulfillment_rate,
        "total_cost": result.total_cost,
        "status_detail": result.status,
        "violations": result.violations,
        "delivery_risk": delivery_risk,
    }

    try:
        db.save_plan(plan_id, body.dataset_id, type="baseline", status="completed", solver=solver_used, created_at=created_at, data=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save plan: {e}")

    return {
        "id": plan_id,
        "dataset_id": body.dataset_id,
        "type": "baseline",
        "status": "completed",
        "solver": solver_used,
        "created_at": created_at,
        "allocations": data["allocations"],
        "unmet": data["unmet"],
        "kpis": data["kpis"],
        "diagnostics": data["diagnostics"],
    }


@router.get("/")
def list_plans(limit: int = 25, plan_type: Optional[str] = None):
    """Recent plans, newest first — powers plan pickers in the UI."""
    conn_rows: List[Dict[str, Any]] = []
    try:
        import sqlite3

        from app.repo.database import _connect

        conn = _connect()
        try:
            cur = conn.execute(
                "SELECT id, dataset_id, type, status, solver, created_at, data FROM plans ORDER BY created_at DESC LIMIT ?",
                (max(1, min(limit, 100)),),
            )
            for row in cur.fetchall():
                data = json.loads(row["data"]) if row["data"] else {}
                conn_rows.append(
                    {
                        "id": row["id"],
                        "dataset_id": row["dataset_id"],
                        "type": row["type"],
                        "status": row["status"],
                        "solver": row["solver"],
                        "created_at": row["created_at"],
                        "kpis": data.get("kpis", {}),
                        "allocation_count": len(data.get("allocations", []) or []),
                        "unmet_count": len(data.get("unmet", []) or []),
                    }
                )
        finally:
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if plan_type:
        conn_rows = [r for r in conn_rows if r["type"] == plan_type]
    return {"plans": conn_rows, "total": len(conn_rows)}


@router.get("/{plan_id}")
def get_plan(plan_id: str):
    plan = db.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan {plan_id} not found")
    data = plan.get("data", {})
    # Return PlanResponse-like
    kpis = data.get("kpis", {})
    return {
        "id": plan["id"],
        "dataset_id": plan["dataset_id"],
        "type": plan["type"],
        "status": plan["status"],
        "solver": plan["solver"],
        "created_at": plan["created_at"],
        "allocations": data.get("allocations", []),
        "unmet": data.get("unmet", []),
        "kpis": kpis,
        "diagnostics": data.get("diagnostics", {}),
        "utilization": data.get("utilization", {}),
        "delivery_risk": data.get("delivery_risk"),
    }
