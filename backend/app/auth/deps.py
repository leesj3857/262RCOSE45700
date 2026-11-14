from __future__ import annotations

import uuid
from collections.abc import Callable, Iterator
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.api.errors import FORBIDDEN, INVALID_AUTH
from app.auth.security import decode_access_token, encode_access_token
from app.auth.sessions import get_session, session_is_active
from app.config import Settings
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_db(request: Request) -> Iterator[Session]:
    db = request.app.state.session_factory()
    try:
        yield db
    finally:
        db.close()


def issue_access_token(user: User, session_id: uuid.UUID, settings: Settings, now: datetime | None = None) -> str:
    current = now or datetime.now(UTC)
    expires = current + timedelta(minutes=settings.access_token_expire_minutes)
    return encode_access_token(
        user_id=str(user.id),
        session_id=str(session_id),
        settings=settings,
        issued_at=int(current.timestamp()),
        expires_at=int(expires.timestamp()),
    )


def get_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User:
    del request
    if not token:
        raise HTTPException(status_code=401, detail=INVALID_AUTH)
    payload = decode_access_token(token, settings)
    if payload is None or "sub" not in payload or "sid" not in payload:
        raise HTTPException(status_code=401, detail=INVALID_AUTH)
    try:
        user_id = uuid.UUID(str(payload["sub"]))
        session_id = uuid.UUID(str(payload["sid"]))
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=INVALID_AUTH) from exc
    session = get_session(db, session_id)
    if not session_is_active(session):
        raise HTTPException(status_code=401, detail=INVALID_AUTH)
    user = db.get(User, user_id)
    if user is None or not user.is_active or session is None or user.id != session.user_id:
        raise HTTPException(status_code=401, detail=INVALID_AUTH)
    return user


def require_role(role: str) -> Callable[..., User]:
    def _dependency(user: User = Depends(get_current_user)) -> User:
        if user.role != role:
            raise HTTPException(status_code=403, detail=FORBIDDEN)
        return user

    return _dependency
