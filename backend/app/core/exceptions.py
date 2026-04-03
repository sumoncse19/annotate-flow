import logging

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppError(HTTPException):
    def __init__(self, code: str, message: str, status_code: int):
        self.code = code
        self.error_message = message
        super().__init__(status_code=status_code, detail=message)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__("NOT_FOUND", message, 404)


class ConflictError(AppError):
    def __init__(self, message: str = "Resource already exists"):
        super().__init__("CONFLICT", message, 409)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden"):
        super().__init__("FORBIDDEN", message, 403)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__("UNAUTHORIZED", message, 401)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.code, "message": exc.error_message},
    )


async def general_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"},
    )
