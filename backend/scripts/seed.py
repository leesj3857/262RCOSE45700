from __future__ import annotations

import sys
from pathlib import Path

from app.config import get_settings
from app.db import make_engine, make_session_factory
from app.models import Issue, User
from app.models.base import utcnow
from app.services.pipeline import run_pipeline
from app.services.users import add_user
from sqlalchemy import func, select


def _ensure_user(db, *, username: str, password: str, display_name: str, role: str) -> User:
    existing = db.scalar(select(User).where(User.username == username))
    if existing is not None:
        return existing
    if not password:
        print(f"{username} 계정을 만들 비밀번호 환경변수가 비어 있습니다.", file=sys.stderr)
        raise SystemExit(1)
    return add_user(db, username=username, password=password, display_name=display_name, role=role)


def _silent_wav() -> bytes:
    return (
        b"RIFF"
        + (36).to_bytes(4, "little")
        + b"WAVE"
        + b"fmt "
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


def main() -> None:
    settings = get_settings()
    db = make_session_factory(make_engine(settings))()
    try:
        admin = _ensure_user(
            db,
            username=settings.seed_admin_username,
            password=settings.seed_admin_password,
            display_name="관리자",
            role="admin",
        )
        operators = [
            _ensure_user(
                db,
                username=getattr(settings, f"seed_operator{index}_username"),
                password=getattr(settings, f"seed_operator{index}_password"),
                display_name=f"오퍼레이터{index}",
                role="operator",
            )
            for index in (1, 2, 3)
        ]
        if db.scalar(select(func.count()).select_from(Issue)) == 0:
            storage = Path(settings.storage_dir)
            storage.mkdir(parents=True, exist_ok=True)
            audio_path = storage / "seed-demo.wav"
            audio_path.write_bytes(_silent_wav())
            run_pipeline(db, settings, user_id=operators[0].id, audio_path=audio_path, recorded_at=utcnow())
        db.commit()
    finally:
        db.close()
    print(f"시드 완료: admin={admin.username}, operators={', '.join(user.username for user in operators)}")


if __name__ == "__main__":
    main()
