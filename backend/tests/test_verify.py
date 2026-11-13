from app.config import Settings
from app.schemas.common import Classified, Evidenced, WordToken
from app.services.glossary import correct_text
from app.services.state_text import build_state_text
from app.services.verify import apply_confidence_gate, apply_stt_confidence, find_span, verify_evidence


def test_span_exact_match() -> None:
    text = "앞에서 급제동했다"
    result = verify_evidence(Evidenced[str](value="급제동", evidence="급제동했다"), text)
    assert result.span == [text.find("급제동했다"), text.find("급제동했다") + len("급제동했다")]
    assert result.value == "급제동"
    assert result.needs_review is False


def test_span_whitespace_normalized() -> None:
    text = "급  제동 했다"
    result = verify_evidence(Evidenced[str](value="급제동", evidence="급 제동 했다"), text)
    assert result.value == "급제동"
    assert result.span == find_span(text, "급 제동 했다")
    assert result.needs_review is False


def test_missing_evidence_nulls_value() -> None:
    result = verify_evidence(Evidenced[str](value="충돌", evidence="없는 문장"), "실제 전사문")
    assert result.value is None
    assert result.span is None
    assert result.needs_review is True
    assert result.review_reason == "근거 구절 없음"


def test_confidence_gate_bands() -> None:
    settings = Settings(_env_file=None, cls_conf_high=0.85, cls_conf_low=0.55, jwt_secret="x")
    high = apply_confidence_gate(
        Classified[str](value="cut_in", confidence=0.9, probabilities={"cut_in": 0.9}),
        settings,
    )
    middle = apply_confidence_gate(
        Classified[str](value="cut_in", confidence=0.6, probabilities={"cut_in": 0.6}),
        settings,
    )
    low = apply_confidence_gate(
        Classified[str](value="cut_in", confidence=0.2, probabilities={"cut_in": 0.2}),
        settings,
    )
    assert high.value == "cut_in" and high.needs_review is False
    assert middle.value == "cut_in" and middle.needs_review is True
    assert low.value is None and low.needs_review is True


def test_stt_confidence_overlap_marks_review() -> None:
    settings = Settings(_env_file=None, stt_conf_min=0.6, jwt_secret="x")
    text = "강남대로에서 급제동"
    field = Evidenced[str](value="강남대로", evidence="강남대로", span=[0, 4])
    words = [WordToken(text="강남대로에서", start=0, end=0.4, confidence=0.2)]
    result = apply_stt_confidence(field, text, words, settings)
    assert result.needs_review is True
    assert result.review_reason == "STT 단어 신뢰도 부족"


def test_glossary_replaces_mishearings() -> None:
    assert correct_text("앞에 라바 콘과 컷 인이 있다") == "앞에 라바콘과 컷인이 있다"


def test_state_text_keeps_only_transcript_cause_location() -> None:
    text = build_state_text("전사문", "원인값", "위치값")
    assert "전사문" in text
    assert "원인: 원인값" in text
    assert "위치: 위치값" in text
    assert "mentioned_time" not in text
    assert "severity" not in text
    assert "road_type" not in text
    assert "ego_reaction" not in text
    assert "target_type" not in text
    assert set(build_state_text.__code__.co_varnames) >= {"transcript", "cause", "location"}
