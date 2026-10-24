from fastapi import APIRouter, HTTPException
from app.schemas import RiskAssessmentRequest, RiskAssessmentResponse
from app.services.risk_service import assess_inventory_risk

router = APIRouter(prefix="/risk", tags=["Risk Assessment"])

@router.post("/", response_model=RiskAssessmentResponse)
async def assess_risk(payload: RiskAssessmentRequest):
    try:
        res = assess_inventory_risk(payload)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk evaluation error: {str(e)}")
