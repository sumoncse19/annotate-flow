import uuid
from datetime import datetime

from pydantic import BaseModel

from app.features.submissions.models import ProcessingStatus


class SubmissionCreate(BaseModel):
    file_name: str
    file_size: int | None = None
    content_type: str | None = None


class SubmissionResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    contributor_id: uuid.UUID
    file_key: str
    file_name: str
    file_size: int | None
    content_type: str | None
    processing_status: ProcessingStatus
    processing_result: dict | None
    celery_task_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PresignedUploadResponse(BaseModel):
    submission_id: uuid.UUID
    upload_url: str
    file_key: str
