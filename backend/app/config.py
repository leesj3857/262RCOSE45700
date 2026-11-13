from __future__ import annotations

import logging
from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

JWT_SECRET_PLACEHOLDER = "change-me"


class Settings(BaseSettings):
    app_env: str = "dev"
    enable_docs: bool = True
    database_url: str = "postgresql+psycopg://app:app@localhost:5432/issues"
    storage_dir: str = "storage"
    max_upload_mb: int = 25

    jwt_secret: str = JWT_SECRET_PLACEHOLDER
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    session_absolute_days: int = 30
    refresh_reuse_grace_seconds: int = 10
    refresh_cookie_name: str = "refresh_token"
    refresh_cookie_secure: bool | None = None
    refresh_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    refresh_cookie_path: str = "/api/auth"

    seed_admin_password: str = ""
    seed_operator1_password: str = ""
    seed_operator2_password: str = ""
    seed_operator3_password: str = ""
    seed_admin_username: str = "admin"
    seed_operator1_username: str = "operator1"
    seed_operator2_username: str = "operator2"
    seed_operator3_username: str = "operator3"

    # Claude, GPT, Jev, 게이트웨이 STT 가 같은 키를 쓴다.
    gateway_base_url: str = ""
    gateway_api_key: str = ""
    claude_model: str = ""
    jev_model_version: str = ""

    stt_provider: Literal["mock", "gateway"] = "mock"
    extractor_provider: Literal["mock", "gateway_claude"] = "mock"
    classifier_provider: Literal["mock", "gateway_jev"] = "mock"

    # 임시값. tune 데이터로 보정 후 확정.
    cls_conf_high: float = 0.85
    cls_conf_low: float = 0.55
    stt_conf_min: float = 0.6

    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("refresh_cookie_secure", mode="before")
    @classmethod
    def empty_secure_is_none(cls, value: object) -> object:
        if value == "" or value is None:
            return None
        return value

    @field_validator("jev_model_version")
    @classmethod
    def reject_latest_alias(cls, value: str) -> str:
        if value.strip().lower() == "latest":
            raise ValueError("JEV_MODEL_VERSION 에 latest 별칭을 쓸 수 없습니다.")
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [item.strip() for item in self.cors_origins.split(",") if item.strip()]
        if not origins or "*" in origins:
            raise RuntimeError("CORS origin 은 명시 목록이어야 하며 '*' 는 허용하지 않습니다.")
        return origins

    @property
    def cookie_secure(self) -> bool:
        if self.refresh_cookie_secure is not None:
            return self.refresh_cookie_secure
        return self.app_env != "dev"

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def access_token_expires_in(self) -> int:
        return self.access_token_expire_minutes * 60


def assert_runtime_secrets(settings: Settings) -> None:
    if settings.jwt_secret == JWT_SECRET_PLACEHOLDER:
        message = "JWT_SECRET 이 자리표시 값입니다. .env 에서 바꾼 뒤 실행하세요."
        if settings.app_env == "dev":
            logger.warning(message)
            return
        raise RuntimeError(message)


@lru_cache
def get_settings() -> Settings:
    return Settings()
