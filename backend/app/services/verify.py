from __future__ import annotations

from app.config import Settings
from app.schemas.common import Classified, Evidenced, WordToken


def _collapse(text: str) -> str:
    return " ".join(text.split())


def _normalize_with_map(text: str) -> tuple[str, list[int]]:
    chars: list[str] = []
    index_map: list[int] = []
    previous_space = False
    for index, char in enumerate(text):
        if char.isspace():
            if previous_space or not chars:
                continue
            chars.append(" ")
            index_map.append(index)
            previous_space = True
            continue
        chars.append(char)
        index_map.append(index)
        previous_space = False
    if chars and chars[-1] == " ":
        chars.pop()
        index_map.pop()
    return "".join(chars), index_map


def find_span(transcript: str, evidence: str) -> list[int] | None:
    if not evidence:
        return None
    exact = transcript.find(evidence)
    if exact >= 0:
        return [exact, exact + len(evidence)]
    normalized, index_map = _normalize_with_map(transcript)
    needle = _collapse(evidence)
    if not needle:
        return None
    found = normalized.find(needle)
    if found < 0:
        return None
    start = index_map[found]
    end = index_map[found + len(needle) - 1] + 1
    return [start, end]


def verify_evidence(field: Evidenced[str], transcript: str) -> Evidenced[str]:
    if field.value is None and not field.evidence:
        return field
    span = find_span(transcript, field.evidence or "")
    if span is None:
        return field.model_copy(
            update={
                "value": None,
                "span": None,
                "needs_review": True,
                "review_reason": "근거 구절 없음",
            }
        )
    return field.model_copy(update={"span": span, "needs_review": field.needs_review})


def apply_confidence_gate(field: Classified[str], settings: Settings) -> Classified[str]:
    # 임시 임계값. tune 데이터로 보정 후 확정.
    confidence = 0.0 if field.confidence is None else field.confidence
    if confidence >= settings.cls_conf_high:
        return field
    if confidence >= settings.cls_conf_low:
        return field.model_copy(update={"needs_review": True})
    return field.model_copy(update={"value": None, "needs_review": True})


def apply_stt_confidence(
    field: Evidenced[str],
    transcript: str,
    words: list[WordToken],
    settings: Settings,
) -> Evidenced[str]:
    if field.span is None or field.value is None:
        return field
    start, end = field.span
    cursor = 0
    for word in words:
        if word.confidence is None:
            continue
        index = transcript.find(word.text, cursor)
        if index < 0:
            continue
        word_end = index + len(word.text)
        cursor = word_end
        overlaps = index < end and word_end > start
        if overlaps and word.confidence < settings.stt_conf_min:
            reason = field.review_reason or "STT 단어 신뢰도 부족"
            return field.model_copy(update={"needs_review": True, "review_reason": reason})
    return field
