.PHONY: up down build restart logs logs-api logs-worker logs-frontend logs-db dev db dev-api dev-worker dev-frontend install migrate clean

# === Docker Compose (Production) ===

up:
	docker compose up

up-build:
	docker compose up --build

up-detach:
	docker compose up -d --build

down:
	docker compose down

down-clean:
	docker compose down -v --rmi local

restart:
	docker compose down && docker compose up --build

# === Logs ===

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

logs-worker:
	docker compose logs -f worker

logs-frontend:
	docker compose logs -f frontend

logs-db:
	docker compose logs -f postgres

# === Local Development (infra in Docker, app on host) ===

db:
	docker compose up -d postgres redis minio

dev: db
	@echo "Starting API, Celery worker, and frontend dev servers..."
	@make -j3 dev-api dev-worker dev-frontend

dev-api:
	cd backend && venv/bin/uvicorn app.main:app --reload --port 8000

dev-worker:
	cd backend && venv/bin/celery -A app.worker:celery_app worker --loglevel=info

dev-frontend:
	cd frontend && pnpm dev

# === Database Migrations ===

migrate:
	cd backend && venv/bin/alembic upgrade head

migrate-create:
	cd backend && venv/bin/alembic revision --autogenerate -m "$(msg)"

# === Setup ===

install:
	cd backend && python3 -m venv venv && venv/bin/pip install -r requirements.txt
	cd frontend && pnpm install

# === Cleanup ===

clean:
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; true
	rm -rf frontend/dist
