import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("annotateflow.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Adds request ID to every request and logs structured access info."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        start = time.perf_counter()

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        response.headers["X-Request-ID"] = request_id

        # Skip noisy health/polling endpoints
        path = request.url.path
        if path not in ("/api/health", "/api/pipeline/status", "/api/pipeline/recent"):
            logger.info(
                "request_id=%s method=%s path=%s status=%s duration_ms=%s",
                request_id, request.method, path, response.status_code, duration_ms,
            )

        return response
