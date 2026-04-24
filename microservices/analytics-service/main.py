import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, analytics
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AutoSphere Analytics Service",
    description=(
        "Read-only microservice that queries the AutoSphere MongoDB database and exposes "
        "aggregated analytics: overview stats, order breakdown, product stats, user growth, revenue."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


@app.on_event("startup")
async def on_startup():
    logger.info(f"🚀  Analytics Service  —  port {settings.PORT}")
    logger.info(f"🗄️   MongoDB: {settings.MONGODB_URI[:40]}...")
    logger.info(f"📄  Docs: http://localhost:{settings.PORT}/docs")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=False)
