from __future__ import annotations

import mimetypes
import uuid
from datetime import datetime
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.errors import ISSUE_NOT_FOUND, RESP_401, RESP_404, RESP_422
from app.auth.deps import get_current_user, get_db
from app.domain.taxonomy.loader import event_type_keys
from app.models import User
from app.schemas.issues import IssueOut, IssueUpdate
from app.services.issues import apply_issue_update, get_visible_issue, list_visible_issues, to_issue_out

router = APIRouter()


def _require_issue(db: Session, issue_id: uuid.UUID, user: User):
    issue = get_visible_issue(db, issue_id, user)
    if issue is None:
        raise HTTPException(status_code=404, detail=ISSUE_NOT_FOUND)
    return issue


@router.get(
    "",
    response_model=list[IssueOut],
    summary="이슈 목록",
    description="오퍼레이터는 자신의 이슈만, 관리자는 전체를 봅니다.",
    responses={**RESP_401, **RESP_422},
)
def list_issues(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Literal["draft", "confirmed"] | None = None,
    event_type: str | None = None,
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = None,
) -> list[IssueOut]:
    if event_type is not None and event_type not in event_type_keys():
        raise HTTPException(status_code=422, detail="taxonomy 에 없는 event_type 입니다.")
    issues = list_visible_issues(db, user, status=status, event_type=event_type, start=from_, end=to)
    return [to_issue_out(issue) for issue in issues]


@router.get(
    "/{issue_id}",
    response_model=IssueOut,
    summary="이슈 상세",
    description="다른 오퍼레이터의 이슈는 존재하지 않는 것처럼 404 입니다.",
    responses={**RESP_401, **RESP_404},
)
def get_issue(
    issue_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IssueOut:
    return to_issue_out(_require_issue(db, issue_id, user))


@router.patch(
    "/{issue_id}",
    response_model=IssueOut,
    summary="이슈 확인·수정",
    description="오퍼레이터가 값을 고치고 확정하면 final_extraction 과 issue_edits 에 수정자와 함께 남습니다.",
    responses={**RESP_401, **RESP_404, **RESP_422},
)
def patch_issue(
    issue_id: uuid.UUID,
    payload: IssueUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IssueOut:
    issue = _require_issue(db, issue_id, user)
    updated = apply_issue_update(db, issue, user, payload)
    visible = get_visible_issue(db, updated.id, user)
    if visible is None:
        raise HTTPException(status_code=404, detail=ISSUE_NOT_FOUND)
    return to_issue_out(visible)


@router.get(
    "/{issue_id}/audio",
    summary="원본 음성",
    description="오디오 바이트를 반환합니다. 프론트는 Authorization 헤더로 받은 뒤 blob URL 로 재생합니다.",
    responses={**RESP_401, **RESP_404},
)
def get_audio(
    issue_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    issue = _require_issue(db, issue_id, user)
    path = Path(issue.recording.audio_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail=ISSUE_NOT_FOUND)
    media_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return FileResponse(path, media_type=media_type, filename=path.name)
