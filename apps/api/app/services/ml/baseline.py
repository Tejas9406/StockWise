from __future__ import annotations

from typing import Any, Dict, List


def baseline_forecast(history: List[Dict[str, Any]], horizon: int = 4) -> List[Dict[str, Any]]:
    """
    Simple moving average window 3, fallback to last value.
    history: list of dicts each with at least a numeric value field.
             Accepted keys for the value: 'quantity', 'value', 'demand', 'mean', 'qty'
    horizon: number of periods to forecast
    Return [{period, mean, p10, p90}] with p10=mean*0.8, p90=mean*1.2.
    """
    if horizon < 1:
        raise ValueError("horizon must be >=1")

    values: List[float] = []
    for row in history or []:
        if not isinstance(row, dict):
            continue
        # try common keys
        v = None
        for key in ("quantity", "value", "demand", "mean", "qty", "amount"):
            if key in row and row[key] is not None:
                v = row[key]
                break
        if v is None:
            continue
        try:
            fv = float(v)
            values.append(fv)
        except Exception:
            continue

    if not values:
        # No history: forecast zeros
        result = []
        for i in range(1, horizon + 1):
            result.append({"period": i, "mean": 0.0, "p10": 0.0, "p90": 0.0})
        return result

    # Determine base mean
    window = 3
    if len(values) >= window:
        mean_val = sum(values[-window:]) / window
    else:
        # fallback to last value if insufficient history
        mean_val = float(values[-1])

    result: List[Dict[str, Any]] = []
    for i in range(1, horizon + 1):
        mean = round(float(mean_val), 4)
        p10 = round(mean * 0.8, 4)
        p90 = round(mean * 1.2, 4)
        result.append({"period": i, "mean": mean, "p10": p10, "p90": p90})
    return result
