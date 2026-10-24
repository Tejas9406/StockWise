from fastapi import APIRouter, HTTPException
from app.services.monitoring_service import (
    DriftDetectionRequest, DriftDetectionResponse, detect_model_drift
)

router = APIRouter(prefix="/monitoring", tags=["Model Monitoring & Drift Detection"])

@router.post("/drift", response_model=DriftDetectionResponse)
async def check_model_drift(payload: DriftDetectionRequest):
    """
    Analyze model prediction accuracy for concept drift.
    Compares recent performance window against historical baseline.
    """
    try:
        result = detect_model_drift(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Drift detection error: {str(e)}")
