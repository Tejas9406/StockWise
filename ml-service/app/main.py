import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.forecast import router as forecast_router
from app.routes.risk import router as risk_router
from app.routes.expiry import router as expiry_router
from app.routes.optimization import router as optimization_router
from app.routes.simulation import router as simulation_router
from app.routes.monitoring import router as monitoring_router

app = FastAPI(
    title="StockWise AI Intelligence, Optimization & Decision Intelligence Service",
    description="Microservice powering demand forecasting, predictive risk, expiry FEFO, PuLP MILP allocation optimization, What-If scenario simulation, and model drift monitoring.",
    version="3.0.0"
)

# Enable CORS for Express backend gateway
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 2 Routes
app.include_router(forecast_router, prefix="/api/ai")
app.include_router(risk_router, prefix="/api/ai")
app.include_router(expiry_router, prefix="/api/ai")
app.include_router(optimization_router, prefix="/api/ai")

# Phase 3 Routes
app.include_router(simulation_router, prefix="/api/ai")
app.include_router(monitoring_router, prefix="/api/ai")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "StockWise Python FastAPI ML Service",
        "version": "3.0.0",
        "phase": "Phase 3 — Decision Intelligence + What-If Simulation + Model Monitoring",
        "capabilities": [
            "ML Demand Forecasting (GradientBoosting / Chronological)",
            "Predictive Stockout & Excess Risk Assessment",
            "Advanced FEFO & Expiry Exposure Analysis",
            "PuLP Mixed-Integer Linear Optimization",
            "What-If Scenario Simulation Engine",
            "Model Drift Detection & Continuous Monitoring"
        ]
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
