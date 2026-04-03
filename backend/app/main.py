import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.exceptions import AppError, app_error_handler, general_error_handler
from app.features.auth.router import router as auth_router
from app.features.pipeline.router import router as pipeline_router
from app.features.projects.router import router as projects_router
from app.features.submissions.router import router as submissions_router
from app.features.tasks.router import router as tasks_router
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(Exception, general_error_handler)

app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(tasks_router)
app.include_router(submissions_router)
app.include_router(pipeline_router)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "annotateflow"}
