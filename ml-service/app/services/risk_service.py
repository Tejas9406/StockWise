import numpy as np
from app.schemas import RiskAssessmentRequest, RiskAssessmentResponse

def assess_inventory_risk(req: RiskAssessmentRequest) -> RiskAssessmentResponse:
    """
    Computes predictive stockout risk score (0-100) and excess inventory metrics
    based on forward demand, lead time, sales volatility, and safety stock levels.
    """
    stock = max(0.0, float(req.current_stock))
    daily_demand = max(0.1, float(req.forecast_daily))
    lead_time = max(0.5, float(req.lead_time_days))
    reorder_pt = max(10.0, float(req.reorder_point))
    safety_stock = max(5.0, float(req.min_safety_stock))
    horizon_demand = max(daily_demand, float(req.forecast_horizon_demand))
    sales_std = max(0.0, float(req.sales_std))

    # 1. Coverage Days
    coverage_days = round(stock / daily_demand, 1)

    # 2. Lead Time Demand with Volatility Buffer
    lead_time_demand = lead_time * daily_demand
    volatility_buffer = 1.65 * sales_std * np.sqrt(lead_time) # 95% service level buffer
    effective_threshold = lead_time_demand + volatility_buffer

    # 3. Stockout Risk Score (0 - 100)
    if stock == 0:
        stockout_score = 100.0
        severity = "CRITICAL"
        msg = "Stockout active (0 units available). Immediate replenishment required."
    elif stock <= lead_time_demand:
        # Stock cannot even cover supplier replenishment lead time
        ratio = stock / max(1.0, lead_time_demand)
        stockout_score = round(80.0 + (1.0 - ratio) * 19.0, 1)
        severity = "CRITICAL"
        msg = f"Stockout imminent: {stock:.0f} units remaining ({coverage_days} days) vs lead time demand of {lead_time_demand:.0f} units."
    elif stock <= reorder_pt:
        # Below reorder point
        deficit_ratio = (reorder_pt - stock) / reorder_pt
        stockout_score = round(40.0 + deficit_ratio * 39.0, 1)
        severity = "HIGH" if stockout_score >= 60 else "MEDIUM"
        msg = f"Stock level ({stock:.0f}) below reorder point ({reorder_pt:.0f}). Coverage is {coverage_days} days."
    else:
        # Healthy stock
        safe_margin = (stock - reorder_pt) / max(1.0, reorder_pt)
        stockout_score = max(5.0, round(30.0 / (1.0 + safe_margin), 1))
        severity = "LOW"
        msg = f"Healthy inventory buffer. Coverage is {coverage_days} days with {stock:.0f} units available."

    # 4. Excess Inventory Calculation
    # Excess is stock beyond what is needed to cover the horizon + safety stock
    buffer_cap = horizon_demand + (safety_stock * 1.5)
    if stock > buffer_cap:
        excess_qty = round(stock - buffer_cap, 1)
        if excess_qty > 100 or coverage_days > 45:
            excess_sev = "CRITICAL"
            excess_msg = f"High capital lockup: {excess_qty:.0f} excess units ({coverage_days} days of forward coverage)."
        elif excess_qty > 40 or coverage_days > 30:
            excess_sev = "HIGH"
            excess_msg = f"Substantial surplus: {excess_qty:.0f} excess units over 30-day requirement."
        else:
            excess_sev = "MEDIUM"
            excess_msg = f"Moderate excess: {excess_qty:.0f} units above recommended safety buffer."
    else:
        excess_qty = 0.0
        excess_sev = "NONE"
        excess_msg = "No excess stock detected; inventory aligned with forward demand."

    return RiskAssessmentResponse(
        coverage_days=coverage_days,
        stockout_risk_score=min(100.0, max(0.0, stockout_score)),
        stockout_severity=severity,
        stockout_message=msg,
        excess_quantity=excess_qty,
        excess_severity=excess_sev,
        excess_message=excess_msg
    )
