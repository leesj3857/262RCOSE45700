from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.issues import router as issues_router
from app.api.recordings import router as recordings_router
from app.api.summary import router as summary_router
from app.api.users import router as users_router
from app.config import Settings, assert_runtime_secrets, get_settings
from app.db import make_engine, make_session_factory

OPENAPI_TAGS = [
    {"name": "system", "description": "서버 상태"},
    {"name": "auth", "description": "로그인, 토큰 갱신, 로그아웃"},
    {"name": "users", "description": "관리자용 사용자 관리"},
    {"name": "recordings", "description": "녹음 업로드와 파이프라인"},
    {"name": "issues", "description": "이슈 조회와 오퍼레이터 확인"},
    {"name": "summary", "description": "관리자용 주간 요약"},
]

DESCRIPTION = """
오퍼레이터 음성 기반 주행 이슈 리포팅 API.

녹음을 텍스트로 바꾸고, 사실과 사건 유형을 정리해 저장한 뒤 주간 요약을 만듭니다.

## 인증 사용법
1. `POST /api/auth/login` 으로 로그인합니다. Swagger 의 Authorize 도 이 주소를 사용합니다.
2. 응답의 access token 으로 보호된 API 를 호출합니다.
3. access token 이 만료되면 `POST /api/auth/refresh` 로 갱신합니다.
4. `POST /api/auth/logout` 으로 현재 세션을 끝냅니다.
"""


def create_app(settings: Settings | None = None) -> FastAPI:
    active = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        assert_runtime_secrets(app.state.settings)
        yield

    app = FastAPI(
        title="주행 이슈 리포팅 API",
        version="0.1.0",
        description=DESCRIPTION,
        openapi_tags=OPENAPI_TAGS,
        docs_url="/docs" if active.enable_docs else None,
        redoc_url="/redoc" if active.enable_docs else None,
        swagger_ui_parameters={"persistAuthorization": True},
        lifespan=lifespan,
    )
    app.state.settings = active
    app.state.engine = make_engine(active)
    app.state.session_factory = make_session_factory(app.state.engine)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=active.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
    app.include_router(users_router, prefix="/api/users", tags=["users"])
    app.include_router(recordings_router, prefix="/api/recordings", tags=["recordings"])
    app.include_router(issues_router, prefix="/api/issues", tags=["issues"])
    app.include_router(summary_router, prefix="/api/summary", tags=["summary"])

    @app.get(
        "/health",
        tags=["system"],
        summary="서버 상태 확인",
        description="프로세스 상태를 확인합니다. 인증이 필요 없습니다.",
    )
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
