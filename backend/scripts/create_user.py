from __future__ import annotations

import argparse
import os
import sys

from app.config import get_settings
from app.db import make_engine, make_session_factory
from app.services.users import DuplicateUsernameError, add_user


def main() -> None:
    parser = argparse.ArgumentParser(description="사용자를 만듭니다. 비밀번호는 환경변수에서 읽습니다.")
    parser.add_argument("--username", required=True)
    parser.add_argument("--display-name", required=True)
    parser.add_argument("--role", choices=["operator", "admin"], required=True)
    parser.add_argument("--password-env", required=True, help="비밀번호가 들어 있는 환경변수 이름")
    args = parser.parse_args()
    password = os.environ.get(args.password_env, "")
    if not password:
        print(f"{args.password_env} 가 비어 있습니다.", file=sys.stderr)
        raise SystemExit(1)
    settings = get_settings()
    db = make_session_factory(make_engine(settings))()
    try:
        add_user(db, username=args.username, password=password, display_name=args.display_name, role=args.role)
        db.commit()
    except DuplicateUsernameError:
        print("이미 있는 아이디입니다.", file=sys.stderr)
        raise SystemExit(1) from None
    finally:
        db.close()
    print(f"생성했습니다: {args.username}")


if __name__ == "__main__":
    main()
