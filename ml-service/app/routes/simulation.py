from fastapi import APIRouter, HTTPException
from app.services.simulation_service import (
    ScenarioRequest, ScenarioComparisonResponse, run_scenario_simulation
)

router = APIRouter(prefix="/simulation", tags=["What-If Scenario Simulation"])

@router.post("/", response_model=ScenarioComparisonResponse)
async def simulate_scenario(payload: ScenarioRequest):
    """
    Run a What-If scenario simulation.
    Applies perturbation parameters to the base state and compares
    the PuLP optimization outcome against the baseline.
    """
    try:
        result = run_scenario_simulation(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scenario simulation error: {str(e)}")
