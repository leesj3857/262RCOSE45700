from __future__ import annotations

import uuid
from datetime import date, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.errors import EXTERNAL_FAILED, RESP_401, RESP_413, RESP_422, RESP_503, UPLOAD_TOO_LARGE
from app.auth.deps import get_current_user, get_db, get_settings
from app.config import Settings
from app.models import Issue, Recording, User
from app.schemas.issues import RecordingResult
from app.services.issues import to_issue_out
from app.services.pipeline import ExternalCallError, run_pipeline

router = APIRouter()


ALLOWED_AUDIO_SUFFIXES = {".wav", ".mp3", ".m4a", ".webm", ".ogg"}
CHUNK_BYTES = 1024 * 1024


def _store_upload(upload: UploadFile, storage_dir: str, max_bytes: int) -> Path:
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in ALLOWED_AUDIO_SUFFIXES:
        raise HTTPException(status_code=422, detail="지원하지 않는 오디오 형식입니다.")
    destination_dir = Path(storage_dir)
    destination_dir.mkdir(parents=True, exist_ok=True)
    path = destination_dir / f"{uuid.uuid4()}{suffix}"
    size = 0
    try:
        with path.open("wb") as out:
            while chunk := upload.file.read(CHUNK_BYTES):
                size += len(chunk)
                if size > max_bytes:
                    raise HTTPException(status_code=413, detail=UPLOAD_TOO_LARGE)
                out.write(chunk)
        if size == 0:
            raise HTTPException(status_code=422, detail="오디오 파일이 비어 있습니다.")
    except BaseException:
        path.unlink(missing_ok=True)
        raise
    return path


def _check_coordinates(latitude: float | None, longitude: float | None) -> None:
    if latitude is not None and not -90 <= latitude <= 90:
        raise HTTPException(status_code=422, detail="latitude 범위가 아닙니다.")
    if longitude is not None and not -180 <= longitude <= 180:
        raise HTTPException(status_code=422, detail="longitude 범위가 아닙니다.")


@router.post(
    "",
    response_model=RecordingResult,
    summary="녹음 업로드",
    description=(
        "STT, 용어 보정, 사실 추출, 분류, 검증 후 draft 이슈를 만듭니다. 소유자는 로그인한 사용자입니다. "
        "허용 형식은 wav, mp3, m4a, webm, ogg 이고 크기 상한은 MAX_UPLOAD_MB 입니다."
    ),
    responses={**RESP_401, **RESP_413, **RESP_422, **RESP_503},
)
def create_recording(
    audio: UploadFile = File(..., description="녹음 파일"),
    recorded_at: datetime | None = Form(default=None, description="발화 시각. 없으면 서버 시각"),
    vehicle_number: str | None = Form(default=None, description="차량 번호"),
    occurred_on: date | None = Form(default=None, description="발생일자. 발화 시각과 별개"),
    autonomy_version: str | None = Form(default=None, description="자율주행 버전"),
    map_version: str | None = Form(default=None, description="맵 버전"),
    latitude: float | None = Form(default=None, description="위도"),
    longitude: float | None = Form(default=None, description="경도"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RecordingResult:
    _check_coordinates(latitude, longitude)
    path = _store_upload(audio, settings.storage_dir, settings.max_upload_bytes)
    try:
        issue = run_pipeline(
            db,
            settings,
            user_id=user.id,
            audio_path=path,
            recorded_at=recorded_at,
            vehicle_number=vehicle_number,
            occurred_on=occurred_on,
            autonomy_version=autonomy_version,
            map_version=map_version,
            latitude=latitude,
            longitude=longitude,
        )
    except ExternalCallError as exc:
        path.unlink(missing_ok=True)
        raise HTTPException(status_code=503, detail=EXTERNAL_FAILED) from exc
    except Exception:
        path.unlink(missing_ok=True)
        raise
    stored = db.scalar(
        select(Issue).options(joinedload(Issue.recording).joinedload(Recording.transcript)).where(Issue.id == issue.id)
    )
    if stored is None:
        raise HTTPException(status_code=503, detail=EXTERNAL_FAILED)
    viewed = to_issue_out(stored)
    return RecordingResult(
        recording_id=viewed.recording_id,
        issue_id=viewed.id,
        recorded_at=viewed.recorded_at,
        status=viewed.status,
        transcript=viewed.transcript,
        extraction=viewed.ai_extraction,
        ticket=viewed.ticket,
        pipeline_meta=viewed.pipeline_meta,
    )
