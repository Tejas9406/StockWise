from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple
import numpy as np


def extract_series(history: List[Dict[str, Any]]) -> List[float]:
    """Extract chronological float series from history dicts."""
    values: List[float] = []
    for row in history or []:
        if not isinstance(row, dict):
            continue
        v = None
        for key in ("quantity", "value", "demand", "mean", "qty", "amount"):
            if key in row and row[key] is not None:
                v = row[key]
                break
        if v is None:
            continue
        try:
            fv = float(v)
            if not math.isnan(fv) and not math.isinf(fv):
                values.append(max(0.0, fv))
        except (ValueError, TypeError):
            continue
    return values


def calculate_metrics(actuals: List[float], predictions: List[float]) -> Dict[str, Optional[float]]:
    """
    Calculate MAE, WAPE, RMSE, and Forecast Bias on paired actuals vs predictions.
    actuals: list of actual values
    predictions: list of predicted values
    """
    n = len(actuals)
    if n == 0 or len(predictions) != n:
        return {"mae": None, "wape": None, "rmse": None, "bias": None, "n_eval": 0}

    y_true = np.array(actuals, dtype=float)
    y_pred = np.array(predictions, dtype=float)

    errors = y_pred - y_true  # positive means over-forecasting
    abs_errors = np.abs(errors)

    mae = float(np.mean(abs_errors))
    rmse = float(np.sqrt(np.mean(errors ** 2)))

    sum_true = float(np.sum(y_true))
    if sum_true > 1e-6:
        wape = float(np.sum(abs_errors) / sum_true)
        bias = float(np.sum(errors) / sum_true)
    else:
        # If actual demand was zero throughout
        wape = float(np.mean(abs_errors))
        bias = float(np.mean(errors))

    return {
        "mae": round(mae, 4),
        "wape": round(wape, 4),
        "rmse": round(rmse, 4),
        "bias": round(bias, 4),
        "n_eval": n,
    }


def predict_moving_average(history: List[float], horizon: int, window: int = 3) -> List[float]:
    """Moving average baseline predictor."""
    if not history:
        return [0.0] * horizon
    w = min(window, len(history))
    val = float(np.mean(history[-w:]))
    return [max(0.0, round(val, 4))] * horizon


def predict_exponential_smoothing(
    history: List[float], horizon: int, alpha: float = 0.3, beta: float = 0.1
) -> List[float]:
    """
    Holt's linear exponential smoothing (captures level + local trend).
    """
    n = len(history)
    if n == 0:
        return [0.0] * horizon
    if n == 1:
        return [max(0.0, round(history[0], 4))] * horizon

    # Initialize level and trend
    level = history[0]
    trend = history[1] - history[0]

    for t in range(1, n):
        val = history[t]
        last_level = level
        level = alpha * val + (1 - alpha) * (last_level + trend)
        trend = beta * (level - last_level) + (1 - beta) * trend

    preds = []
    for h in range(1, horizon + 1):
        yh = level + h * trend
        preds.append(max(0.0, round(float(yh), 4)))
    return preds


def predict_ml_ridge(history: List[float], horizon: int) -> List[float]:
    """
    Autoregressive lag feature regression with Ridge regularization.
    Falls back gracefully if history is insufficient.
    """
    n = len(history)
    if n < 5:
        # Fallback to exponential smoothing if sparse
        return predict_exponential_smoothing(history, horizon)

    from sklearn.linear_model import Ridge

    max_lags = min(3, n - 2)
    X = []
    y = []
    for i in range(max_lags, n):
        X.append([history[i - lag] for lag in range(1, max_lags + 1)])
        y.append(history[i])

    try:
        model = Ridge(alpha=1.0)
        model.fit(X, y)

        curr = list(history)
        preds: List[float] = []
        for _ in range(horizon):
            feat = [curr[-lag] for lag in range(1, max_lags + 1)]
            next_val = float(model.predict([feat])[0])
            next_val = max(0.0, round(next_val, 4))
            preds.append(next_val)
            curr.append(next_val)
        return preds
    except Exception:
        return predict_exponential_smoothing(history, horizon)


def backtest_walk_forward(
    history: List[float],
    min_train: int = 3,
) -> Dict[str, Any]:
    """
    Time-ordered, walk-forward (expanding window) backtesting without future data leakage.
    Evaluates:
      - 'baseline' (Moving Average, w=3)
      - 'exp_smoothing' (Holt's Linear)
      - 'ml_ridge' (Autoregressive Ridge)
    Returns metrics dict and out-of-sample residuals for empirical prediction intervals.
    """
    n = len(history)
    if n <= min_train:
        # Insufficient data for backtesting
        return {
            "baseline": {"mae": None, "wape": None, "rmse": None, "bias": None, "n_eval": 0, "residuals": []},
            "exp_smoothing": {"mae": None, "wape": None, "rmse": None, "bias": None, "n_eval": 0, "residuals": []},
            "ml_ridge": {"mae": None, "wape": None, "rmse": None, "bias": None, "n_eval": 0, "residuals": []},
            "best_model": "baseline",
        }

    actuals: List[float] = []
    preds_ma: List[float] = []
    preds_es: List[float] = []
    preds_ml: List[float] = []

    res_ma: List[float] = []
    res_es: List[float] = []
    res_ml: List[float] = []

    for t in range(min_train, n):
        train_slice = history[:t]
        actual = history[t]
        actuals.append(actual)

        # 1-step ahead forecast
        p_ma = predict_moving_average(train_slice, horizon=1)[0]
        p_es = predict_exponential_smoothing(train_slice, horizon=1)[0]
        p_ml = predict_ml_ridge(train_slice, horizon=1)[0]

        preds_ma.append(p_ma)
        preds_es.append(p_es)
        preds_ml.append(p_ml)

        res_ma.append(p_ma - actual)
        res_es.append(p_es - actual)
        res_ml.append(p_ml - actual)

    metrics_ma = calculate_metrics(actuals, preds_ma)
    metrics_ma["residuals"] = res_ma

    metrics_es = calculate_metrics(actuals, preds_es)
    metrics_es["residuals"] = res_es

    metrics_ml = calculate_metrics(actuals, preds_ml)
    metrics_ml["residuals"] = res_ml

    # Model selection based on lowest WAPE, then lowest RMSE
    candidates = [
        ("ml_ridge", metrics_ml),
        ("exp_smoothing", metrics_es),
        ("baseline", metrics_ma),
    ]

    valid = [c for c in candidates if c[1]["wape"] is not None]
    if valid:
        best_model = min(valid, key=lambda x: (x[1]["wape"], x[1]["rmse"]))[0]
    else:
        best_model = "baseline"

    return {
        "baseline": metrics_ma,
        "exp_smoothing": metrics_es,
        "ml_ridge": metrics_ml,
        "best_model": best_model,
    }


def compute_prediction_intervals(
    point_forecast: List[float], residuals: List[float]
) -> List[Tuple[float, float]]:
    """
    Empirical prediction intervals from out-of-sample backtest residuals.
    If sparse/empty, falls back to normal error dispersion based on variance.
    """
    if len(residuals) >= 3:
        # Use empirical quantiles of absolute error
        abs_res = np.abs(residuals)
        q10_offset = float(np.percentile(abs_res, 10))
        q90_offset = float(np.percentile(abs_res, 90))
    elif len(residuals) > 0:
        std_err = float(np.std(residuals)) or (float(np.mean(np.abs(residuals))) * 0.5)
        q10_offset = 0.5 * std_err
        q90_offset = 1.645 * std_err
    else:
        q10_offset = 0.0
        q90_offset = 0.0

    intervals: List[Tuple[float, float]] = []
    for idx, mean_val in enumerate(point_forecast):
        # Uncertainty grows slightly with horizon step sqrt(h)
        step_factor = math.sqrt(idx + 1)
        if q90_offset > 0:
            margin_low = q10_offset * step_factor
            margin_high = q90_offset * step_factor
            p10 = max(0.0, round(mean_val - margin_low, 4))
            p90 = max(0.0, round(mean_val + margin_high, 4))
        else:
            # Sane baseline default if 0 residuals
            p10 = max(0.0, round(mean_val * 0.85, 4))
            p90 = max(0.0, round(mean_val * 1.15, 4))
        intervals.append((p10, p90))

    return intervals


def generate_forecast(
    history: List[Dict[str, Any]],
    horizon: int = 4,
    preferred_model: str = "auto",
) -> Dict[str, Any]:
    """
    Main forecast entrypoint for Phase 1.
    Performs walk-forward evaluation, selects model, computes forecast and empirical intervals.
    """
    if horizon < 1:
        raise ValueError("horizon must be >= 1")

    series = extract_series(history)
    n = len(series)

    if n == 0:
        points = [
            {"period": i, "mean": 0.0, "p10": 0.0, "p90": 0.0}
            for i in range(1, horizon + 1)
        ]
        return {
            "model_used": "fallback_zero",
            "selected_model": "baseline",
            "eval_metrics": {},
            "forecast": points,
            "history_length": 0,
        }

    # Run backtesting
    bt_results = backtest_walk_forward(series)
    best_candidate = bt_results["best_model"]

    # Resolve chosen model
    if preferred_model == "auto":
        model_name = best_candidate
    elif preferred_model in ("baseline", "exp_smoothing", "ml_ridge"):
        model_name = preferred_model
    else:
        model_name = "baseline"

    # Compute point forecast
    if model_name == "ml_ridge":
        point_preds = predict_ml_ridge(series, horizon)
    elif model_name == "exp_smoothing":
        point_preds = predict_exponential_smoothing(series, horizon)
    else:
        model_name = "baseline"
        point_preds = predict_moving_average(series, horizon)

    # Compute intervals using empirical residuals from chosen model
    model_metrics = bt_results.get(model_name, {})
    residuals = model_metrics.get("residuals", []) if isinstance(model_metrics, dict) else []
    intervals = compute_prediction_intervals(point_preds, residuals)

    points = []
    for i, mean_val in enumerate(point_preds):
        p10, p90 = intervals[i]
        points.append({
            "period": i + 1,
            "mean": mean_val,
            "p10": p10,
            "p90": p90,
        })

    # Clean eval metrics for API response (remove raw residuals list)
    clean_eval = {}
    for m_key in ("baseline", "exp_smoothing", "ml_ridge"):
        m_data = dict(bt_results.get(m_key, {}))
        m_data.pop("residuals", None)
        clean_eval[m_key] = m_data

    return {
        "model_used": model_name,
        "selected_model": best_candidate,
        "eval_metrics": clean_eval,
        "forecast": points,
        "history_length": n,
    }
