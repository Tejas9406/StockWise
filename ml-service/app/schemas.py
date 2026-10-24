from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SalesDataPoint(BaseModel):
    date: str
    quantity: float

class ForecastRequest(BaseModel):
    history: List[SalesDataPoint]
    window_days: int = 7
    horizon_days: int = 7
    safety_days: int = 2
    product_name: Optional[str] = "Product"
    store_name: Optional[str] = "Store"

class MetricsEvaluation(BaseModel):
    mae: float
    rmse: float
    wape: float
    baseline_wape: float
    interpretation: str
    evaluated: bool = True
    reason: Optional[str] = None

class ForecastResponse(BaseModel):
    baseline_daily: float
    baseline_horizon: float
    ml_daily: float
    ml_horizon: float
    safety_buffer: float
    replenishment_need_baseline: float
    replenishment_need_ml: float
    metrics: MetricsEvaluation
    daily_predictions: List[Dict[str, Any]]
    model_version: str = "v2.1-ensemble"
    method_used: str

class RiskAssessmentRequest(BaseModel):
    current_stock: float
    forecast_daily: float
    forecast_horizon_demand: float
    sales_velocity: float
    sales_std: float = 0.0
    lead_time_days: float = 2.0
    min_safety_stock: float = 20.0
    reorder_point: float = 50.0

class RiskAssessmentResponse(BaseModel):
    coverage_days: float
    stockout_risk_score: float
    stockout_severity: str
    stockout_message: str
    excess_quantity: float
    excess_severity: str
    excess_message: str

class BatchItem(BaseModel):
    id: int
    batch_number: str
    quantity: float
    days_until_expiry: int
    warehouse_id: Optional[int] = None
    store_id: Optional[int] = None

class ExpiryEvaluationRequest(BaseModel):
    batches: List[BatchItem]
    store_daily_demand: float

class EvaluatedBatch(BaseModel):
    id: int
    batch_number: str
    quantity: float
    days_until_expiry: int
    expected_sell_through: float
    potential_expiry_exposure: float
    expiry_risk_score: float
    feasible_at_destination: bool
    warning: Optional[str] = None

class ExpiryEvaluationResponse(BaseModel):
    batches: List[EvaluatedBatch]
    total_batch_quantity: float
    total_expiry_exposure: float
    recommended_fefo_batch: Optional[EvaluatedBatch] = None

class StoreDemandTarget(BaseModel):
    store_id: int
    store_name: str
    product_id: int
    product_name: str
    replenishment_need: float
    priority: str = "MEDIUM"

class WarehouseSourceStock(BaseModel):
    warehouse_id: int
    warehouse_name: str
    product_id: int
    available_quantity: float

class BatchCandidate(BaseModel):
    batch_id: int
    batch_number: str
    warehouse_id: int
    product_id: int
    quantity: float
    days_until_expiry: int

class OptimizationRequest(BaseModel):
    stores: List[StoreDemandTarget]
    warehouses: List[WarehouseSourceStock]
    batches: List[BatchCandidate] = []
    transport_cost_per_unit: float = 0.15

class AllocationItem(BaseModel):
    product_id: int
    product_name: str
    source_warehouse_id: int
    source_warehouse_name: str
    destination_store_id: int
    destination_store_name: str
    quantity: int
    batch_id: Optional[int] = None
    batch_number: Optional[str] = None
    priority: str
    reason: str
    transport_cost: float

class OptimizationResponse(BaseModel):
    status: str
    total_recommendations: int
    total_allocated_units: int
    unmet_demand_units: int
    stockout_mitigation_pct: float
    expiry_units_saved: int
    allocations: List[AllocationItem]
    solver: str = "PuLP-CBC"
    execution_time_ms: int
