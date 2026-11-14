from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import hash_refresh_token, new_refresh_token
from app.auth.sessions import revoke_session, session_is_active
from app.config import Settings
from app.models import AuthSession, RefreshToken, User
from app.models.base import as_utc, utcnow

logger = logging.getLogger(__name__)


class RefreshRejectedError(Exception):
    def __init__(self, reused: bool = False) -> None:
        self.reused = reused
        super().__init__("refresh rejected")


def issue_refresh_token(
    db: Session,
    session: AuthSession,
    settings: Settings,
    *,
    now: datetime | None = None,
) -> str:
    current = now or utcnow()
    raw = new_refresh_token()
    row = RefreshToken(
        session_id=session.id,
        token_hash=hash_refresh_token(raw),
        expires_at=current + timedelta(days=settings.refresh_token_expire_days),
        created_at=current,
    )
    db.add(row)
    db.flush()
    return raw


def _find_token(db: Session, raw_token: str) -> RefreshToken | None:
    digest = hash_refresh_token(raw_token)
    return db.scalar(select(RefreshToken).where(RefreshToken.token_hash == digest))


def rotate_refresh_token(
    db: Session,
    raw_token: str,
    settings: Settings,
    *,
    now: datetime | None = None,
) -> tuple[User, AuthSession, str]:
    current = now or utcnow()
    row = _find_token(db, raw_token)
    if row is None or as_utc(row.expires_at) <= current:
        raise RefreshRejectedError()

    session = db.get(AuthSession, row.session_id)
    if session is None:
        raise RefreshRejectedError()
    user = db.get(User, session.user_id)
    if user is None or not user.is_active or not session_is_active(session, current):
        raise RefreshRejectedError()

    if row.used_at is not None:
        age = (current - as_utc(row.used_at)).total_seconds()
        if age > settings.refresh_reuse_grace_seconds:
            revoke_session(db, session, "refresh_reuse", current)
            logger.warning("refresh token reuse detected session_id=%s", session.id)
        raise RefreshRejectedError(reused=True)

    row.used_at = current
    raw = issue_refresh_token(db, session, settings, now=current)
    replacement = _find_token(db, raw)
    if replacement is None:
        raise RefreshRejectedError()
    row.replaced_by_id = replacement.id
    session.last_used_at = current
    db.add(row)
    db.add(session)
    return user, session, raw


def session_id_for_refresh_token(db: Session, raw_token: str) -> uuid.UUID | None:
    row = _find_token(db, raw_token)
    if row is None:
        return None
    return row.session_id
