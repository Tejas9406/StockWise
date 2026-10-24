import time
import pulp
from typing import List, Dict, Any, Tuple
from app.schemas import (
    OptimizationRequest, OptimizationResponse, AllocationItem,
    StoreDemandTarget, WarehouseSourceStock, BatchCandidate
)

def solve_allocation_optimization(req: OptimizationRequest) -> OptimizationResponse:
    """
    Formulates and solves a Mixed-Integer Linear Program (MILP) using PuLP.
    Optimizes multi-warehouse to multi-store allocation while enforcing:
    1. Usable warehouse inventory limits
    2. Store replenishment needs
    3. Batch quantity caps
    4. Shelf-life feasibility (zero allocation for expired batches)
    5. Prioritization of critical stockout stores and near-expiry FEFO batches
    """
    start_time = time.time()

    stores = req.stores
    warehouses = req.warehouses
    batches = req.batches or []
    cost_per_unit = float(req.transport_cost_per_unit or 0.15)

    if not stores or not warehouses:
        return OptimizationResponse(
            status="SUCCESS",
            total_recommendations=0,
            total_allocated_units=0,
            unmet_demand_units=sum(int(s.replenishment_need) for s in stores),
            stockout_mitigation_pct=0.0,
            expiry_units_saved=0,
            allocations=[],
            solver="PuLP-CBC",
            execution_time_ms=int((time.time() - start_time) * 1000)
        )

    # Priority multipliers
    priority_scores = {
        "CRITICAL": 120.0,
        "HIGH": 80.0,
        "MEDIUM": 40.0,
        "LOW": 15.0
    }

    # Group candidate batches by (warehouse_id, product_id)
    wh_prod_batches: Dict[Tuple[int, int], List[BatchCandidate]] = {}
    for b in batches:
        key = (b.warehouse_id, b.product_id)
        if key not in wh_prod_batches:
            wh_prod_batches[key] = []
        wh_prod_batches[key].append(b)

    # Initialize PuLP Problem (Maximization of fulfilled priority demand minus waste and transport cost)
    prob = pulp.LpProblem("StockWise_SupplyChain_Optimization", pulp.LpMaximize)

    # Decision variables: X[(w_id, s_id, p_id, batch_id)] = integer quantity allocated
    decision_vars = {}
    alloc_metadata = {}

    for s in stores:
        s_id = s.store_id
        p_id = s.product_id
        target_qty = int(s.replenishment_need)
        if target_qty <= 0:
            continue

        p_score = priority_scores.get(s.priority.upper(), 40.0)

        for w in warehouses:
            if w.product_id != p_id or w.available_quantity <= 0:
                continue
            w_id = w.warehouse_id

            candidate_b_list = wh_prod_batches.get((w_id, p_id), [])

            if candidate_b_list:
                for b in candidate_b_list:
                    # Constraint: Expiry check (do not allocate if <= 3 days left)
                    if b.days_until_expiry <= 3 or b.quantity <= 0:
                        continue

                    var_name = f"alloc_w{w_id}_s{s_id}_p{p_id}_b{b.batch_id}"
                    upper_bound = min(int(w.available_quantity), target_qty, int(b.quantity))
                    v = pulp.LpVariable(var_name, lowBound=0, upBound=upper_bound, cat=pulp.LpInteger)
                    var_key = (w_id, s_id, p_id, b.batch_id)
                    decision_vars[var_key] = v

                    # Near-expiry salvage weight: bonus for moving stock expiring within 45 days
                    expiry_bonus = max(0.0, (45.0 - b.days_until_expiry) * 0.4)

                    alloc_metadata[var_key] = {
                        "store": s,
                        "warehouse": w,
                        "batch": b,
                        "weight": p_score + expiry_bonus - cost_per_unit,
                        "transport_cost": cost_per_unit,
                        "expiry_bonus": expiry_bonus
                    }
            else:
                # No specific batch tracked, allocate at warehouse inventory level
                var_name = f"alloc_w{w_id}_s{s_id}_p{p_id}_b0"
                upper_bound = min(int(w.available_quantity), target_qty)
                v = pulp.LpVariable(var_name, lowBound=0, upBound=upper_bound, cat=pulp.LpInteger)
                var_key = (w_id, s_id, p_id, 0)
                decision_vars[var_key] = v
                alloc_metadata[var_key] = {
                    "store": s,
                    "warehouse": w,
                    "batch": None,
                    "weight": p_score - cost_per_unit,
                    "transport_cost": cost_per_unit,
                    "expiry_bonus": 0.0
                }

    if not decision_vars:
        total_demand = sum(int(s.replenishment_need) for s in stores)
        return OptimizationResponse(
            status="INFEASIBLE_NO_STOCK",
            total_recommendations=0,
            total_allocated_units=0,
            unmet_demand_units=total_demand,
            stockout_mitigation_pct=0.0,
            expiry_units_saved=0,
            allocations=[],
            solver="PuLP-CBC",
            execution_time_ms=int((time.time() - start_time) * 1000)
        )

    # Objective: Maximize total weighted allocation
    prob += pulp.lpSum([decision_vars[k] * alloc_metadata[k]["weight"] for k in decision_vars])

    # Constraint 1: Store replenishment need caps
    for s in stores:
        s_id = s.store_id
        p_id = s.product_id
        store_vars = [decision_vars[k] for k in decision_vars if k[1] == s_id and k[2] == p_id]
        if store_vars:
            prob += pulp.lpSum(store_vars) <= int(s.replenishment_need)

    # Constraint 2: Warehouse available quantity caps
    for w in warehouses:
        w_id = w.warehouse_id
        p_id = w.product_id
        wh_vars = [decision_vars[k] for k in decision_vars if k[0] == w_id and k[2] == p_id]
        if wh_vars:
            prob += pulp.lpSum(wh_vars) <= int(w.available_quantity)

    # Constraint 3: Batch quantity caps
    for b in batches:
        b_vars = [decision_vars[k] for k in decision_vars if k[3] == b.batch_id]
        if b_vars:
            prob += pulp.lpSum(b_vars) <= int(b.quantity)

    # Solve
    try:
        prob.solve(pulp.PULP_CBC_CMD(msg=0))
    except Exception:
        # Fallback to default solver
        prob.solve()

    # Collect Results
    allocations: List[AllocationItem] = []
    total_allocated = 0
    total_demand = sum(int(s.replenishment_need) for s in stores)
    expiry_units_saved = 0

    for k, v in decision_vars.items():
        qty = int(v.varValue or 0)
        if qty > 0:
            meta = alloc_metadata[k]
            st = meta["store"]
            wh = meta["warehouse"]
            bt = meta["batch"]

            total_allocated += qty
            batch_id = bt.batch_id if bt else None
            batch_num = bt.batch_number if bt else "Default Lot"

            if bt and bt.days_until_expiry <= 45:
                expiry_units_saved += qty

            # Explainable AI rationale
            reasons = []
            if st.priority.upper() in ["CRITICAL", "HIGH"]:
                reasons.append(f"Store has {st.priority} replenishment deficit of {int(st.replenishment_need)} units")
            else:
                reasons.append(f"Replenishing target buffer of {int(st.replenishment_need)} units")

            reasons.append(f"Source warehouse {wh.warehouse_name} has {int(wh.available_quantity)} units available")

            if bt:
                reasons.append(f"FEFO allocation: Batch {batch_num} has {bt.days_until_expiry} days to expiry")

            full_reason = ". ".join(reasons) + "."

            allocations.append(AllocationItem(
                product_id=st.product_id,
                product_name=st.product_name,
                source_warehouse_id=wh.warehouse_id,
                source_warehouse_name=wh.warehouse_name,
                destination_store_id=st.store_id,
                destination_store_name=st.store_name,
                quantity=qty,
                batch_id=batch_id,
                batch_number=batch_num,
                priority=st.priority,
                reason=full_reason,
                transport_cost=round(qty * meta["transport_cost"], 2)
            ))

    # Sort allocations: CRITICAL first, then HIGH, etc.
    priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    allocations.sort(key=lambda x: priority_order.get(x.priority.upper(), 9))

    unmet_demand = max(0, total_demand - total_allocated)
    mitigation_pct = round((total_allocated / total_demand * 100.0), 1) if total_demand > 0 else 100.0
    elapsed_ms = int((time.time() - start_time) * 1000)

    return OptimizationResponse(
        status="OPTIMAL" if allocations else "INFEASIBLE",
        total_recommendations=len(allocations),
        total_allocated_units=total_allocated,
        unmet_demand_units=unmet_demand,
        stockout_mitigation_pct=mitigation_pct,
        expiry_units_saved=expiry_units_saved,
        allocations=allocations,
        solver="PuLP-CBC (Simplex/Branch-and-Bound)",
        execution_time_ms=elapsed_ms
    )
