import re
import uuid
from pathlib import PurePosixPath

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError

ALLOWED_CONTENT_TYPES: dict[str, list[str]] = {
    "image": ["image/"],
    "audio": ["audio/"],
    "text": ["text/", "application/json", "application/xml"],
}
from app.features.auth.models import User
from app.features.projects.models import Project
from app.features.submissions.models import ProcessingStatus, Submission
from app.features.tasks.models import Task
from app.shared.storage import generate_presigned_download_url, generate_presigned_upload_url


def _sanitize_name(name: str) -> str:
    """Replace spaces with underscores and strip non-safe characters."""
    name = name.strip().replace(" ", "_")
    name = re.sub(r"[^\w.\-]", "", name)
    return name or "file"


def _slugify_project_name(name: str) -> str:
    """Convert project name to a URL-safe slug."""
    slug = name.strip().lower().replace(" ", "_")
    slug = re.sub(r"[^\w\-]", "", slug)
    return slug or "project"


async def _resolve_unique_file_key(
    db: AsyncSession, base_dir: str, sanitized_name: str,
) -> str:
    """If a file with the same name already exists in this folder, append _01, _02, etc."""
    stem = PurePosixPath(sanitized_name).stem
    suffix = PurePosixPath(sanitized_name).suffix

    # Check how many submissions already use this base name in the same directory
    pattern = f"{base_dir}/{stem}%"
    result = await db.execute(
        select(func.count(Submission.id)).where(Submission.file_key.like(pattern))
    )
    count = result.scalar() or 0

    if count == 0:
        return f"{base_dir}/{sanitized_name}"
    return f"{base_dir}/{stem}_{count:02d}{suffix}"


async def create_submission(
    db: AsyncSession, task_id: uuid.UUID, contributor: User,
    file_name: str, file_size: int | None, content_type: str | None,
) -> tuple[Submission, str]:
    """Create a submission record and return it with a presigned upload URL."""
    # Look up task + project in one query
    result = await db.execute(
        select(Task, Project)
        .join(Project, Project.id == Task.project_id)
        .where(Task.id == task_id)
    )
    row = result.one_or_none()
    if not row:
        raise NotFoundError("Task not found")
    task, project = row

    # Validate content type matches task type
    ct = (content_type or "").lower()
    allowed = ALLOWED_CONTENT_TYPES.get(task.task_type.value, [])
    if ct and not any(ct.startswith(prefix) for prefix in allowed):
        raise ForbiddenError(
            f"File type '{content_type}' not allowed for {task.task_type.value} tasks"
        )

    # Build path: submissions/{project_slug}_{unique_id}/{task_type}/{file_name}
    project_slug = _slugify_project_name(project.name)
    project_folder = f"{project_slug}_{str(project.id)[:8]}"
    task_type_folder = task.task_type.value  # image, audio, or text
    sanitized_name = _sanitize_name(file_name)

    base_dir = f"submissions/{project_folder}/{task_type_folder}"
    file_key = await _resolve_unique_file_key(db, base_dir, sanitized_name)

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


async def analyze_submission(db: AsyncSession, task_id: uuid.UUID, submission_id: uuid.UUID) -> dict:
    from app.features.submissions.ai_service import analyze_submission as ai_analyze

    submission = await get_submission(db, task_id, submission_id)
    if submission.processing_status != ProcessingStatus.COMPLETED:
        raise NotFoundError("Submission must be processed before analysis")

    result = submission.processing_result or {}

    # Check if already analyzed
    if result.get("ai_analysis"):
        return result["ai_analysis"]

    analysis = ai_analyze(result, submission.file_name, submission.content_type or "")

    # Store analysis in processing_result
    result["ai_analysis"] = analysis
    submission.processing_result = result
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(submission, "processing_result")
    await db.commit()

    return analysis
