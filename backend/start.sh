#!/bin/bash
# Start both API and Celery worker in one process (for free tier hosting)
alembic upgrade head &
celery -A app.worker:celery_app worker --loglevel=info --concurrency=2 &
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
