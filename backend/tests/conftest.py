from __future__ import annotations

import uuid

import pytest
from app.config import Settings
from app.main import create_app
from app.models import Base
from app.services.users import add_user
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

ADMIN_PASSWORD = "admin-pass-123"
OPERATOR_PASSWORD = "operator-pass-123"
OTHER_PASSWORD = "operator-pass-456"


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        _env_file=None,
        app_env="dev",
        database_url=f"sqlite:///{tmp_path}/app.db",
        storage_dir=str(tmp_path / "storage"),
        jwt_secret="test-secret-value-should-be-long-enough",
        cors_origins="http://localhost:5173",
    )


@pytest.fixture
def app(settings: Settings):
    application = create_app(settings)
    Base.metadata.create_all(application.state.engine)
    return application


@pytest.fixture
def db(app) -> Session:
    session = app.state.session_factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def accounts(db: Session) -> dict[str, uuid.UUID]:
    admin = add_user(db, username="admin", password=ADMIN_PASSWORD, display_name="관리자", role="admin")
    operator = add_user(
        db, username="operator1", password=OPERATOR_PASSWORD, display_name="오퍼레이터1", role="operator"
    )
    other = add_user(db, username="operator2", password=OTHER_PASSWORD, display_name="오퍼레이터2", role="operator")
    db.commit()
    return {"admin": admin.id, "operator": operator.id, "other": other.id}


@pytest.fixture
def client(app, accounts):
    del accounts
    with TestClient(app) as test_client:
        yield test_client


def login(client: TestClient, username: str, password: str):
    response = client.post("/api/auth/login", data={"username": username, "password": password})
    assert response.status_code == 200, response.text
    return response


def refresh_with(client: TestClient, raw_token: str):
    """쿠키 저장소를 비우고 지정한 refresh 원문만 쿠키 헤더로 보낸다."""
    client.cookies.clear()
    return client.post("/api/auth/refresh", headers={"Cookie": f"refresh_token={raw_token}"})


def refresh_cookie(response) -> str:
    value = response.cookies.get("refresh_token")
    assert value, response.headers
    return value


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def wav_bytes() -> bytes:
    return (
        b"RIFF"
        + (36).to_bytes(4, "little")
        + b"WAVEfmt "
        + (16).to_bytes(4, "little")
        + (1).to_bytes(2, "little")
        + (1).to_bytes(2, "little")
        + (8000).to_bytes(4, "little")
        + (8000).to_bytes(4, "little")
        + (1).to_bytes(2, "little")
        + (8).to_bytes(2, "little")
        + b"data"
        + (0).to_bytes(4, "little")
    )


def upload(client: TestClient, token: str, **form):
    return client.post(
        "/api/recordings",
        files={"audio": ("sample.wav", wav_bytes(), "audio/wav")},
        data=form,
        headers=auth_header(token),
    )
