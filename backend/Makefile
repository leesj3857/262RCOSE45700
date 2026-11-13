.PHONY: up dev test lint migrate seed contracts purge

up:
	@test -f .env || cp .env.example .env
	docker compose up --build

dev:
	uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	uv run pytest

lint:
	uv run ruff check .
	uv run ruff format --check .

migrate:
	uv run alembic upgrade head

seed:
	uv run python -m scripts.seed

contracts:
	uv run python -m scripts.export_contracts

purge:
	uv run python -m scripts.purge_expired_sessions
