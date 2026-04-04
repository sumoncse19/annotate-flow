import logging
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.features.auth.models import User
from app.features.projects.models import Project
from app.features.projects.schemas import ProjectResponse
from app.features.submissions.models import Submission
from app.features.tasks.models import Task
from app.shared.storage import delete_objects_by_prefix

logger = logging.getLogger(__name__)


async def create_project(db: AsyncSession, name: str, description: str | None, owner: User) -> ProjectResponse:
    project = Project(name=name, description=description, owner_id=owner.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return ProjectResponse(
        id=project.id, name=project.name, description=project.description,
        owner_id=project.owner_id, created_at=project.created_at, task_count=0,
    )


async def list_projects(db: AsyncSession, skip: int, limit: int, search: str | None = None) -> dict:
    base = select(Project)
    if search:
        base = base.where(Project.name.ilike(f"%{search}%"))

    # Total count
    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Data query
    query = (
        select(Project, func.count(Task.id).label("task_count"))
        .outerjoin(Task, Task.project_id == Project.id)
        .group_by(Project.id)
        .order_by(Project.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if search:
        query = query.where(Project.name.ilike(f"%{search}%"))

    result = await db.execute(query)
    items = [
        ProjectResponse(
            id=p.id, name=p.name, description=p.description,
            owner_id=p.owner_id, created_at=p.created_at, task_count=tc,
        )
        for p, tc in result.all()
    ]
    return {"items": items, "total": total, "skip": skip, "limit": limit}


async def get_project(db: AsyncSession, project_id: uuid.UUID) -> ProjectResponse:
    query = (
        select(Project, func.count(Task.id).label("task_count"))
        .outerjoin(Task, Task.project_id == Project.id)
        .where(Project.id == project_id)
        .group_by(Project.id)
    )
    result = await db.execute(query)
    row = result.one_or_none()
    if not row:
        raise NotFoundError("Project not found")
    p, tc = row
    return ProjectResponse(
        id=p.id, name=p.name, description=p.description,
        owner_id=p.owner_id, created_at=p.created_at, task_count=tc,
    )


async def delete_project(db: AsyncSession, project_id: uuid.UUID, current_user: User) -> None:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise NotFoundError("Project not found")
    if project.owner_id != current_user.id:
        raise ForbiddenError("Not the project owner")

    # Collect all file keys before deleting DB records
    file_keys_result = await db.execute(
        select(Submission.file_key)
        .join(Task, Task.id == Submission.task_id)
        .where(Task.project_id == project_id)
    )
    file_keys = [row[0] for row in file_keys_result.all()]

    # Delete project (cascades to tasks → submissions in DB)
    await db.delete(project)
    await db.commit()

    # Clean up S3 files — find the common prefix from file keys
    if file_keys:
        # Keys look like: submissions/{project_slug}_{id[:8]}/image/file.png
        # Extract the project folder prefix
        prefixes = set()
        for key in file_keys:
            parts = key.split("/")
            if len(parts) >= 3:
                prefixes.add(f"{parts[0]}/{parts[1]}/")
        for prefix in prefixes:
            deleted = delete_objects_by_prefix(prefix)
            logger.info("Deleted %d files from S3 prefix: %s", deleted, prefix)
