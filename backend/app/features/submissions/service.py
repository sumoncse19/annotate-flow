import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.features.auth.models import User
from app.features.submissions.models import ProcessingStatus, Submission
from app.features.tasks.models import Task
from app.shared.storage import generate_presigned_download_url, generate_presigned_upload_url


async def create_submission(
    db: AsyncSession, task_id: uuid.UUID, contributor: User,
    file_name: str, file_size: int | None, content_type: str | None,
) -> tuple[Submission, str]:
    """Create a submission record and return it with a presigned upload URL."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    if not result.scalar_one_or_none():
        raise NotFoundError("Task not found")

    file_key = f"submissions/{task_id}/{uuid.uuid4()}/{file_name}"
    submission = Submission(
        task_id=task_id, contributor_id=contributor.id, file_key=file_key,
        file_name=file_name, file_size=file_size, content_type=content_type,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    upload_url = generate_presigned_upload_url(
        key=file_key, content_type=content_type or "application/octet-stream",
    )
    return submission, upload_url


async def confirm_upload(
    db: AsyncSession, task_id: uuid.UUID, submission_id: uuid.UUID, contributor: User,
) -> Submission:
    """Confirm a file upload and trigger Celery processing."""
    result = await db.execute(
        select(Submission).where(
            Submission.id == submission_id,
            Submission.task_id == task_id,
            Submission.contributor_id == contributor.id,
        )
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise NotFoundError("Submission not found")

    from app.worker import process_submission
    celery_result = process_submission.delay(str(submission.id))
    submission.celery_task_id = celery_result.id
    submission.processing_status = ProcessingStatus.PROCESSING
    await db.commit()
    await db.refresh(submission)
    return submission


async def list_submissions(
    db: AsyncSession, task_id: uuid.UUID,
    status_filter: ProcessingStatus | None, skip: int, limit: int,
) -> list[Submission]:
    query = (
        select(Submission)
        .where(Submission.task_id == task_id)
        .order_by(Submission.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if status_filter:
        query = query.where(Submission.processing_status == status_filter)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_submission(db: AsyncSession, task_id: uuid.UUID, submission_id: uuid.UUID) -> Submission:
    result = await db.execute(
        select(Submission).where(Submission.id == submission_id, Submission.task_id == task_id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise NotFoundError("Submission not found")
    return submission


async def get_download_url(db: AsyncSession, task_id: uuid.UUID, submission_id: uuid.UUID) -> str:
    submission = await get_submission(db, task_id, submission_id)
    return generate_presigned_download_url(submission.file_key)
