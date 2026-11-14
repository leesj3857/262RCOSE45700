from __future__ import annotations

import uuid
from datetime import date, datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.adapters.classifier.base import ChoiceAnswer, ScoreAnswer
from app.adapters.classifier.factory import get_classifier
from app.adapters.extractor.factory import get_extractor
from app.adapters.stt.factory import get_stt_adapter
from app.config import Settings
from app.domain.taxonomy.loader import load_taxonomy
from app.domain.taxonomy.questions import build_questions
from app.models import Issue, Recording, Transcript
from app.models.base import utcnow
from app.schemas.common import Classified, Evidenced, IssueExtraction
from app.services.glossary import correct_text, load_glossary
from app.services.state_text import build_state_text
from app.services.verify import apply_confidence_gate, apply_stt_confidence, verify_evidence


class ExternalCallError(Exception):
    pass


def _as_evidenced(value: str | None, evidence: str | None) -> Evidenced[str]:
    return Evidenced[str](value=value, evidence=evidence)


def run_pipeline(
    db: Session,
    settings: Settings,
    *,
    user_id: uuid.UUID,
    audio_path: Path,
    recorded_at: datetime | None,
    vehicle_number: str | None = None,
    occurred_on: date | None = None,
    autonomy_version: str | None = None,
    map_version: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> Issue:
    try:
        return _run(
            db,
            settings,
            user_id=user_id,
            audio_path=audio_path,
            recorded_at=recorded_at,
            vehicle_number=vehicle_number,
            occurred_on=occurred_on,
            autonomy_version=autonomy_version,
            map_version=map_version,
            latitude=latitude,
            longitude=longitude,
        )
    except NotImplementedError as exc:
        raise ExternalCallError(str(exc)) from exc


def _run(
    db: Session,
    settings: Settings,
    *,
    user_id: uuid.UUID,
    audio_path: Path,
    recorded_at: datetime | None,
    vehicle_number: str | None,
    occurred_on: date | None,
    autonomy_version: str | None,
    map_version: str | None,
    latitude: float | None,
    longitude: float | None,
) -> Issue:
    taxonomy = load_taxonomy()
    glossary = load_glossary()
    stt = get_stt_adapter(settings)
    hints = glossary.terms if stt.capabilities.supports_hints else []
    transcript = stt.transcribe(audio_path, hints)
    corrected = correct_text(transcript.text, glossary)
    extractor = get_extractor(settings)
    extracted = extractor.extract(corrected)
    state_text = build_state_text(corrected, extracted.cause.value, extracted.location.value)
    classified = get_classifier(settings).classify(state_text, build_questions(taxonomy))
    words = [word.model_copy() for word in transcript.words]

    cause = verify_evidence(_as_evidenced(extracted.cause.value, extracted.cause.evidence), corrected)
    location = verify_evidence(_as_evidenced(extracted.location.value, extracted.location.evidence), corrected)
    mentioned = verify_evidence(
        _as_evidenced(extracted.mentioned_time.value, extracted.mentioned_time.evidence),
        corrected,
    )
    cause = apply_stt_confidence(cause, corrected, words, settings)
    location = apply_stt_confidence(location, corrected, words, settings)
    mentioned = apply_stt_confidence(mentioned, corrected, words, settings)

    event_type = Classified[str](value=None, probabilities={}, confidence=None)
    severity = Classified[str](value=None, probabilities={}, confidence=None)
    guided = {group_id: Classified[str]() for group_id in taxonomy.guide}
    for answer in classified.answers:
        if isinstance(answer, ChoiceAnswer) and answer.id == "event_type":
            event_type = apply_confidence_gate(
                Classified[str](
                    value=answer.value,
                    probabilities=answer.probabilities,
                    confidence=answer.confidence,
                ),
                settings,
            )
        elif isinstance(answer, ChoiceAnswer) and answer.id in guided:
            guided[answer.id] = apply_confidence_gate(
                Classified[str](
                    value=answer.value,
                    probabilities=answer.probabilities,
                    confidence=answer.confidence,
                ),
                settings,
            )
        elif isinstance(answer, ScoreAnswer) and answer.id == "severity":
            label = None
            if answer.score is not None and 0 <= answer.score < len(taxonomy.severity_levels):
                label = taxonomy.severity_levels[answer.score].key
            severity = apply_confidence_gate(
                Classified[str](
                    value=label,
                    probabilities=answer.distribution,
                    confidence=answer.confidence,
                ),
                settings,
            )

    extraction = IssueExtraction(
        cause=cause,
        location=location,
        mentioned_time=mentioned,
        event_type=event_type,
        severity=severity,
        road_type=guided["road_type"],
        ego_action_before=guided["ego_action_before"],
        target_type=guided["target_type"],
        ego_reaction=guided["ego_reaction"],
    )
    when = recorded_at or utcnow()
    recording = Recording(audio_path=str(audio_path), recorded_at=when, user_id=user_id)
    db.add(recording)
    db.flush()
    db.add(
        Transcript(
            recording_id=recording.id,
            raw_text=transcript.text,
            corrected_text=corrected,
            words=[word.model_dump() for word in words],
            stt_provider=transcript.provider,
        )
    )
    issue = Issue(
        recording_id=recording.id,
        ai_extraction=extraction.model_dump(mode="json"),
        final_extraction=None,
        status="draft",
        pipeline_meta={
            "stt_provider": transcript.provider,
            "extractor_model": settings.claude_model,
            "jev_model_version": settings.jev_model_version,
            "taxonomy_version": taxonomy.version,
            "thresholds": {
                "cls_conf_high": settings.cls_conf_high,
                "cls_conf_low": settings.cls_conf_low,
                "stt_conf_min": settings.stt_conf_min,
            },
        },
        vehicle_number=vehicle_number,
        occurred_on=occurred_on,
        autonomy_version=autonomy_version,
        map_version=map_version,
        latitude=latitude,
        longitude=longitude,
        content=corrected,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue
