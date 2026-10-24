from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.ml.baseline import baseline_forecast

# In a real app history would come from DB; for now we synthesize or accept mock history.
# We attempt to load history from dataset demand if destination/product matches, but fallback to dummy.

router = APIRouter(prefix="/api/v1", tags=["forecast"])


@router.get("/forecast")
def get_forecast(
    destination_id: str = Query(..., description="Destination id"),
    product_id: str = Query(..., description="Product id"),
    horizon: int = Query(4, ge=1, le=52, description="Forecast horizon"),
):
    # Try to build history from datasets if available; else use empty
    history: List[Dict[str, Any]] = []
    try:
        from app.repo import database as db

        datasets = db.list_datasets()
        # Gather histories: look for demand entries matching destination/product
        # Use quantity as history points; we will produce a time series per dataset
        for ds in datasets:
            meta = ds.get("meta", {})
            demand_list = meta.get("demand", [])
            for dem in demand_list:
                if str(dem.get("destination_id")) == str(destination_id) and str(dem.get("product_id")) == str(product_id):
                    # treat each demand quantity as one historical period
                    history.append({"quantity": float(dem.get("quantity", 0) or 0)})
                    break
    except Exception:
        history = []

    # If no history found, fabricate a simple series so forecast is not empty
    if not history:
        # Use a default constant series
        history = [{"quantity": 100}, {"quantity": 110}, {"quantity": 105}]

    try:
        forecast = baseline_forecast(history, horizon=horizon)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "destination_id": destination_id,
        "product_id": product_id,
        "horizon": horizon,
        "model": "baseline",
        "forecast": forecast,
        "history_used": history,
    }
