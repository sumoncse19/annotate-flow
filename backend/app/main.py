import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import AppError, app_error_handler, general_error_handler
from app.core.middleware import RequestLoggingMiddleware
from app.core.rate_limit import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.features.auth.router import router as auth_router
from app.features.pipeline.router import router as pipeline_router
from app.features.projects.router import router as projects_router
from app.features.submissions.router import router as submissions_router
from app.features.tasks.router import router as tasks_router
import app.shared.models  # noqa: F401 — register all ORM models at startup
from app.shared.storage import ensure_bucket

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ensure_bucket()
        logger.info("MinIO bucket verified")
    except Exception:
        logger.warning("MinIO not available — skipping bucket check")
    yield
    logger.info("Shutting down AnnotateFlow")


app = FastAPI(
    title="AnnotateFlow",
    description="AI Data Annotation & Processing Platform",
    version="1.0.0",
    lifespan=lifespan,
)
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(",") if settings.ALLOWED_ORIGINS else ["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SlowAPIMiddleware)

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(Exception, general_error_handler)

app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(tasks_router)
app.include_router(submissions_router)
app.include_router(pipeline_router)


@app.get("/api/health")
async def health_check():
    from sqlalchemy import text as sa_text
    from app.core.database import async_session
    from app.shared.storage import s3_client
    import redis.asyncio as aioredis

    checks: dict = {}

    # Postgres
    try:
        async with async_session() as db:
            await db.execute(sa_text("SELECT 1"))
        checks["postgres"] = "ok"
    except Exception as e:
        logger.error("Health check postgres failed: %s", e)
        checks["postgres"] = "error"

    # Redis
    try:
        r = aioredis.from_url(settings.REDIS_URL)
        await r.ping()
        await r.aclose()
        checks["redis"] = "ok"
    except Exception as e:
        logger.error("Health check redis failed: %s", e)
        checks["redis"] = "error"

    # MinIO
    try:
        s3_client.head_bucket(Bucket=settings.MINIO_BUCKET)
        checks["minio"] = "ok"
    except Exception as e:
        logger.error("Health check minio failed: %s", e)
        checks["minio"] = "error"

    healthy = all(v == "ok" for v in checks.values())
    return {
        "status": "healthy" if healthy else "degraded",
        "service": "annotateflow",
        "dependencies": checks,
    }
