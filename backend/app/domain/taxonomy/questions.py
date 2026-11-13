from __future__ import annotations

from app.adapters.classifier.base import ChoiceOption, ChoiceQuestion, Question, ScoreQuestion
from app.domain.taxonomy.loader import Taxonomy, load_taxonomy


def build_questions(taxonomy: Taxonomy | None = None) -> list[Question]:
    spec = taxonomy or load_taxonomy()
    questions: list[Question] = [
        ChoiceQuestion(
            id="event_type",
            prompt="전사와 추출된 원인·위치에 맞는 사건 유형을 고르세요.",
            options=[ChoiceOption(key=item.key, description=item.description) for item in spec.event_types],
        ),
        ScoreQuestion(
            id="severity",
            prompt="심각도를 단계 점수로 판정하세요.",
            levels=len(spec.severity_levels),
        ),
    ]
    questions.extend(
        ChoiceQuestion(
            id=group_id,
            prompt=group.prompt,
            options=[ChoiceOption(key=item.key, description=item.description) for item in group.options],
        )
        for group_id, group in spec.guide.items()
    )
    return questions
