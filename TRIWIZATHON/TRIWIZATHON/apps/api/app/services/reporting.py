from __future__ import annotations

import csv
import io
from typing import Any, Dict, List


def export_scenario_csv(scenario, plans) -> bytes:
    """
    Generate CSV content for allocations, unmet, kpis.
    scenario: dict with at least id
    plans: list of plan dicts or AllocationResult-like dicts, or dict mapping type->plan
    Returns bytes ready for response.
    CSV sections separated by blank lines and section headers.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Normalize scenario
    if isinstance(scenario, dict):
        scen_id = scenario.get("id", "scenario")
    else:
        scen_id = getattr(scenario, "id", "scenario")
    writer.writerow([f"Scenario: {scen_id}"])
    writer.writerow([])

    # Normalize plans to list
    if isinstance(plans, dict):
        plan_list = list(plans.values())
    elif isinstance(plans, list):
        plan_list = plans
    else:
        plan_list = [plans]

    for plan in plan_list:
        if isinstance(plan, dict):
            pid = plan.get("id", "plan")
            ptype = plan.get("type", "unknown")
            data = plan.get("data", plan)
            # data may contain allocations, unmet, kpis
            allocations = data.get("allocations", plan.get("allocations", []))
            unmet = data.get("unmet", plan.get("unmet", []))
            kpis = data.get("kpis", plan.get("kpis", {}))
        else:
            pid = getattr(plan, "id", "plan")
            ptype = getattr(plan, "type", "unknown")
            allocations = getattr(plan, "allocations", [])
            unmet = getattr(plan, "unmet", [])
            kpis = getattr(plan, "kpis", {})

        writer.writerow([f"Plan: {pid} ({ptype})"])
        # Allocations section
        writer.writerow(["Allocations"])
        writer.writerow(["warehouse_id", "destination_id", "product_id", "route_id", "quantity"])
        for a in allocations or []:
            if isinstance(a, dict):
                writer.writerow([a.get("warehouse_id", ""), a.get("destination_id", ""), a.get("product_id", ""), a.get("route_id", ""), a.get("quantity", "")])
            else:
                writer.writerow([getattr(a, "warehouse_id", ""), getattr(a, "destination_id", ""), getattr(a, "product_id", ""), getattr(a, "route_id", ""), getattr(a, "quantity", "")])
        writer.writerow([])
        # Unmet section
        writer.writerow(["Unmet"])
        writer.writerow(["destination_id", "product_id", "quantity", "priority"])
        for u in unmet or []:
            if isinstance(u, dict):
                writer.writerow([u.get("destination_id", ""), u.get("product_id", ""), u.get("quantity", ""), u.get("priority", "")])
            else:
                writer.writerow([getattr(u, "destination_id", ""), getattr(u, "product_id", ""), getattr(u, "quantity", ""), getattr(u, "priority", "")])
        writer.writerow([])
        # KPIs section
        writer.writerow(["KPIs"])
        if isinstance(kpis, dict):
            writer.writerow(["metric", "value"])
            for k, v in kpis.items():
                # ensure no dict nesting explosion
                if isinstance(v, dict):
                    import json
                    writer.writerow([k, json.dumps(v)])
                else:
                    writer.writerow([k, v])
        else:
            # KPISnapshot object
            writer.writerow(["metric", "value"])
            try:
                kd = kpis.model_dump() if hasattr(kpis, "model_dump") else dict(kpis)
                for k, v in kd.items():
                    if isinstance(v, dict):
                        import json
                        writer.writerow([k, json.dumps(v)])
                    else:
                        writer.writerow([k, v])
            except Exception:
                writer.writerow(["kpis", str(kpis)])
        writer.writerow([])
        writer.writerow([])

    content = output.getvalue()
    return content.encode("utf-8")
