import uuid
from datetime import datetime

from pydantic import BaseModel

from app.features.tasks.models import TaskStatus, TaskType


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    task_type: TaskType
    priority: int = 0


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    task_type: TaskType | None = None
    status: TaskStatus | None = None
    priority: int | None = None


class TaskResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    task_type: TaskType
    status: TaskStatus
    priority: int
    project_id: uuid.UUID
    created_at: datetime
    submission_count: int = 0

    model_config = {"from_attributes": True}
