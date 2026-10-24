from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, ConfigDict


# ---------------------------------------------------------------------------
# Base entities
# ---------------------------------------------------------------------------

class Warehouse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(..., description="Unique warehouse identifier")
    name: str = Field(..., description="Display name of the warehouse")
    region: str = Field(..., description="Geographic region of the warehouse")
    lat: Optional[float] = Field(default=None, description="Latitude")
    lng: Optional[float] = Field(default=None, description="Longitude")


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(..., description="Unique product identifier")
    name: str = Field(..., description="Display name of the product")
    unit: str = Field(..., description="Unit of measure, e.g. kg, units, pallets")
    weight_kg: Optional[float] = Field(default=None, ge=0, description="Weight in kilograms per unit")


class Destination(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(..., description="Unique destination identifier")
    name: str = Field(..., description="Display name of the destination")
    priority: int = Field(..., ge=1, le=5, description="Priority 1 (lowest) - 5 (highest)")
    region: str = Field(..., description="Geographic region of the destination")
    deadline_days: Optional[int] = Field(default=None, ge=0, description="Deadline in days from plan start")


class Route(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(..., description="Unique route identifier")
    warehouse_id: str = Field(..., description="Origin warehouse id")
    destination_id: str = Field(..., description="Target destination id")
    capacity: float = Field(..., ge=0, description="Maximum throughput capacity")
    cost_per_unit: float = Field(..., ge=0, description="Cost per unit shipped on this route")
    time_days: float = Field(..., ge=0, description="Transit time in days")
    available: bool = Field(default=True, description="Whether the route is currently available")
    product_ids: Optional[List[str]] = Field(default=None, description="Product ids allowed on this route; null means all products")
    backup: bool = Field(
        default=False,
        description="Contingency lane: dormant in baseline/disrupted planning, activatable only by recovery at its premium cost",
    )


class Inventory(BaseModel):
    model_config = ConfigDict(extra="ignore")

    warehouse_id: str = Field(..., description="Warehouse holding the inventory")
    product_id: str = Field(..., description="Product identifier")
    quantity: float = Field(..., ge=0, description="Available quantity")


class Demand(BaseModel):
    model_config = ConfigDict(extra="ignore")

    destination_id: str = Field(..., description="Destination requesting the product")
    product_id: str = Field(..., description="Product identifier")
    quantity: float = Field(..., ge=0, description="Requested quantity")


# ---------------------------------------------------------------------------
# Allocation
# ---------------------------------------------------------------------------

class AllocationItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    warehouse_id: str = Field(..., description="Source warehouse")
    destination_id: str = Field(..., description="Target destination")
    product_id: str = Field(..., description="Product identifier")
    route_id: str = Field(..., description="Route used for the allocation")
    quantity: float = Field(..., ge=0, description="Allocated quantity")


class UnmetDemand(BaseModel):
    model_config = ConfigDict(extra="ignore")

    destination_id: str = Field(..., description="Destination with unmet demand")
    product_id: str = Field(..., description="Product identifier")
    quantity: float = Field(..., ge=0, description="Unmet quantity")
    priority: int = Field(..., ge=1, le=5, description="Priority of the destination")


# ---------------------------------------------------------------------------
# KPI & Validation
# ---------------------------------------------------------------------------

class KPISnapshot(BaseModel):
    model_config = ConfigDict(extra="ignore")

    total_inventory: float = Field(..., ge=0, description="Sum of all inventory quantities")
    total_demand: float = Field(..., ge=0, description="Sum of all demand quantities")
    fulfilled: float = Field(..., ge=0, description="Total fulfilled quantity")
    fulfillment_rate: float = Field(..., ge=0, le=1, description="fulfilled / total_demand (0-1)")
    unmet: float = Field(..., ge=0, description="Total unmet quantity")
    total_cost: float = Field(..., ge=0, description="Total allocation cost")
    wh_utilization: float = Field(..., ge=0, le=1, description="Warehouse capacity utilization 0-1")
    route_utilization: float = Field(..., ge=0, le=1, description="Route capacity utilization 0-1")
    at_risk_destinations: int = Field(..., ge=0, description="Number of destinations at risk")
    risk_score: float = Field(..., ge=0, description="Aggregate risk score")
    risk_breakdown: Dict[str, Any] = Field(default_factory=dict, description="Breakdown of risk by category")


class ValidationIssue(BaseModel):
    model_config = ConfigDict(extra="ignore")

    row: Optional[int] = Field(default=None, ge=0, description="Row number in source file, if applicable")
    field: Optional[str] = Field(default=None, description="Field or column name related to the issue")
    message: str = Field(..., description="Human-readable description of the issue")
    severity: str = Field(..., description="Severity level, e.g. error, warning, info")


class ValidationReport(BaseModel):
    model_config = ConfigDict(extra="ignore")

    valid: bool = Field(..., description="Whether the dataset passed all critical validations")
    issues: List[ValidationIssue] = Field(default_factory=list, description="List of validation issues found")
    summary: Dict[str, Any] = Field(default_factory=dict, description="Summary counts by severity / category")


# ---------------------------------------------------------------------------
# Allocation engine I/O
# ---------------------------------------------------------------------------

class AllocationInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    inventory: List[Inventory] = Field(default_factory=list, description="Available inventory per warehouse/product")
    demand: List[Demand] = Field(default_factory=list, description="Demand per destination/product")
    routes: List[Route] = Field(default_factory=list, description="Available routes")
    priorities: Dict[str, int] = Field(default_factory=dict, description="Destination id -> priority override (1-5)")
    allow_partial: bool = Field(default=True, description="Whether partial fulfillment is allowed")
    penalty_unmet: float = Field(default=1000.0, ge=0, description="Penalty cost per unit of unmet demand")


class AllocationResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    allocations: List[AllocationItem] = Field(default_factory=list, description="Successful allocations")
    unmet: List[UnmetDemand] = Field(default_factory=list, description="Remaining unmet demand")
    total_cost: float = Field(..., ge=0, description="Total cost including penalties if applicable")
    fulfillment_rate: float = Field(..., ge=0, le=1, description="Overall fulfillment rate 0-1")
    utilization: Dict[str, Any] = Field(default_factory=dict, description="Utilization metrics by warehouse / route")
    status: str = Field(..., description="Solver status, e.g. optimal, feasible, infeasible")
    solver: str = Field(..., description="Solver name used, e.g. greedy, ortools")
    diagnostics: Dict[str, Any] = Field(default_factory=dict, description="Solver diagnostics and timing info")
    violations: List[str] = Field(default_factory=list, description="Constraint violations if any")


# ---------------------------------------------------------------------------
# Disruption modelling
# ---------------------------------------------------------------------------

class InventoryShortageParams(BaseModel):
    model_config = ConfigDict(extra="ignore")

    warehouse_id: str = Field(..., description="Warehouse affected by shortage")
    product_id: str = Field(..., description="Product affected by shortage")
    reduction_pct: float = Field(..., ge=0, le=100, description="Percentage reduction 0-100")


class RouteClosureParams(BaseModel):
    model_config = ConfigDict(extra="ignore")

    route_id: str = Field(..., description="Route to close")


class RouteDelayParams(BaseModel):
    model_config = ConfigDict(extra="ignore")

    route_id: str = Field(..., description="Route to delay")
    extra_days: float = Field(..., ge=0, description="Additional transit days")


class SupplyInterruptionParams(BaseModel):
    model_config = ConfigDict(extra="ignore")

    warehouse_id: str = Field(..., description="Warehouse whose supply is interrupted")
    product_id: str = Field(..., description="Product whose supply is interrupted")


class DisruptionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: str = Field(
        ...,
        description="Disruption type: inventory_shortage | route_closure | route_delay | supply_interruption",
    )
    params: Dict[str, Any] = Field(default_factory=dict, description="Parameters specific to the disruption type")


class ScenarioCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    baseline_plan_id: str = Field(..., description="Id of the baseline plan to branch from")
    disruption: DisruptionRequest = Field(..., description="Disruption to apply")


# ---------------------------------------------------------------------------
# Plan & comparison responses
# ---------------------------------------------------------------------------

class PlanResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(..., description="Plan identifier")
    dataset_id: str = Field(..., description="Dataset this plan belongs to")
    type: str = Field(..., description="Plan type: baseline | disrupted | recovered")
    status: str = Field(..., description="Plan status, e.g. completed, pending, failed")
    solver: str = Field(..., description="Solver used for this plan")
    created_at: str = Field(..., description="ISO-8601 creation timestamp")
    allocations: List[Any] = Field(default_factory=list, description="Allocation items (AllocationItem dicts)")
    unmet: List[Any] = Field(default_factory=list, description="Unmet demand items (UnmetDemand dicts)")
    kpis: KPISnapshot = Field(..., description="KPI snapshot for this plan")


class CompareResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    baseline: Dict[str, Any] = Field(..., description="Baseline plan summary / KPIs")
    disrupted: Dict[str, Any] = Field(..., description="Disrupted plan summary / KPIs")
    recovered: Optional[Dict[str, Any]] = Field(default=None, description="Recovered plan summary / KPIs if available")
    deltas: Dict[str, Any] = Field(default_factory=dict, description="Delta metrics between plans")
    tradeoff_narrative: str = Field(..., description="Human-readable tradeoff narrative")
