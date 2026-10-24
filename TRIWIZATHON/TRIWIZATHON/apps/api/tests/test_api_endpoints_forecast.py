from app.domain.schemas import KPISnapshot


def test_api_forecast_and_model_evaluation(client, baseline):
    res = client.get("/api/v1/forecast?destination_id=DST-01&product_id=PRD-A&horizon=4&model=auto")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["destination_id"] == "DST-01"
    assert body["product_id"] == "PRD-A"
    assert body["horizon"] == 4
    assert "model" in body
    assert "selected_model" in body
    assert "eval_metrics" in body
    assert len(body["forecast"]) == 4

    # Each forecast point contains mean, p10, p90 with p10 <= mean <= p90
    for pt in body["forecast"]:
        assert pt["p10"] <= pt["mean"] <= pt["p90"]


def test_api_replenishment_and_expiry_endpoint(client, baseline):
    res = client.get("/api/v1/replenishment")
    assert res.status_code == 200, res.text
    body = res.json()
    assert "recommendations" in body
    assert "expiry_risks" in body
    assert len(body["recommendations"]) > 0

    first_rec = body["recommendations"][0]
    assert "forecast_demand" in first_rec
    assert "suggested_replenishment" in first_rec
    assert "reasoning" in first_rec
    assert "stockout_risk" in first_rec
