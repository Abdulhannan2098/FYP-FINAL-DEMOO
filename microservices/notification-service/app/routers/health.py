from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health", summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "service": "notification-service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
