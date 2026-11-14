from __future__ import annotations

import re

from app.adapters.extractor.base import Extraction, ExtractorAdapter, TextFact, narrative_from_stats

CAUSE_RULES: list[tuple[str, str]] = [
    ("컷인", "컷인"),
    ("끼어들", "끼어들기"),
    ("급제동", "급제동"),
    ("불법주정차", "불법주정차"),
    ("보행자", "보행자 돌출"),
    ("이륜차", "이륜차 돌출"),
    ("오토바이", "이륜차 돌출"),
    ("라바콘", "공사구간"),
    ("신호등", "신호 문제"),
]
LOCATION_RE = re.compile(r"[가-힣A-Za-z0-9]+(?:대로|로|길|역|사거리|교차로)")
TIME_RE = re.compile(r"(?:오전|오후)?\s*\d{1,2}시(?:\s*\d{1,2}분)?")


def evidence_sentence(text: str, needle: str) -> str | None:
    index = text.find(needle)
    if index < 0:
        return None
    start = max(text.rfind(".", 0, index) + 1, text.rfind("\n", 0, index) + 1)
    end_candidates = [pos for pos in (text.find(".", index), text.find("\n", index)) if pos >= 0]
    end = (min(end_candidates) + 1) if end_candidates else len(text)
    snippet = text[start:end].strip()
    return snippet or needle


class MockExtractor(ExtractorAdapter):
    def extract(self, transcript_text: str) -> Extraction:
        cause = TextFact()
        for needle, value in CAUSE_RULES:
            if needle in transcript_text:
                cause = TextFact(value=value, evidence=evidence_sentence(transcript_text, needle))
                break
        location = TextFact()
        located = LOCATION_RE.search(transcript_text)
        if located:
            location = TextFact(value=located.group(0), evidence=located.group(0))
        mentioned = TextFact()
        timed = TIME_RE.search(transcript_text)
        if timed:
            snippet = timed.group(0).strip()
            if snippet in transcript_text:
                mentioned = TextFact(value=snippet, evidence=snippet)
        return Extraction(cause=cause, location=location, mentioned_time=mentioned)

    def summarize(self, stats: dict[str, object]) -> str:
        return narrative_from_stats(stats)
