from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.errors import INVALID_AUTH, LOGIN_FAILED, RESP_401
from app.auth.cookies import clear_refresh_cookie, set_refresh_cookie
from app.auth.deps import get_current_user, get_db, get_settings, issue_access_token
from app.auth.security import decode_access_token, verify_password
from app.auth.sessions import create_session, get_session, revoke_all_sessions, revoke_session
from app.auth.tokens import (
    RefreshRejectedError,
    issue_refresh_token,
    rotate_refresh_token,
    session_id_for_refresh_token,
)
from app.config import Settings
from app.models import User
from app.models.base import utcnow
from app.schemas.auth import TokenResponse, UserPublic

router = APIRouter()


def _token_response(user: User, session_id: uuid.UUID, settings: Settings) -> TokenResponse:
    return TokenResponse(
        access_token=issue_access_token(user, session_id, settings),
        token_type="bearer",
        expires_in=settings.access_token_expires_in,
        user=UserPublic.model_validate(user),
    )


def _unauthorized(settings: Settings) -> JSONResponse:
    response = JSONResponse(status_code=401, content={"detail": INVALID_AUTH})
    clear_refresh_cookie(response, settings)
    return response


def _authenticate(db: Session, username: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.username == username))
    password_hash = None if user is None else user.password_hash
    if not verify_password(password, password_hash) or user is None or not user.is_active:
        return None
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    response_model_exclude_none=True,
    summary="로그인",
    description="form 인코딩(username, password)으로 로그인합니다. 성공하면 access token 과 refresh 쿠키를 발급합니다.",
    responses={
        401: {
            "description": LOGIN_FAILED,
            "content": {"application/json": {"example": {"detail": LOGIN_FAILED}}},
        }
    },
)
def login(
    request: Request,
    response: Response,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    user = _authenticate(db, form.username, form.password)
    if user is None:
        raise HTTPException(status_code=401, detail=LOGIN_FAILED)
    session = create_session(db, user, settings, user_agent=request.headers.get("user-agent"))
    raw_refresh = issue_refresh_token(db, session, settings)
    db.commit()
    set_refresh_cookie(response, settings, raw_refresh)
    return _token_response(user, session.id, settings)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    response_model_exclude_none=True,
    summary="access token 갱신",
    description="refresh 쿠키를 회전하고 새 access token 을 발급합니다. 재사용이 유예 시간을 넘으면 세션을 폐기합니다.",
    responses=RESP_401,
)
def refresh(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TokenResponse | JSONResponse:
    raw = request.cookies.get(settings.refresh_cookie_name)
    if not raw:
        return _unauthorized(settings)
    try:
        user, session, rotated = rotate_refresh_token(db, raw, settings)
    except RefreshRejectedError:
        db.commit()
        return _unauthorized(settings)
    db.commit()
    body = _token_response(user, session.id, settings)
    response = JSONResponse(status_code=200, content=body.model_dump(mode="json", exclude_none=True))
    set_refresh_cookie(response, settings, rotated)
    return response


@router.post(
    "/logout",
    status_code=204,
    summary="로그아웃",
    description="유효한 access token 또는 refresh 쿠키 중 하나만 있어도 현재 세션을 폐기합니다. 항상 204 입니다.",
)
def logout(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    session_id: uuid.UUID | None = None
    header = request.headers.get("authorization")
    if header and header.lower().startswith("bearer "):
        payload = decode_access_token(header.split(" ", 1)[1], settings)
        if payload and payload.get("sid"):
            try:
                session_id = uuid.UUID(str(payload["sid"]))
            except ValueError:
                session_id = None
    if session_id is None:
        raw = request.cookies.get(settings.refresh_cookie_name)
        if raw:
            session_id = session_id_for_refresh_token(db, raw)
    if session_id is not None:
        session = get_session(db, session_id)
        if session is not None:
            revoke_session(db, session, "logout", utcnow())
            db.commit()
    response = Response(status_code=204)
    clear_refresh_cookie(response, settings)
    return response


@router.post(
    "/logout-all",
    status_code=204,
    summary="모든 세션 로그아웃",
    description="현재 사용자의 모든 세션을 폐기합니다.",
    responses=RESP_401,
)
def logout_all(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    revoke_all_sessions(db, user.id, "logout_all", utcnow())
    db.commit()
    response = Response(status_code=204)
    clear_refresh_cookie(response, settings)
    return response


@router.get(
    "/me",
    response_model=UserPublic,
    summary="현재 사용자",
    description="access token 의 세션이 유효하면 현재 사용자 정보를 반환합니다. 권한 판단에 쓰는 역할은 DB 값입니다.",
    responses=RESP_401,
)
def me(user: User = Depends(get_current_user)) -> User:
    return user
