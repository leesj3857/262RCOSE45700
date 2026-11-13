import uuid
from datetime import timedelta

import pytest
from app.auth.security import decode_access_token, encode_access_token, hash_refresh_token
from app.config import JWT_SECRET_PLACEHOLDER, Settings, assert_runtime_secrets
from app.main import create_app
from app.models import AuthSession, Base, RefreshToken, User
from app.models.base import utcnow
from app.services.users import add_user
from fastapi.testclient import TestClient

from tests.conftest import ADMIN_PASSWORD, OPERATOR_PASSWORD, auth_header, login, refresh_cookie, refresh_with

LOGIN_FAILED = "아이디 또는 비밀번호가 올바르지 않습니다"


def test_login_form_success_and_same_failure_message(client: TestClient, app) -> None:
    ok = login(client, "operator1", OPERATOR_PASSWORD)
    body = ok.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["username"] == "operator1"
    assert "password_hash" not in ok.text
    cookie = ok.headers["set-cookie"].lower()
    assert "httponly" in cookie
    assert "samesite=lax" in cookie
    assert "path=/api/auth" in cookie
    attributes = cookie.split(";", maxsplit=1)[1]
    assert "secure" not in attributes

    json_login = client.post("/api/auth/login", json={"username": "operator1", "password": OPERATOR_PASSWORD})
    assert json_login.status_code == 422

    missing = client.post("/api/auth/login", data={"username": "nobody", "password": "wrong-pass"})
    wrong = client.post("/api/auth/login", data={"username": "operator1", "password": "wrong-pass"})
    created = app.state.session_factory()
    inactive = add_user(created, username="inactive", password="inactive-pass-1", display_name="중지", role="operator")
    inactive.is_active = False
    created.commit()
    created.close()
    disabled = client.post("/api/auth/login", data={"username": "inactive", "password": "inactive-pass-1"})
    assert missing.status_code == wrong.status_code == disabled.status_code == 401
    assert missing.json()["detail"] == wrong.json()["detail"] == disabled.json()["detail"] == LOGIN_FAILED


def test_token_missing_expired_and_forged(client: TestClient, app) -> None:
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers=auth_header("not-a-token")).status_code == 401
    logged = login(client, "operator1", OPERATOR_PASSWORD)
    payload = decode_access_token(logged.json()["access_token"], app.state.settings)
    assert payload is not None
    expired = encode_access_token(
        user_id=str(payload["sub"]),
        session_id=str(payload["sid"]),
        settings=app.state.settings,
        issued_at=int(utcnow().timestamp()) - 3600,
        expires_at=int(utcnow().timestamp()) - 10,
    )
    assert client.get("/api/auth/me", headers=auth_header(expired)).status_code == 401


def test_refresh_rotation_grace_and_reuse(client: TestClient, app) -> None:
    first = login(client, "operator1", OPERATOR_PASSWORD)
    assert "refresh_token" not in first.json()
    raw_first = refresh_cookie(first)
    access_first = first.json()["access_token"]
    rotated = refresh_with(client, raw_first)
    assert rotated.status_code == 200, rotated.text
    assert "refresh_token" not in rotated.json()
    access_second = rotated.json()["access_token"]
    raw_second = refresh_cookie(rotated)
    assert raw_second != raw_first

    reused = refresh_with(client, raw_first)
    assert reused.status_code == 401
    assert client.get("/api/auth/me", headers=auth_header(access_first)).status_code == 200

    db = app.state.session_factory()
    row = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_refresh_token(raw_first)).one()
    row.used_at = utcnow() - timedelta(seconds=app.state.settings.refresh_reuse_grace_seconds + 5)
    db.commit()
    db.close()

    stolen = refresh_with(client, raw_first)
    assert stolen.status_code == 401
    assert client.get("/api/auth/me", headers=auth_header(access_first)).status_code == 401
    assert client.get("/api/auth/me", headers=auth_header(access_second)).status_code == 401

    assert refresh_with(client, raw_second).status_code == 401


def test_logout_is_immediate_idempotent_and_accepts_refresh_cookie(client: TestClient, app) -> None:
    logged = login(client, "operator1", OPERATOR_PASSWORD)
    access = logged.json()["access_token"]
    payload = decode_access_token(access, app.state.settings)
    assert payload is not None
    expired = encode_access_token(
        user_id=str(payload["sub"]),
        session_id=str(payload["sid"]),
        settings=app.state.settings,
        issued_at=int(utcnow().timestamp()) - 120,
        expires_at=int(utcnow().timestamp()) - 30,
    )
    assert client.post("/api/auth/logout", headers=auth_header(expired)).status_code == 204
    assert client.get("/api/auth/me", headers=auth_header(access)).status_code == 401
    assert client.post("/api/auth/logout").status_code == 204
    assert client.post("/api/auth/logout", headers=auth_header(access)).status_code == 204


def test_logout_all_revokes_every_session(client: TestClient) -> None:
    first = login(client, "operator1", OPERATOR_PASSWORD)
    second = login(client, "operator1", OPERATOR_PASSWORD)
    assert client.post("/api/auth/logout-all", headers=auth_header(first.json()["access_token"])).status_code == 204
    assert client.get("/api/auth/me", headers=auth_header(first.json()["access_token"])).status_code == 401
    assert client.get("/api/auth/me", headers=auth_header(second.json()["access_token"])).status_code == 401


def test_deactivation_revokes_existing_session(client: TestClient, accounts) -> None:
    logged = login(client, "operator1", OPERATOR_PASSWORD)
    admin = login(client, "admin", ADMIN_PASSWORD)
    response = client.patch(
        f"/api/users/{accounts['operator']}",
        json={"is_active": False},
        headers=auth_header(admin.json()["access_token"]),
    )
    assert response.status_code == 200
    assert client.get("/api/auth/me", headers=auth_header(logged.json()["access_token"])).status_code == 401
    blocked = client.post("/api/auth/login", data={"username": "operator1", "password": OPERATOR_PASSWORD})
    assert blocked.status_code == 401
    assert blocked.json()["detail"] == LOGIN_FAILED


def test_absolute_session_lifetime_blocks_refresh(client: TestClient, app) -> None:
    logged = login(client, "operator1", OPERATOR_PASSWORD)
    payload = decode_access_token(logged.json()["access_token"], app.state.settings)
    assert payload is not None
    db = app.state.session_factory()
    session = db.get(AuthSession, uuid.UUID(str(payload["sid"])))
    assert session is not None
    session.expires_at = utcnow() - timedelta(seconds=1)
    db.commit()
    db.close()
    assert refresh_with(client, refresh_cookie(logged)).status_code == 401


def test_secrets_are_hashed_and_hidden(client: TestClient, app) -> None:
    logged = login(client, "operator1", OPERATOR_PASSWORD)
    db = app.state.session_factory()
    user = db.query(User).filter(User.username == "operator1").one()
    raw_refresh = refresh_cookie(logged)
    digest = hash_refresh_token(raw_refresh)
    token = db.query(RefreshToken).filter(RefreshToken.token_hash == digest).one()
    assert user.password_hash != OPERATOR_PASSWORD
    assert user.password_hash.startswith("$argon2")
    assert token.token_hash != raw_refresh
    assert len(token.token_hash) == 64
    db.close()
    admin_token = login(client, "admin", ADMIN_PASSWORD).json()["access_token"]
    listed = client.get("/api/users", headers=auth_header(admin_token))
    assert "password_hash" not in listed.text


def test_secure_cookie_outside_dev(tmp_path) -> None:
    settings = Settings(
        _env_file=None,
        app_env="prod",
        jwt_secret="prod-secret-value-should-be-long-enough",
        database_url=f"sqlite:///{tmp_path}/prod.db",
        storage_dir=str(tmp_path / "storage"),
    )
    application = create_app(settings)
    Base.metadata.create_all(application.state.engine)
    db = application.state.session_factory()
    add_user(db, username="admin", password=ADMIN_PASSWORD, display_name="관리자", role="admin")
    db.commit()
    db.close()
    with TestClient(application) as prod_client:
        response = prod_client.post("/api/auth/login", data={"username": "admin", "password": ADMIN_PASSWORD})
    assert response.status_code == 200
    assert "Secure" in response.headers["set-cookie"]


def test_placeholder_secret_guard(tmp_path, caplog) -> None:
    dev = Settings(_env_file=None, app_env="dev", jwt_secret=JWT_SECRET_PLACEHOLDER, database_url="sqlite://")
    with caplog.at_level("WARNING"):
        assert_runtime_secrets(dev)
    assert "JWT_SECRET" in caplog.text

    blocked = Settings(
        _env_file=None,
        app_env="prod",
        jwt_secret=JWT_SECRET_PLACEHOLDER,
        database_url=f"sqlite:///{tmp_path}/blocked.db",
    )
    application = create_app(blocked)
    with pytest.raises(RuntimeError):
        with TestClient(application):
            pass
