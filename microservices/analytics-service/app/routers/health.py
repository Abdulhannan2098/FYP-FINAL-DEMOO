from fastapi import APIRouter
from datetime import datetime
from app.database import ping_db

router = APIRouter()


@router.get("/health", summary="Health check")
async def health_check():
    db_ok = ping_db()
    return {
        "status": "healthy" if db_ok else "degraded",
        "service": "analytics-service",
        "version": "1.0.0",
        "database": "connected" if db_ok else "unreachable",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
