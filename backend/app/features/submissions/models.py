import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base_model import Base


class ProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Submission(Base):
    __tablename__ = "submissions"

    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id"), index=True
    )
    contributor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), index=True
    )
    file_key: Mapped[str] = mapped_column(String(512))
    file_name: Mapped[str] = mapped_column(String(255))
    file_size: Mapped[int | None] = mapped_column()
    content_type: Mapped[str | None] = mapped_column(String(100))
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        Enum(ProcessingStatus), default=ProcessingStatus.PENDING, index=True
    )
    processing_result: Mapped[dict | None] = mapped_column(JSONB)
    celery_task_id: Mapped[str | None] = mapped_column(String(255))

    task: Mapped["Task"] = relationship(back_populates="submissions")
    contributor: Mapped["User"] = relationship(back_populates="submissions")
