from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_cors_origins
from app.core.errors import generic_exception_handler
from app.repo.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        title="Pre-Mortem Dispatch API",
        version="1.0.0",
        description=(
            "Distribution intelligence: baseline allocation, disruption simulation, "
            "impact analysis, recovery planning and scenario comparison."
        ),
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.add_exception_handler(Exception, generic_exception_handler)

    # Routers are imported here so the app object exists before module-level imports run
    from app.routers.datasets import router as datasets_router
    from app.routers.forecast import router as forecast_router
    from app.routers.health import router as health_router
    from app.routers.plans import router as plans_router
    from app.routers.scenarios import router as scenarios_router

    application.include_router(health_router)
    application.include_router(datasets_router)
    application.include_router(plans_router)
    application.include_router(scenarios_router)
    application.include_router(forecast_router)

    @application.get("/", tags=["meta"])
    def root():
        return {"message": "Pre-Mortem Dispatch API", "version": "1.0.0", "docs": "/docs"}

    return application


app = create_app()

# Ensure tables exist even when the app is used without the lifespan (e.g. tests)
try:
    init_db()
except Exception:  # pragma: no cover - defensive only
    pass
