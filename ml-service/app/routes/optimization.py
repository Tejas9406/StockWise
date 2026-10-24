from fastapi import APIRouter, HTTPException
from app.schemas import OptimizationRequest, OptimizationResponse
from app.services.optimization_service import solve_allocation_optimization

router = APIRouter(prefix="/optimization", tags=["Constrained Optimization Engine"])

@router.post("/", response_model=OptimizationResponse)
async def run_optimization(payload: OptimizationRequest):
    try:
        res = solve_allocation_optimization(payload)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization solver error: {str(e)}")
