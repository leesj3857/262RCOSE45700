from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import AuthSession, User
from app.models.base import as_utc, utcnow


def create_session(
    db: Session,
    user: User,
    settings: Settings,
    *,
    user_agent: str | None,
    now: datetime | None = None,
) -> AuthSession:
    current = now or utcnow()
    session = AuthSession(
        user_id=user.id,
        created_at=current,
        last_used_at=current,
        expires_at=current + timedelta(days=settings.session_absolute_days),
        user_agent=(user_agent or None) and (user_agent or "")[:255],
    )
    db.add(session)
    db.flush()
    return session


def get_session(db: Session, session_id: uuid.UUID) -> AuthSession | None:
    return db.get(AuthSession, session_id)


def session_is_active(session: AuthSession | None, now: datetime | None = None) -> bool:
    if session is None or session.revoked_at is not None:
        return False
    current = now or utcnow()
    return as_utc(session.expires_at) > current


def revoke_session(db: Session, session: AuthSession, reason: str, now: datetime | None = None) -> None:
    if session.revoked_at is not None:
        return
    session.revoked_at = now or utcnow()
    session.revoke_reason = reason
    db.add(session)


def revoke_all_sessions(db: Session, user_id: uuid.UUID, reason: str, now: datetime | None = None) -> None:
    current = now or utcnow()
    sessions = db.scalars(
        select(AuthSession).where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
    ).all()
    for session in sessions:
        revoke_session(db, session, reason, current)
