import uuid

from fastapi import APIRouter, Query, status

from app.core.database import SessionDep
from app.features.auth.dependencies import CurrentUser
from app.features.projects.schemas import ProjectCreate, ProjectResponse
from app.features.projects import service

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(body: ProjectCreate, current_user: CurrentUser, db: SessionDep):
    return await service.create_project(db, body.name, body.description, current_user)


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(
    db: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    return await service.list_projects(db, skip, limit)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: uuid.UUID, current_user: CurrentUser, db: SessionDep):
    return await service.get_project(db, project_id)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: uuid.UUID, current_user: CurrentUser, db: SessionDep):
    await service.delete_project(db, project_id, current_user)
