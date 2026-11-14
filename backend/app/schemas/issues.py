from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain.taxonomy.loader import choice_keys, event_type_keys, severity_keys
from app.schemas.common import IssueExtraction


class IssueTicket(BaseModel):
    """지라에 올릴 항목 중, 발화 분류와 별도로 저장하는 값."""

    vehicle_number: str | None = None
    occurred_on: date | None = None
    autonomy_version: str | None = None
    map_version: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    content: str | None = None


class TranscriptOut(BaseModel):
    raw_text: str
    corrected_text: str
    words: list[dict]
    stt_provider: str


class RecordingResult(BaseModel):
    recording_id: uuid.UUID
    issue_id: uuid.UUID
    recorded_at: datetime
    status: Literal["draft", "confirmed"]
    transcript: TranscriptOut
    extraction: IssueExtraction
    ticket: IssueTicket
    pipeline_meta: dict

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "recording_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                    "issue_id": "8d8a0a3e-3c1e-4b7a-9d2a-6e3c1b2a4f10",
                    "recorded_at": "2026-11-09T05:00:00Z",
                    "status": "draft",
                    "transcript": {
                        "raw_text": "강남대로에서 검은 차가 컷 인해서 급제동했다.",
                        "corrected_text": "강남대로에서 검은 차가 컷인해서 급제동했다.",
                        "words": [{"text": "급제동했다", "start": 1.2, "end": 1.8, "confidence": 0.91}],
                        "stt_provider": "mock",
                    },
                    "extraction": IssueExtraction.model_config["json_schema_extra"]["examples"][0],
                    "ticket": {
                        "vehicle_number": "12가3456",
                        "occurred_on": "2026-11-09",
                        "autonomy_version": None,
                        "map_version": None,
                        "latitude": 37.5,
                        "longitude": 127.0,
                        "content": "강남대로에서 검은 차가 컷인해서 급제동했다.",
                    },
                    "pipeline_meta": {
                        "stt_provider": "mock",
                        "extractor_model": "",
                        "jev_model_version": "",
                        "taxonomy_version": "v1",
                        "thresholds": {"cls_conf_high": 0.85, "cls_conf_low": 0.55, "stt_conf_min": 0.6},
                    },
                }
            ]
        }
    )


class IssueOut(BaseModel):
    id: uuid.UUID
    recording_id: uuid.UUID
    recorded_at: datetime
    operator_id: uuid.UUID
    status: Literal["draft", "confirmed"]
    ai_extraction: IssueExtraction
    final_extraction: IssueExtraction | None
    confirmed_at: datetime | None
    confirmed_by: uuid.UUID | None
    pipeline_meta: dict
    ticket: IssueTicket
    transcript: TranscriptOut


def _choice_in_taxonomy(group_id: str, value: str | None) -> str | None:
    if value is not None and value not in choice_keys(group_id):
        raise ValueError(f"taxonomy 에 없는 {group_id} 입니다.")
    return value


class IssueUpdate(BaseModel):
    cause: str | None = None
    location: str | None = None
    mentioned_time: str | None = None
    event_type: str | None = None
    severity: str | None = None
    road_type: str | None = None
    ego_action_before: str | None = None
    target_type: str | None = None
    ego_reaction: str | None = None
    vehicle_number: str | None = Field(default=None, max_length=64)
    occurred_on: date | None = None
    autonomy_version: str | None = Field(default=None, max_length=64)
    map_version: str | None = Field(default=None, max_length=64)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    content: str | None = None
    confirm: bool = True

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "event_type": "cut_in",
                    "severity": "high",
                    "road_type": "intersection",
                    "target_type": "vehicle",
                    "ego_reaction": "hard_decel",
                    "cause": "컷인",
                    "location": "강남대로",
                    "vehicle_number": "12가3456",
                    "content": "강남대로에서 검은 차가 컷인해서 급제동했다.",
                    "confirm": True,
                }
            ]
        }
    )

    @field_validator("event_type")
    @classmethod
    def event_type_in_taxonomy(cls, value: str | None) -> str | None:
        if value is not None and value not in event_type_keys():
            raise ValueError("taxonomy 에 없는 event_type 입니다.")
        return value

    @field_validator("severity")
    @classmethod
    def severity_in_taxonomy(cls, value: str | None) -> str | None:
        if value is not None and value not in severity_keys():
            raise ValueError("taxonomy 에 없는 severity 입니다.")
        return value

    @field_validator("road_type")
    @classmethod
    def road_type_in_taxonomy(cls, value: str | None) -> str | None:
        return _choice_in_taxonomy("road_type", value)

    @field_validator("ego_action_before")
    @classmethod
    def ego_action_before_in_taxonomy(cls, value: str | None) -> str | None:
        return _choice_in_taxonomy("ego_action_before", value)

    @field_validator("target_type")
    @classmethod
    def target_type_in_taxonomy(cls, value: str | None) -> str | None:
        return _choice_in_taxonomy("target_type", value)

    @field_validator("ego_reaction")
    @classmethod
    def ego_reaction_in_taxonomy(cls, value: str | None) -> str | None:
        return _choice_in_taxonomy("ego_reaction", value)


class SummaryStats(BaseModel):
    count: int
    previous_count: int
    delta: int
    by_event_type: dict[str, int]
    by_cause: dict[str, int]


class WeeklySummary(BaseModel):
    from_: datetime = Field(alias="from")
    to: datetime
    stats: SummaryStats
    narrative: str

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "examples": [
                {
                    "from": "2026-11-02T00:00:00Z",
                    "to": "2026-11-09T00:00:00Z",
                    "stats": {
                        "count": 4,
                        "previous_count": 1,
                        "delta": 3,
                        "by_event_type": {"cut_in": 2, "sudden_brake": 2},
                        "by_cause": {"컷인": 2},
                    },
                    "narrative": "이번 기간 이슈는 4건이며 직전 기간보다 3건 많습니다.",
                }
            ]
        },
    )
