import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.features.projects.models import Project
from app.features.submissions.models import Submission
from app.features.tasks.models import Task, TaskStatus
from app.features.tasks.schemas import TaskResponse, TaskUpdate


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
    status_filter: TaskStatus | None, skip: int, limit: int,
) -> list[TaskResponse]:
    query = (
        select(Task, func.count(Submission.id).label("submission_count"))
        .outerjoin(Submission, Submission.task_id == Task.id)
        .where(Task.project_id == project_id)
        .group_by(Task.id)
        .order_by(Task.priority.desc(), Task.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if status_filter:
        query = query.where(Task.status == status_filter)
    result = await db.execute(query)
    return [
        TaskResponse(
            id=t.id, title=t.title, description=t.description,
            task_type=t.task_type, status=t.status, priority=t.priority,
            project_id=t.project_id, created_at=t.created_at, submission_count=c,
        )
        for t, c in result.all()
    ]


async def update_task(
    db: AsyncSession, project_id: uuid.UUID, task_id: uuid.UUID, body: TaskUpdate,
) -> TaskResponse:
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise NotFoundError("Task not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)

    count_result = await db.execute(
        select(func.count(Submission.id)).where(Submission.task_id == task.id)
    )
    return TaskResponse(
        id=task.id, title=task.title, description=task.description,
        task_type=task.task_type, status=task.status, priority=task.priority,
        project_id=task.project_id, created_at=task.created_at,
        submission_count=count_result.scalar() or 0,
    )
