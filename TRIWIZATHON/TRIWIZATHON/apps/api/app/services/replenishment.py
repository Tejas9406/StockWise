from __future__ import annotations

import math
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class BatchInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")

    batch_id: str = Field(..., description="Batch identifier")
    warehouse_id: str = Field(..., description="Warehouse holding the batch")
    product_id: str = Field(..., description="Product identifier")
    quantity: float = Field(..., ge=0, description="Batch quantity")
    expiry_days: float = Field(..., description="Days until batch expires (<=0 means already expired)")


class IncomingOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")

    order_id: str = Field(..., description="Incoming purchase order ID")
    warehouse_id: str = Field(..., description="Destination warehouse")
    product_id: str = Field(..., description="Product identifier")
    quantity: float = Field(..., ge=0, description="Confirmed order quantity")
    eta_days: float = Field(default=0, ge=0, description="Days until arrival")


class ExpiryRiskAssessment(BaseModel):
    model_config = ConfigDict(extra="ignore")

    product_id: str
    warehouse_id: str
    total_stock: float
    usable_stock: float
    expired_stock: float
    at_risk_stock: float
    batches_expired: List[str]
    batches_at_risk: List[str]
    status: str  # "ok", "warning", "critical"
    rationale: str


class ReplenishmentRecommendation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    product_id: str
    warehouse_id: Optional[str] = None
    forecast_demand: float
    safety_stock: float
    usable_inventory: float
    incoming_stock: float
    lead_time_days: float
    net_requirement: float
    suggested_replenishment: float
    stockout_risk: str  # "low", "medium", "high", "critical"
    days_of_supply: float
    reasoning: str


def evaluate_batch_expiry(
    batches: List[BatchInfo],
    daily_consumption_rate: float = 0.0,
    lead_time_days: float = 2.0,
) -> Dict[str, ExpiryRiskAssessment]:
    """
    Evaluates batches to identify expired and at-risk stock.
    Stock expiring within lead_time_days or before predicted consumption is flagged as at-risk.
    Keyed by (warehouse_id, product_id).
    """
    grouped: Dict[tuple[str, str], List[BatchInfo]] = {}
    for b in batches:
        key = (b.warehouse_id, b.product_id)
        grouped.setdefault(key, []).append(b)

    assessments: Dict[str, ExpiryRiskAssessment] = {}

    for (w_id, p_id), b_list in grouped.items():
        total_qty = 0.0
        usable_qty = 0.0
        expired_qty = 0.0
        at_risk_qty = 0.0

        expired_batches = []
        at_risk_batches = []

        # Sort batches FEFO (First Expired, First Out)
        sorted_batches = sorted(b_list, key=lambda x: x.expiry_days)
        cumulative_consumed = 0.0

        for b in sorted_batches:
            total_qty += b.quantity
            if b.expiry_days <= 0:
                # Already expired: exclude completely from usable inventory
                expired_qty += b.quantity
                expired_batches.append(b.batch_id)
            elif b.expiry_days <= lead_time_days:
                # Expiring during transit/lead time
                at_risk_qty += b.quantity
                at_risk_batches.append(b.batch_id)
            else:
                # Check if consumption can absorb it before expiry
                expected_consumed = daily_consumption_rate * b.expiry_days
                if cumulative_consumed + b.quantity > expected_consumed and daily_consumption_rate > 0:
                    unconsumed = (cumulative_consumed + b.quantity) - expected_consumed
                    at_risk_qty += min(b.quantity, unconsumed)
                    at_risk_batches.append(b.batch_id)
                cumulative_consumed += b.quantity
                usable_qty += b.quantity

        status = "ok"
        rationale_parts = []
        if expired_qty > 0:
            status = "critical"
            rationale_parts.append(
                f"{expired_qty:.0f} units expired across {len(expired_batches)} batch(es) and excluded from usable stock."
            )
        if at_risk_qty > 0:
            if status != "critical":
                status = "warning"
            rationale_parts.append(
                f"{at_risk_qty:.0f} units at risk of expiring before fulfilment or within {lead_time_days} days lead time."
            )
        if not rationale_parts:
            rationale_parts.append("All batches healthy with sufficient shelf life.")

        dict_key = f"{w_id}_{p_id}"
        assessments[dict_key] = ExpiryRiskAssessment(
            product_id=p_id,
            warehouse_id=w_id,
            total_stock=round(total_qty, 2),
            usable_stock=round(usable_qty, 2),
            expired_stock=round(expired_qty, 2),
            at_risk_stock=round(at_risk_qty, 2),
            batches_expired=expired_batches,
            batches_at_risk=at_risk_batches,
            status=status,
            rationale=" ".join(rationale_parts),
        )

    return assessments


def calculate_replenishment(
    product_id: str,
    forecast_demand: float,
    usable_inventory: float,
    incoming_stock: float = 0.0,
    lead_time_days: float = 2.0,
    demand_std_dev: float = 0.0,
    service_factor_z: float = 1.65,  # 95% service level
    min_order_qty: float = 0.0,
    warehouse_id: Optional[str] = None,
) -> ReplenishmentRecommendation:
    """
    Calculates inventory replenishment per the StockWise AI formula:
    suggested_replenishment = max(0, forecast_demand + safety_stock - usable_stock - incoming_stock)
    Where safety_stock = z * std_dev * sqrt(lead_time_days).
    """
    # Safety stock calculation
    if demand_std_dev > 0:
        safety_stock = service_factor_z * demand_std_dev * math.sqrt(max(1.0, lead_time_days))
    else:
        # Default safety buffer = 15% of planning period forecast
        safety_stock = forecast_demand * 0.15

    safety_stock = round(safety_stock, 2)
    effective_stock = usable_inventory + incoming_stock
    gross_requirement = forecast_demand + safety_stock
    net_requirement = gross_requirement - effective_stock

    if net_requirement > 0:
        suggested = net_requirement
        if min_order_qty > 0 and suggested < min_order_qty:
            suggested = min_order_qty
    else:
        suggested = 0.0

    suggested = round(suggested, 2)

    # Days of supply calculation
    daily_demand = forecast_demand / 7.0 if forecast_demand > 0 else 0.0
    if daily_demand > 0:
        days_of_supply = round(effective_stock / daily_demand, 1)
    else:
        days_of_supply = 999.0 if effective_stock > 0 else 0.0

    # Risk level classification
    if effective_stock <= 0 and forecast_demand > 0:
        stockout_risk = "critical"
    elif effective_stock < forecast_demand:
        stockout_risk = "high"
    elif effective_stock < gross_requirement:
        stockout_risk = "medium"
    else:
        stockout_risk = "low"

    # Transparent, non-generic explanation
    reasoning_parts = []
    if suggested > 0:
        reasoning_parts.append(
            f"Net deficit of {net_requirement:.1f} units detected against required stock "
            f"({forecast_demand:.1f} forecast demand + {safety_stock:.1f} safety stock buffer)."
        )
        if incoming_stock > 0:
            reasoning_parts.append(f"Credited {incoming_stock:.1f} confirmed incoming units against gross need.")
        if usable_inventory <= 0:
            reasoning_parts.append("Zero usable inventory on hand.")
        else:
            reasoning_parts.append(f"Current usable inventory provides ~{days_of_supply} days of cover.")
    else:
        reasoning_parts.append(
            f"Sufficient coverage ({days_of_supply} days of supply). Total available and pipeline "
            f"({effective_stock:.1f}) meets demand ({forecast_demand:.1f}) plus {safety_stock:.1f} safety buffer."
        )

    return ReplenishmentRecommendation(
        product_id=product_id,
        warehouse_id=warehouse_id,
        forecast_demand=round(forecast_demand, 2),
        safety_stock=safety_stock,
        usable_inventory=round(usable_inventory, 2),
        incoming_stock=round(incoming_stock, 2),
        lead_time_days=lead_time_days,
        net_requirement=round(net_requirement, 2),
        suggested_replenishment=suggested,
        stockout_risk=stockout_risk,
        days_of_supply=days_of_supply,
        reasoning=" ".join(reasoning_parts),
    )
