import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base_model import Base


class TaskStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class TaskType(str, enum.Enum):
    IMAGE = "image"
    AUDIO = "audio"
    TEXT = "text"


class Task(Base):
    __tablename__ = "tasks"

    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    task_type: Mapped[TaskType] = mapped_column(Enum(TaskType))
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus), default=TaskStatus.OPEN, index=True
    )
    priority: Mapped[int] = mapped_column(Integer, default=0)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), index=True
    )

    project: Mapped["Project"] = relationship(back_populates="tasks")
    submissions: Mapped[list["Submission"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )
