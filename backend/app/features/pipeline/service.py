from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.submissions.models import ProcessingStatus, Submission


async def get_pipeline_status(db: AsyncSession) -> dict:
    query = select(
        Submission.processing_status, func.count(Submission.id)
    ).group_by(Submission.processing_status)
    result = await db.execute(query)
    counts = {row[0].value: row[1] for row in result.all()}
    return {
        "pending": counts.get("pending", 0),
        "processing": counts.get("processing", 0),
        "completed": counts.get("completed", 0),
        "failed": counts.get("failed", 0),
        "total": sum(counts.values()),
    }


async def get_recent_jobs(db: AsyncSession, limit: int) -> list[dict]:
    query = (
        select(Submission)
        .order_by(Submission.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return [
        {
            "id": str(s.id),
            "file_name": s.file_name,
            "content_type": s.content_type,
            "processing_status": s.processing_status.value,
            "processing_result": s.processing_result,
            "celery_task_id": s.celery_task_id,
            "created_at": s.created_at.isoformat(),
        }
        for s in result.scalars().all()
    ]
