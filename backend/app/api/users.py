from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.errors import RESP_401, RESP_403
from app.auth.deps import get_db, require_role
from app.models import User
from app.schemas.auth import UserCreate, UserPublic, UserUpdate
from app.services.users import DuplicateUsernameError, add_user, update_user

router = APIRouter()


@router.post(
    "",
    response_model=UserPublic,
    status_code=201,
    summary="사용자 생성",
    description="관리자가 계정을 만듭니다. 셀프 가입은 없습니다.",
    responses={**RESP_401, **RESP_403, 409: {"description": "이미 있는 아이디"}},
)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> User:
    try:
        user = add_user(
            db,
            username=payload.username,
            password=payload.password,
            display_name=payload.display_name,
            role=payload.role,
        )
    except DuplicateUsernameError as exc:
        raise HTTPException(status_code=409, detail="이미 사용 중인 아이디입니다.") from exc
    db.commit()
    db.refresh(user)
    return user


@router.get(
    "",
    response_model=list[UserPublic],
    summary="사용자 목록",
    description="관리자가 전체 사용자를 조회합니다.",
    responses={**RESP_401, **RESP_403},
)
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> list[User]:
    return list(db.scalars(select(User).order_by(User.created_at.asc())).all())


@router.patch(
    "/{user_id}",
    response_model=UserPublic,
    summary="사용자 수정",
    description="이름, 역할, 활성 상태를 수정합니다. 비활성화하면 해당 사용자의 세션을 모두 폐기합니다.",
    responses={**RESP_401, **RESP_403, 404: {"description": "사용자를 찾을 수 없습니다."}},
)
def patch_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return update_user(db, user, payload)
