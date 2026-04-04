import logging
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.features.projects.models import Project
from app.features.submissions.models import Submission
from app.features.tasks.models import Task, TaskStatus, TaskType
from app.features.tasks.schemas import TaskResponse, TaskUpdate
from app.shared.storage import delete_objects_by_prefix

logger = logging.getLogger(__name__)


async def create_task(
    db: AsyncSession, project_id: uuid.UUID, title: str,
    description: str | None, task_type: str, priority: int,
) -> TaskResponse:
    result = await db.execute(select(Project).where(Project.id == project_id))
    if not result.scalar_one_or_none():
        raise NotFoundError("Project not found")

    task = Task(
        title=title, description=description, task_type=task_type,
        priority=priority, project_id=project_id,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return TaskResponse(
        id=task.id, title=task.title, description=task.description,
        task_type=task.task_type, status=task.status, priority=task.priority,
        project_id=task.project_id, created_at=task.created_at, submission_count=0,
    )


async def list_tasks(
    db: AsyncSession, project_id: uuid.UUID,
    status_filter: TaskStatus | None, type_filter: TaskType | None = None,
    search: str | None = None, skip: int = 0, limit: int = 20,
) -> dict:
    base_filters = [Task.project_id == project_id]
    if status_filter:
        base_filters.append(Task.status == status_filter)
    if type_filter:
        base_filters.append(Task.task_type == type_filter)
    if search:
        base_filters.append(Task.title.ilike(f"%{search}%"))

    # Total count
    count_q = select(func.count(Task.id)).where(*base_filters)
    total = (await db.execute(count_q)).scalar() or 0

    # Data query
    query = (
        select(Task, func.count(Submission.id).label("submission_count"))
        .outerjoin(Submission, Submission.task_id == Task.id)
        .where(*base_filters)
        .group_by(Task.id)
        .order_by(Task.priority.desc(), Task.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    items = [
        TaskResponse(
            id=t.id, title=t.title, description=t.description,
            task_type=t.task_type, status=t.status, priority=t.priority,
            project_id=t.project_id, created_at=t.created_at, submission_count=c,
        )
        for t, c in result.all()
    ]
    return {"items": items, "total": total, "skip": skip, "limit": limit}


async def update_task(
    db: AsyncSession, project_id: uuid.UUID, task_id: uuid.UUID, body: TaskUpdate,
) -> TaskResponse:
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise NotFoundError("Task not found")

    count_result = await db.execute(
        select(func.count(Submission.id)).where(Submission.task_id == task.id)
    )
    submission_count = count_result.scalar() or 0

    updates = body.model_dump(exclude_unset=True)
    if "task_type" in updates and submission_count > 0:
        raise ForbiddenError("Cannot change task type after files have been uploaded")

    for field, value in updates.items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)

    return TaskResponse(
        id=task.id, title=task.title, description=task.description,
        task_type=task.task_type, status=task.status, priority=task.priority,
        project_id=task.project_id, created_at=task.created_at,
        submission_count=submission_count,
    )


async def delete_task(db: AsyncSession, project_id: uuid.UUID, task_id: uuid.UUID) -> None:
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise NotFoundError("Task not found")

    # Collect file keys before delete
    file_keys_result = await db.execute(
        select(Submission.file_key).where(Submission.task_id == task_id)
    )
    file_keys = [row[0] for row in file_keys_result.all()]

    await db.delete(task)
    await db.commit()

    # Clean up S3 files
    for key in file_keys:
        try:
            from app.shared.storage import s3_client
            from app.core.config import settings
            s3_client.delete_object(Bucket=settings.MINIO_BUCKET, Key=key)
        except Exception:
            logger.warning("Failed to delete S3 object: %s", key)
