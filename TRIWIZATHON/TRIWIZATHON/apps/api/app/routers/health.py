from fastapi import APIRouter

from app.core.config import settings
from app.repo.database import _connect

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health")
def health_check():
    # Check DB connectivity
    db_status = "ok"
    try:
        conn = _connect()
        conn.execute("SELECT 1")
        conn.close()
    except Exception:
        db_status = "error"
    return {"status": "ok", "version": "1.0.0", "solver": settings.solver, "db": db_status}
