from fastapi import APIRouter, HTTPException
from app.schemas import ForecastRequest, ForecastResponse
from app.services.forecasting_service import run_demand_forecast

router = APIRouter(prefix="/forecast", tags=["Demand Forecasting"])

@router.post("/", response_model=ForecastResponse)
async def generate_forecast(payload: ForecastRequest):
    try:
        res = run_demand_forecast(payload)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Forecast execution error: {str(e)}")
