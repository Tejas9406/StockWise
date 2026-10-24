import pytest
from app.services.ml.engine import (
    extract_series,
    calculate_metrics,
    predict_moving_average,
    predict_exponential_smoothing,
    predict_ml_ridge,
    backtest_walk_forward,
    compute_prediction_intervals,
    generate_forecast,
)
from app.services.replenishment import (
    BatchInfo,
    evaluate_batch_expiry,
    calculate_replenishment,
)


def test_forecast_empty_and_sparse_history():
    # Empty history
    res_empty = generate_forecast([], horizon=4)
    assert res_empty["model_used"] == "fallback_zero"
    assert len(res_empty["forecast"]) == 4
    assert all(p["mean"] == 0.0 for p in res_empty["forecast"])

    # Single value history
    res_single = generate_forecast([{"quantity": 100}], horizon=3)
    assert len(res_single["forecast"]) == 3
    assert res_single["forecast"][0]["mean"] == 100.0


def test_metrics_calculation():
    actuals = [100.0, 120.0, 110.0]
    preds = [105.0, 115.0, 110.0]
    m = calculate_metrics(actuals, preds)
    assert m["mae"] == round((5.0 + 5.0 + 0.0) / 3, 4)
    assert m["n_eval"] == 3
    assert m["rmse"] is not None
    assert m["wape"] is not None
    assert m["bias"] is not None


def test_walk_forward_no_leakage_and_model_selection():
    # Linear upward trend
    history = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0]
    bt = backtest_walk_forward(history, min_train=3)
    assert "baseline" in bt
    assert "exp_smoothing" in bt
    assert "ml_ridge" in bt
    assert bt["best_model"] in ("exp_smoothing", "ml_ridge", "baseline")
    assert bt["baseline"]["n_eval"] == 5


def test_empirical_intervals_nonzero_and_ordered():
    preds = [100.0, 110.0, 120.0]
    residuals = [2.0, -3.0, 4.0, -1.0, 5.0]
    intervals = compute_prediction_intervals(preds, residuals)
    assert len(intervals) == 3
    for i, (p10, p90) in enumerate(intervals):
        assert p10 <= preds[i] <= p90
        assert p10 >= 0.0


def test_batch_expiry_detection():
    batches = [
        BatchInfo(batch_id="B1", warehouse_id="W1", product_id="P1", quantity=50, expiry_days=-1),  # expired
        BatchInfo(batch_id="B2", warehouse_id="W1", product_id="P1", quantity=100, expiry_days=1.0), # at risk
        BatchInfo(batch_id="B3", warehouse_id="W1", product_id="P1", quantity=200, expiry_days=60),  # safe
    ]
    eval_res = evaluate_batch_expiry(batches, daily_consumption_rate=5.0, lead_time_days=2.0)
    key = "W1_P1"
    assert key in eval_res
    res = eval_res[key]
    assert res.expired_stock == 50
    assert res.at_risk_stock == 100
    assert res.usable_stock == 200
    assert "B1" in res.batches_expired
    assert res.status == "critical"


def test_replenishment_logic_deficit_and_surplus():
    # Deficit scenario
    rec_deficit = calculate_replenishment(
        product_id="P1",
        forecast_demand=500,
        usable_inventory=200,
        incoming_stock=50,
        lead_time_days=3.0,
        demand_std_dev=30.0,
    )
    assert rec_deficit.suggested_replenishment > 0
    assert rec_deficit.stockout_risk in ("high", "critical")
    assert "Net deficit" in rec_deficit.reasoning

    # Surplus scenario
    rec_surplus = calculate_replenishment(
        product_id="P2",
        forecast_demand=100,
        usable_inventory=500,
        incoming_stock=0,
        lead_time_days=2.0,
    )
    assert rec_surplus.suggested_replenishment == 0.0
    assert rec_surplus.stockout_risk == "low"
    assert "Sufficient coverage" in rec_surplus.reasoning
