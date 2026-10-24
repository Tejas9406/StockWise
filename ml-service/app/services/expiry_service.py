from typing import List, Optional
from app.schemas import BatchItem, EvaluatedBatch, ExpiryEvaluationRequest, ExpiryEvaluationResponse

def evaluate_batches_fefo(req: ExpiryEvaluationRequest) -> ExpiryEvaluationResponse:
    """
    Advanced FEFO & Expiry Intelligence:
    Evaluates each batch against destination store demand rate to calculate
    real expected sell-through, potential expiry exposure, and destination feasibility.
    """
    batches_in = req.batches
    daily_demand = max(0.1, float(req.store_daily_demand))

    evaluated_list: List[EvaluatedBatch] = []
    total_qty = 0.0
    total_exposure = 0.0

    for b in batches_in:
        qty = max(0.0, float(b.quantity))
        days = int(b.days_until_expiry)
        total_qty += qty

        if days <= 0:
            # Expired batch: strictly unusable
            eval_b = EvaluatedBatch(
                id=b.id,
                batch_number=b.batch_number,
                quantity=qty,
                days_until_expiry=days,
                expected_sell_through=0.0,
                potential_expiry_exposure=qty,
                expiry_risk_score=100.0,
                feasible_at_destination=False,
                warning="Batch is already EXPIRED. Allocation prohibited."
            )
            total_exposure += qty
            evaluated_list.append(eval_b)
            continue

        # Expected sell through before shelf expiry
        sell_through_capacity = round(days * daily_demand, 1)
        expected_sell = min(qty, sell_through_capacity)
        exposure = max(0.0, round(qty - expected_sell, 1))
        total_exposure += exposure

        # Destination feasibility: Can the store realistically absorb this batch?
        is_feasible = True
        warn = None

        if days < 5:
            is_feasible = False
            warn = f"Insufficient shelf-life ({days} days) for transit and store shelf-display."
        elif exposure > (qty * 0.40):
            is_feasible = False
            warn = f"High expiry hazard: store demand can only absorb {expected_sell:.0f}/{qty:.0f} units before expiry ({exposure:.0f} units wasted)."
        
        # Risk score calculation (0 - 100)
        exposure_ratio = exposure / max(1.0, qty)
        if days <= 15:
            urgency_score = 90.0
        elif days <= 30:
            urgency_score = 65.0
        elif days <= 60:
            urgency_score = 35.0
        else:
            urgency_score = 10.0

        risk_score = min(100.0, round((urgency_score * 0.6) + (exposure_ratio * 100.0 * 0.4), 1))

        evaluated_list.append(EvaluatedBatch(
            id=b.id,
            batch_number=b.batch_number,
            quantity=qty,
            days_until_expiry=days,
            expected_sell_through=expected_sell,
            potential_expiry_exposure=exposure,
            expiry_risk_score=risk_score,
            feasible_at_destination=is_feasible,
            warning=warn
        ))

    # Advanced FEFO Selection:
    # 1. Must be feasible at destination and not expired (days > 4)
    # 2. Sort by earliest expiry first, but if tie or near-tie, prioritize batch with higher exposure in warehouse
    candidates = [b for b in evaluated_list if b.feasible_at_destination and b.days_until_expiry > 4 and b.quantity > 0]
    
    recommended = None
    if candidates:
        candidates.sort(key=lambda x: (x.days_until_expiry, -x.potential_expiry_exposure))
        recommended = candidates[0]

    return ExpiryEvaluationResponse(
        batches=evaluated_list,
        total_batch_quantity=round(total_qty, 1),
        total_expiry_exposure=round(total_exposure, 1),
        recommended_fefo_batch=recommended
    )
