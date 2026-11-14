from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.auth.sessions import revoke_all_sessions
from app.models import User
from app.models.base import utcnow
from app.schemas.auth import UserUpdate


class DuplicateUsernameError(Exception):
    pass


def add_user(db: Session, *, username: str, password: str, display_name: str, role: str) -> User:
    existing = db.scalar(select(User).where(User.username == username))
    if existing is not None:
        raise DuplicateUsernameError(username)
    user = User(
        username=username,
        password_hash=hash_password(password),
        display_name=display_name,
        role=role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def update_user(db: Session, user: User, payload: UserUpdate) -> User:
    if payload.display_name is not None:
        user.display_name = payload.display_name
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is False:
        user.is_active = False
        revoke_all_sessions(db, user.id, "deactivated", utcnow())
    elif payload.is_active is True:
        user.is_active = True
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
