from __future__ import annotations

from pydantic import BaseModel, Field


class TextFact(BaseModel):
    value: str | None = None
    evidence: str | None = None


class Extraction(BaseModel):
    cause: TextFact
    location: TextFact
    mentioned_time: TextFact


class ExtractorAdapter:
    def extract(self, transcript_text: str) -> Extraction:
        raise NotImplementedError

    def summarize(self, stats: dict[str, object]) -> str:
        raise NotImplementedError


def narrative_from_stats(stats: dict[str, object]) -> str:
    count = stats["count"]
    previous = stats["previous_count"]
    delta = stats["delta"]
    by_type = stats["by_event_type"]
    return (
        f"이번 기간 이슈는 {count}건이며 직전 기간 {previous}건보다 {delta}건 차이입니다. "
        f"유형별 건수는 {by_type} 입니다."
    )


class SummaryStatsPayload(BaseModel):
    count: int
    previous_count: int
    delta: int
    by_event_type: dict[str, int] = Field(default_factory=dict)
    by_cause: dict[str, int] = Field(default_factory=dict)
