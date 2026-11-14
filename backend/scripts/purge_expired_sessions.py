from __future__ import annotations

from app.config import get_settings
from app.db import make_engine, make_session_factory
from app.models import AuthSession, RefreshToken
from app.models.base import utcnow
from sqlalchemy import delete, or_, select, update


def main() -> None:
    settings = get_settings()
    db = make_session_factory(make_engine(settings))()
    now = utcnow()
    try:
        stale_ids = list(
            db.scalars(
                select(AuthSession.id).where(or_(AuthSession.expires_at < now, AuthSession.revoked_at.is_not(None)))
            ).all()
        )
        db.execute(update(RefreshToken).where(RefreshToken.replaced_by_id.is_not(None)).values(replaced_by_id=None))
        token_filters = [RefreshToken.expires_at < now]
        if stale_ids:
            token_filters.append(RefreshToken.session_id.in_(stale_ids))
        token_result = db.execute(delete(RefreshToken).where(or_(*token_filters)))
        removed_sessions = 0
        if stale_ids:
            removed = db.execute(delete(AuthSession).where(AuthSession.id.in_(stale_ids)))
            removed_sessions = removed.rowcount or 0
        db.commit()
    finally:
        db.close()
    print(f"세션 {removed_sessions}건, refresh token {token_result.rowcount or 0}건을 삭제했습니다.")


if __name__ == "__main__":
    main()
