from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.adapters.extractor.factory import get_extractor
from app.api.errors import RESP_401, RESP_403, RESP_422
from app.auth.deps import get_db, get_settings, require_role
from app.config import Settings
from app.models import User
from app.schemas.issues import WeeklySummary
from app.services.pipeline import ExternalCallError
from app.services.summary import aggregate_weekly

router = APIRouter()


@router.get(
    "/weekly",
    response_model=WeeklySummary,
    summary="주간 요약",
    description="건수와 분포는 SQL 집계만 사용하고, 문장은 그 숫자를 풀어 쓴 결과입니다.",
    responses={**RESP_401, **RESP_403, **RESP_422, 503: {"description": "요약 문장 생성에 실패했습니다."}},
)
def weekly_summary(
    from_: datetime = Query(alias="from"),
    to: datetime = Query(),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    _: User = Depends(require_role("admin")),
) -> WeeklySummary:
    if to <= from_:
        raise HTTPException(status_code=422, detail="to 는 from 보다 이후여야 합니다.")
    if to - from_ > timedelta(days=366):
        raise HTTPException(status_code=422, detail="조회 기간이 너무 깁니다.")
    stats = aggregate_weekly(db, from_, to)
    try:
        narrative = get_extractor(settings).summarize(stats.model_dump())
    except NotImplementedError as exc:
        raise HTTPException(status_code=503, detail="요약 문장 생성에 실패했습니다. 다시 시도해 주세요.") from exc
    except ExternalCallError as exc:
        raise HTTPException(status_code=503, detail="요약 문장 생성에 실패했습니다. 다시 시도해 주세요.") from exc
    return WeeklySummary.model_validate({"from": from_, "to": to, "stats": stats, "narrative": narrative})
