import uuid

from fastapi import APIRouter, Query, Request, status

from app.core.database import SessionDep
from app.core.rate_limit import limiter
from app.features.auth.dependencies import CurrentUser
from app.features.submissions.models import ProcessingStatus
from app.features.submissions.schemas import PresignedUploadResponse, SubmissionCreate, SubmissionResponse
from app.features.submissions import service

router = APIRouter(prefix="/api/tasks/{task_id}/submissions", tags=["submissions"])


@router.post("/", response_model=PresignedUploadResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(task_id: uuid.UUID, body: SubmissionCreate, current_user: CurrentUser, db: SessionDep):
    submission, upload_url = await service.create_submission(
        db, task_id, current_user, body.file_name, body.file_size, body.content_type,
    )
    return PresignedUploadResponse(
        submission_id=submission.id, upload_url=upload_url, file_key=submission.file_key,
    )


@router.post("/{submission_id}/confirm", response_model=SubmissionResponse)
async def confirm_upload(task_id: uuid.UUID, submission_id: uuid.UUID, current_user: CurrentUser, db: SessionDep):
    return await service.confirm_upload(db, task_id, submission_id, current_user)


@router.get("/", response_model=list[SubmissionResponse])
async def list_submissions(
    task_id: uuid.UUID, db: SessionDep, current_user: CurrentUser,
    status_filter: ProcessingStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    return await service.list_submissions(db, task_id, status_filter, skip, limit)


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(task_id: uuid.UUID, submission_id: uuid.UUID, current_user: CurrentUser, db: SessionDep):
    return await service.get_submission(db, task_id, submission_id)


@router.get("/{submission_id}/download-url")
async def get_download_url(task_id: uuid.UUID, submission_id: uuid.UUID, current_user: CurrentUser, db: SessionDep):
    url = await service.get_download_url(db, task_id, submission_id)
    return {"download_url": url}


@router.post("/{submission_id}/analyze")
@limiter.limit("10/minute")
async def analyze_submission(request: Request, task_id: uuid.UUID, submission_id: uuid.UUID, current_user: CurrentUser, db: SessionDep):
    return await service.analyze_submission(db, task_id, submission_id)
