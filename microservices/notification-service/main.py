import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, notifications
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AutoSphere Notification Service",
    description=(
        "Microservice responsible for all email notifications in the AutoSphere platform. "
        "Accepts structured requests from the monolith and renders + delivers HTML emails via SMTP."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(notifications.router, prefix="/api/notify", tags=["Notifications"])


@app.on_event("startup")
async def on_startup():
    logger.info(f"🚀  Notification Service  —  port {settings.PORT}")
    logger.info(f"📧  SMTP: {settings.EMAIL_HOST}:{settings.EMAIL_PORT} (user: {settings.EMAIL_USER or 'NOT SET'})")
    logger.info(f"📄  Docs: http://localhost:{settings.PORT}/docs")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=False)
