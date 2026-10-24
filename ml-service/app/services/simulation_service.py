"""
Phase 3 — What-If Scenario Simulation Engine
Provides Monte-Carlo-style perturbation of supply/demand parameters
and re-runs the PuLP MILP solver to produce projected scenario outcomes.
"""
import time
import copy
import numpy as np
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.services.optimization_service import solve_allocation_optimization
from app.schemas import OptimizationRequest, StoreDemandTarget, WarehouseSourceStock, BatchCandidate


# ─── Simulation Schemas ──────────────────────────────────────────────
class ScenarioParameter(BaseModel):
    """A single perturbation applied to a scenario."""
    param_type: str = Field(..., description="Type: demand_multiplier | supply_reduction | lead_time_change | batch_expiry_shift")
    target_scope: str = Field("ALL", description="ALL | specific product_id or store_id")
    value: float = Field(..., description="Multiplier or absolute change value")
    label: Optional[str] = None

class ScenarioRequest(BaseModel):
    """Request to simulate a What-If scenario."""
    scenario_name: str = "Custom Scenario"
    description: str = ""
    parameters: List[ScenarioParameter]
    # Base data (current real state)
    stores: List[StoreDemandTarget]
    warehouses: List[WarehouseSourceStock]
    batches: List[BatchCandidate] = []
    transport_cost_per_unit: float = 0.15

class ScenarioOutcome(BaseModel):
    scenario_name: str
    description: str
    parameters_applied: List[Dict[str, Any]]
    total_recommendations: int
    total_allocated_units: int
    unmet_demand_units: int
    stockout_mitigation_pct: float
    expiry_units_saved: int
    estimated_transport_cost: float
    solver_status: str
    execution_time_ms: int

class ScenarioComparisonResponse(BaseModel):
    baseline: ScenarioOutcome
    scenario: ScenarioOutcome
    delta: Dict[str, Any]
    risk_assessment: str
    recommendation: str


# ─── Core Simulation Logic ───────────────────────────────────────────
def apply_perturbations(
    stores: List[StoreDemandTarget],
    warehouses: List[WarehouseSourceStock],
    batches: List[BatchCandidate],
    parameters: List[ScenarioParameter]
) -> tuple:
    """
    Apply perturbation parameters to produce a modified scenario.
    Returns (modified_stores, modified_warehouses, modified_batches).
    """
    mod_stores = []
    for s in stores:
        ms = StoreDemandTarget(
            store_id=s.store_id,
            store_name=s.store_name,
            product_id=s.product_id,
            product_name=s.product_name,
            replenishment_need=s.replenishment_need,
            priority=s.priority
        )
        mod_stores.append(ms)

    mod_warehouses = []
    for w in warehouses:
        mw = WarehouseSourceStock(
            warehouse_id=w.warehouse_id,
            warehouse_name=w.warehouse_name,
            product_id=w.product_id,
            available_quantity=w.available_quantity
        )
        mod_warehouses.append(mw)

    mod_batches = []
    for b in batches:
        mb = BatchCandidate(
            batch_id=b.batch_id,
            batch_number=b.batch_number,
            warehouse_id=b.warehouse_id,
            product_id=b.product_id,
            quantity=b.quantity,
            days_until_expiry=b.days_until_expiry
        )
        mod_batches.append(mb)

    for param in parameters:
        scope = str(param.target_scope).upper()

        if param.param_type == "demand_multiplier":
            # Multiply store replenishment needs by a factor
            for ms in mod_stores:
                if scope == "ALL" or str(ms.product_id) == scope or str(ms.store_id) == scope:
                    ms.replenishment_need = max(0, round(ms.replenishment_need * param.value))

        elif param.param_type == "supply_reduction":
            # Reduce warehouse available quantity by percentage (value: 0.7 means 30% reduction)
            for mw in mod_warehouses:
                if scope == "ALL" or str(mw.product_id) == scope or str(mw.warehouse_id) == scope:
                    mw.available_quantity = max(0, round(mw.available_quantity * param.value))

        elif param.param_type == "lead_time_change":
            # Simulate lead time increase by bumping up demand proportionally
            lead_time_factor = max(1.0, param.value)
            for ms in mod_stores:
                if scope == "ALL" or str(ms.store_id) == scope:
                    ms.replenishment_need = max(0, round(ms.replenishment_need * lead_time_factor))

        elif param.param_type == "batch_expiry_shift":
            # Shift batch expiry dates (negative = closer to expiry)
            shift_days = int(param.value)
            for mb in mod_batches:
                if scope == "ALL" or str(mb.warehouse_id) == scope or str(mb.product_id) == scope:
                    mb.days_until_expiry = max(0, mb.days_until_expiry + shift_days)

        elif param.param_type == "priority_escalation":
            # Escalate store priorities (e.g., all MEDIUM become HIGH)
            priority_map = {"LOW": "MEDIUM", "MEDIUM": "HIGH", "HIGH": "CRITICAL"}
            for ms in mod_stores:
                if scope == "ALL" or str(ms.store_id) == scope:
                    ms.priority = priority_map.get(ms.priority.upper(), ms.priority)

    return mod_stores, mod_warehouses, mod_batches


def run_scenario_simulation(req: ScenarioRequest) -> ScenarioComparisonResponse:
    """
    Executes a complete What-If simulation:
    1. Run PuLP optimization on current (baseline) data
    2. Apply perturbations to produce scenario data
    3. Run PuLP optimization on scenario data
    4. Compare and produce delta analysis
    """
    start_time = time.time()

    # 1. Baseline optimization (current real state)
    baseline_req = OptimizationRequest(
        stores=req.stores,
        warehouses=req.warehouses,
        batches=req.batches,
        transport_cost_per_unit=req.transport_cost_per_unit
    )
    baseline_result = solve_allocation_optimization(baseline_req)

    baseline_transport = sum(a.transport_cost for a in baseline_result.allocations)
    baseline_outcome = ScenarioOutcome(
        scenario_name="Current State (Baseline)",
        description="Optimization using current real inventory positions and demand forecasts.",
        parameters_applied=[],
        total_recommendations=baseline_result.total_recommendations,
        total_allocated_units=baseline_result.total_allocated_units,
        unmet_demand_units=baseline_result.unmet_demand_units,
        stockout_mitigation_pct=baseline_result.stockout_mitigation_pct,
        expiry_units_saved=baseline_result.expiry_units_saved,
        estimated_transport_cost=round(baseline_transport, 2),
        solver_status=baseline_result.status,
        execution_time_ms=baseline_result.execution_time_ms
    )

    # 2. Apply perturbations
    mod_stores, mod_warehouses, mod_batches = apply_perturbations(
        req.stores, req.warehouses, req.batches, req.parameters
    )

    # 3. Scenario optimization
    scenario_req = OptimizationRequest(
        stores=mod_stores,
        warehouses=mod_warehouses,
        batches=mod_batches,
        transport_cost_per_unit=req.transport_cost_per_unit
    )
    scenario_result = solve_allocation_optimization(scenario_req)

    scenario_transport = sum(a.transport_cost for a in scenario_result.allocations)
    params_applied = [
        {"type": p.param_type, "scope": p.target_scope, "value": p.value, "label": p.label or p.param_type}
        for p in req.parameters
    ]
    scenario_outcome = ScenarioOutcome(
        scenario_name=req.scenario_name,
        description=req.description,
        parameters_applied=params_applied,
        total_recommendations=scenario_result.total_recommendations,
        total_allocated_units=scenario_result.total_allocated_units,
        unmet_demand_units=scenario_result.unmet_demand_units,
        stockout_mitigation_pct=scenario_result.stockout_mitigation_pct,
        expiry_units_saved=scenario_result.expiry_units_saved,
        estimated_transport_cost=round(scenario_transport, 2),
        solver_status=scenario_result.status,
        execution_time_ms=scenario_result.execution_time_ms
    )

    # 4. Delta Analysis
    alloc_delta = scenario_result.total_allocated_units - baseline_result.total_allocated_units
    unmet_delta = scenario_result.unmet_demand_units - baseline_result.unmet_demand_units
    mitigation_delta = round(scenario_result.stockout_mitigation_pct - baseline_result.stockout_mitigation_pct, 1)
    expiry_delta = scenario_result.expiry_units_saved - baseline_result.expiry_units_saved
    cost_delta = round(scenario_transport - baseline_transport, 2)

    delta = {
        "allocated_units_change": alloc_delta,
        "unmet_demand_change": unmet_delta,
        "stockout_mitigation_change_pct": mitigation_delta,
        "expiry_units_saved_change": expiry_delta,
        "transport_cost_change": cost_delta,
    }

    # 5. Risk Assessment
    if unmet_delta > 50 or mitigation_delta < -20:
        risk = "HIGH — This scenario significantly increases unmet demand and stockout exposure."
        rec = "Consider pre-positioning additional safety stock or engaging backup suppliers before this scenario materializes."
    elif unmet_delta > 20 or mitigation_delta < -10:
        risk = "MEDIUM — Moderate increase in supply chain pressure. Manageable with proactive adjustments."
        rec = "Monitor closely and prepare contingency allocations for the most affected stores."
    elif unmet_delta <= 0 and mitigation_delta >= 0:
        risk = "LOW — This scenario maintains or improves current service levels."
        rec = "Current supply chain is resilient against this scenario. No immediate action required."
    else:
        risk = "LOW-MEDIUM — Minor disruption potential. Existing buffers should absorb the impact."
        rec = "Continue regular monitoring. Slight safety stock adjustment recommended for critical products."

    elapsed_ms = int((time.time() - start_time) * 1000)

    return ScenarioComparisonResponse(
        baseline=baseline_outcome,
        scenario=scenario_outcome,
        delta=delta,
        risk_assessment=risk,
        recommendation=rec
    )
