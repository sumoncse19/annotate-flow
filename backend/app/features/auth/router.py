from fastapi import APIRouter, Request, status

from app.core.database import SessionDep
from app.core.rate_limit import limiter
from app.features.auth.dependencies import CurrentUser
from app.features.auth.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.features.auth.service import authenticate_user, register_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, db: SessionDep):
    user = await register_user(db, body.email, body.password, body.full_name)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, db: SessionDep):
    token = await authenticate_user(db, body.email, body.password)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser):
    return current_user
