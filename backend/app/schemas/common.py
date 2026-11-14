from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class Evidenced(BaseModel, Generic[T]):
    value: T | None = None
    evidence: str | None = None
    span: list[int] | None = None
    needs_review: bool = False
    review_reason: str | None = None


class Classified(BaseModel, Generic[T]):
    value: T | None = None
    probabilities: dict[str, float] = Field(default_factory=dict)
    confidence: float | None = None
    needs_review: bool = False


def empty_classified() -> Classified[str]:
    return Classified[str]()


class IssueExtraction(BaseModel):
    cause: Evidenced[str]
    location: Evidenced[str]
    mentioned_time: Evidenced[str]
    event_type: Classified[str]
    severity: Classified[str]
    road_type: Classified[str] = Field(default_factory=empty_classified)
    ego_action_before: Classified[str] = Field(default_factory=empty_classified)
    target_type: Classified[str] = Field(default_factory=empty_classified)
    ego_reaction: Classified[str] = Field(default_factory=empty_classified)

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "cause": {
                        "value": "컷인",
                        "evidence": "검은 차가 컷인해서 급제동했다",
                        "span": [8, 24],
                        "needs_review": False,
                        "review_reason": None,
                    },
                    "location": {
                        "value": "강남대로",
                        "evidence": "강남대로에서",
                        "span": [0, 6],
                        "needs_review": False,
                        "review_reason": None,
                    },
                    "mentioned_time": {
                        "value": None,
                        "evidence": None,
                        "span": None,
                        "needs_review": False,
                        "review_reason": None,
                    },
                    "event_type": {
                        "value": "cut_in",
                        "probabilities": {"cut_in": 0.82, "other": 0.18},
                        "confidence": 0.82,
                        "needs_review": False,
                    },
                    "severity": {
                        "value": "high",
                        "probabilities": {"low": 0.05, "medium": 0.15, "high": 0.8},
                        "confidence": 0.8,
                        "needs_review": False,
                    },
                    "road_type": {
                        "value": None,
                        "probabilities": {"intersection": 0.2},
                        "confidence": 0.2,
                        "needs_review": True,
                    },
                    "ego_action_before": {
                        "value": None,
                        "probabilities": {"going_straight": 0.2},
                        "confidence": 0.2,
                        "needs_review": True,
                    },
                    "target_type": {
                        "value": "vehicle",
                        "probabilities": {"vehicle": 0.9, "pedestrian": 0.04},
                        "confidence": 0.9,
                        "needs_review": False,
                    },
                    "ego_reaction": {
                        "value": "hard_decel",
                        "probabilities": {"hard_decel": 0.9, "stop": 0.05},
                        "confidence": 0.9,
                        "needs_review": False,
                    },
                }
            ]
        }
    )


class WordToken(BaseModel):
    text: str
    start: float
    end: float
    confidence: float | None = None


class ErrorBody(BaseModel):
    detail: str
