from __future__ import annotations

from typing import Any, Dict, List
from app.services.ml.engine import generate_forecast


def baseline_forecast(history: List[Dict[str, Any]], horizon: int = 4) -> List[Dict[str, Any]]:
    """
    Backwards-compatible interface.
    history: list of dicts each with at least a numeric value field.
    horizon: number of periods to forecast
    Return [{period, mean, p10, p90}].
    """
    result = generate_forecast(history, horizon=horizon, preferred_model="baseline")
    return result["forecast"]
