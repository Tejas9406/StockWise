"""
Phase 3 — Model Monitoring & Drift Detection Service
Compares recent prediction accuracy against historical baseline
to detect concept drift, data distribution shifts, and model staleness.
"""
import numpy as np
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime


# ─── Schemas ─────────────────────────────────────────────────────────
class PredictionRecord(BaseModel):
    """A single prediction-vs-actual record for monitoring."""
    date: str
    predicted: float
    actual: float
    product_id: Optional[int] = None
    store_id: Optional[int] = None

class DriftDetectionRequest(BaseModel):
    """Request for model drift analysis."""
    model_name: str = "GBR-Demand-v2.2"
    predictions: List[PredictionRecord]
    baseline_mae: float = 0.0
    baseline_wape: float = 0.0
    window_size: int = 7  # Rolling window for recent performance

class DriftMetrics(BaseModel):
    overall_mae: float
    overall_rmse: float
    overall_wape: float
    recent_mae: float
    recent_rmse: float
    recent_wape: float
    baseline_mae: float
    baseline_wape: float
    mae_drift_pct: float
    wape_drift_pct: float
    drift_detected: bool
    drift_severity: str  # NONE | LOW | MEDIUM | HIGH | CRITICAL
    drift_message: str
    data_points_total: int
    data_points_recent: int

class DriftDetectionResponse(BaseModel):
    model_name: str
    analysis_timestamp: str
    metrics: DriftMetrics
    recommendation: str
    needs_retraining: bool


# ─── Core Drift Detection ───────────────────────────────────────────
def detect_model_drift(req: DriftDetectionRequest) -> DriftDetectionResponse:
    """
    Analyzes model prediction accuracy over time to detect performance degradation.
    Uses WAPE drift and MAE drift as primary signals.
    """
    predictions = req.predictions
    n = len(predictions)

    if n < 3:
        return DriftDetectionResponse(
            model_name=req.model_name,
            analysis_timestamp=datetime.now().isoformat(),
            metrics=DriftMetrics(
                overall_mae=0, overall_rmse=0, overall_wape=0,
                recent_mae=0, recent_rmse=0, recent_wape=0,
                baseline_mae=req.baseline_mae, baseline_wape=req.baseline_wape,
                mae_drift_pct=0, wape_drift_pct=0,
                drift_detected=False, drift_severity="NONE",
                drift_message="Insufficient prediction data for drift detection (minimum 3 records required).",
                data_points_total=n, data_points_recent=0
            ),
            recommendation="Collect more prediction-vs-actual pairs before drift analysis is meaningful.",
            needs_retraining=False
        )

    # Extract arrays
    y_pred = np.array([p.predicted for p in predictions])
    y_actual = np.array([p.actual for p in predictions])

    # Overall metrics
    errors = np.abs(y_actual - y_pred)
    overall_mae = float(np.mean(errors))
    overall_rmse = float(np.sqrt(np.mean((y_actual - y_pred) ** 2)))
    denom = float(np.sum(np.abs(y_actual)))
    overall_wape = round((float(np.sum(errors)) / denom * 100.0), 2) if denom > 0 else 0.0

    # Recent window metrics
    window = min(req.window_size, n)
    recent_pred = y_pred[-window:]
    recent_actual = y_actual[-window:]
    recent_errors = np.abs(recent_actual - recent_pred)
    recent_mae = float(np.mean(recent_errors))
    recent_rmse = float(np.sqrt(np.mean((recent_actual - recent_pred) ** 2)))
    recent_denom = float(np.sum(np.abs(recent_actual)))
    recent_wape = round((float(np.sum(recent_errors)) / recent_denom * 100.0), 2) if recent_denom > 0 else 0.0

    # Drift calculation
    reference_mae = req.baseline_mae if req.baseline_mae > 0 else overall_mae
    reference_wape = req.baseline_wape if req.baseline_wape > 0 else overall_wape

    mae_drift_pct = round(((recent_mae - reference_mae) / max(0.01, reference_mae)) * 100, 1) if reference_mae > 0 else 0.0
    wape_drift_pct = round(((recent_wape - reference_wape) / max(0.01, reference_wape)) * 100, 1) if reference_wape > 0 else 0.0

    # Drift severity classification
    max_drift = max(abs(mae_drift_pct), abs(wape_drift_pct))
    if max_drift >= 80:
        drift_severity = "CRITICAL"
        drift_detected = True
        drift_msg = f"Critical model degradation detected: {max_drift:.0f}% drift from baseline. Immediate retraining required."
    elif max_drift >= 50:
        drift_severity = "HIGH"
        drift_detected = True
        drift_msg = f"Significant performance drift of {max_drift:.0f}%. Model predictions are unreliable. Schedule retraining."
    elif max_drift >= 25:
        drift_severity = "MEDIUM"
        drift_detected = True
        drift_msg = f"Moderate drift of {max_drift:.0f}% detected. Model still functional but accuracy declining."
    elif max_drift >= 10:
        drift_severity = "LOW"
        drift_detected = False
        drift_msg = f"Minor drift of {max_drift:.0f}% observed. Within acceptable operational bounds."
    else:
        drift_severity = "NONE"
        drift_detected = False
        drift_msg = "Model performance is stable. No drift detected."

    # Recommendation
    if drift_detected and drift_severity in ["CRITICAL", "HIGH"]:
        recommendation = "Retrain model immediately with latest 30+ days of sales data. Consider feature engineering review."
        needs_retraining = True
    elif drift_detected:
        recommendation = "Schedule model retraining within the next cycle. Monitor closely for further degradation."
        needs_retraining = False
    else:
        recommendation = "Model is performing well. Continue regular monitoring."
        needs_retraining = False

    return DriftDetectionResponse(
        model_name=req.model_name,
        analysis_timestamp=datetime.now().isoformat(),
        metrics=DriftMetrics(
            overall_mae=round(overall_mae, 2),
            overall_rmse=round(overall_rmse, 2),
            overall_wape=overall_wape,
            recent_mae=round(recent_mae, 2),
            recent_rmse=round(recent_rmse, 2),
            recent_wape=recent_wape,
            baseline_mae=round(reference_mae, 2),
            baseline_wape=round(reference_wape, 2),
            mae_drift_pct=mae_drift_pct,
            wape_drift_pct=wape_drift_pct,
            drift_detected=drift_detected,
            drift_severity=drift_severity,
            drift_message=drift_msg,
            data_points_total=n,
            data_points_recent=window
        ),
        recommendation=recommendation,
        needs_retraining=needs_retraining
    )
