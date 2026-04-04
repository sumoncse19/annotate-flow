import uuid

from fastapi import APIRouter, Query, status

from app.core.database import SessionDep
from app.features.auth.dependencies import CurrentUser
from app.features.tasks.models import TaskStatus, TaskType
from app.features.tasks.schemas import TaskCreate, TaskResponse, TaskUpdate
from app.features.tasks import service

router = APIRouter(prefix="/api/projects/{project_id}/tasks", tags=["tasks"])


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(project_id: uuid.UUID, body: TaskCreate, current_user: CurrentUser, db: SessionDep):
    return await service.create_task(
        db, project_id, body.title, body.description, body.task_type, body.priority,
    )


@router.get("/")
async def list_tasks(
    project_id: uuid.UUID,
    db: SessionDep,
    current_user: CurrentUser,
    search: str | None = Query(None),
    status_filter: TaskStatus | None = Query(None, alias="status"),
    type_filter: TaskType | None = Query(None, alias="type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    return await service.list_tasks(db, project_id, status_filter, type_filter, search, skip, limit)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    project_id: uuid.UUID, task_id: uuid.UUID, body: TaskUpdate,
    current_user: CurrentUser, db: SessionDep,
):
    return await service.update_task(db, project_id, task_id, body)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(project_id: uuid.UUID, task_id: uuid.UUID, current_user: CurrentUser, db: SessionDep):
    await service.delete_task(db, project_id, task_id)
