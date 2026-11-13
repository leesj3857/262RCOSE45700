from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Issue, Recording
from app.schemas.issues import SummaryStats


def _json_text(session: Session, column: object, path: str) -> object:
    parts = path.split(".")
    dialect = session.get_bind().dialect.name
    if dialect == "postgresql":
        return func.jsonb_extract_path_text(column, *parts)
    return func.json_extract(column, f"$.{path}")


def _event_expr(session: Session) -> object:
    return func.coalesce(
        _json_text(session, Issue.final_extraction, "event_type.value"),
        _json_text(session, Issue.ai_extraction, "event_type.value"),
    )


def _cause_expr(session: Session) -> object:
    return func.coalesce(
        _json_text(session, Issue.final_extraction, "cause.value"),
        _json_text(session, Issue.ai_extraction, "cause.value"),
    )


def _count_between(session: Session, start: datetime, end: datetime) -> int:
    stmt = (
        select(func.count(Issue.id))
        .join(Recording, Recording.id == Issue.recording_id)
        .where(Recording.recorded_at >= start, Recording.recorded_at < end)
    )
    return int(session.scalar(stmt) or 0)


def _grouped(session: Session, expression: object, start: datetime, end: datetime) -> dict[str, int]:
    stmt = (
        select(expression, func.count(Issue.id))
        .join(Recording, Recording.id == Issue.recording_id)
        .where(Recording.recorded_at >= start, Recording.recorded_at < end)
        .group_by(expression)
    )
    counts: dict[str, int] = {}
    for key, count in session.execute(stmt).all():
        if key is None:
            continue
        counts[str(key)] = int(count)
    return counts


def aggregate_weekly(session: Session, start: datetime, end: datetime) -> SummaryStats:
    previous_start = start - (end - start)
    count = _count_between(session, start, end)
    previous_count = _count_between(session, previous_start, start)
    return SummaryStats(
        count=count,
        previous_count=previous_count,
        delta=count - previous_count,
        by_event_type=_grouped(session, _event_expr(session), start, end),
        by_cause=_grouped(session, _cause_expr(session), start, end),
    )
