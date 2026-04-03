from fastapi import APIRouter, Query

from app.core.database import SessionDep
from app.features.auth.dependencies import CurrentUser
from app.features.pipeline import service

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.get("/status")
async def pipeline_status(current_user: CurrentUser, db: SessionDep):
    return await service.get_pipeline_status(db)


@router.get("/recent")
async def recent_jobs(
    current_user: CurrentUser,
    db: SessionDep,
    limit: int = Query(20, ge=1, le=100),
):
    return await service.get_recent_jobs(db, limit)


@router.get("/analytics")
async def analytics(current_user: CurrentUser, db: SessionDep):
    return await service.get_analytics(db)
