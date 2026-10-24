from fastapi import APIRouter, HTTPException
from app.schemas import ExpiryEvaluationRequest, ExpiryEvaluationResponse
from app.services.expiry_service import evaluate_batches_fefo

router = APIRouter(prefix="/expiry", tags=["Expiry & FEFO Intelligence"])

@router.post("/", response_model=ExpiryEvaluationResponse)
async def evaluate_expiry(payload: ExpiryEvaluationRequest):
    try:
        res = evaluate_batches_fefo(payload)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Expiry evaluation error: {str(e)}")
