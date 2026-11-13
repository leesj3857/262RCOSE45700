from __future__ import annotations

from typing import Never

from app.adapters.classifier.base import (
    ChoiceAnswer,
    ChoiceQuestion,
    ClassificationResult,
    ClassifierAdapter,
    NoulAnswer,
    NoulQuestion,
    Question,
    ScoreAnswer,
    ScoreQuestion,
)
from app.domain.taxonomy.loader import Taxonomy, load_taxonomy


def _confidence(hits: int) -> float:
    if hits <= 0:
        return 0.2
    if hits == 1:
        return 0.9
    return min(0.99, 0.9 + 0.03 * (hits - 1))


def _normalize(scores: dict[str, float]) -> dict[str, float]:
    total = sum(scores.values()) or 1.0
    return {key: round(value / total, 4) for key, value in scores.items()}


def _keyword_hits(text: str, keywords: list[str]) -> tuple[int, int]:
    hits = 0
    earliest = 10**9
    for keyword in keywords:
        count = text.count(keyword)
        if count:
            hits += count
            earliest = min(earliest, text.find(keyword))
    return hits, earliest


class MockClassifier(ClassifierAdapter):
    def __init__(self, taxonomy: Taxonomy | None = None) -> None:
        self._taxonomy = taxonomy or load_taxonomy()

    def classify(self, state_text: str, questions: list[Question]) -> ClassificationResult:
        answers: list[ChoiceAnswer | ScoreAnswer | NoulAnswer] = []
        for question in questions:
            answers.append(self._answer(state_text, question))
        return ClassificationResult(answers=answers)

    def _answer(self, state_text: str, question: Question) -> ChoiceAnswer | ScoreAnswer | NoulAnswer:
        if isinstance(question, ChoiceQuestion):
            return self._choice(state_text, question)
        if isinstance(question, ScoreQuestion):
            return self._score(state_text, question)
        if isinstance(question, NoulQuestion):
            return self._noul(state_text, question)
        never: Never = question
        raise AssertionError(never)

    def _keywords_for(self, question_id: str) -> dict[str, list[str]]:
        if question_id == "event_type":
            return {item.key: item.keywords for item in self._taxonomy.event_types}
        group = self._taxonomy.guide.get(question_id)
        if group is None:
            return {}
        return {item.key: item.keywords for item in group.options}

    def _choice(self, state_text: str, question: ChoiceQuestion) -> ChoiceAnswer:
        keywords = self._keywords_for(question.id)
        scored: list[tuple[str, int, int]] = []
        for option in question.options:
            hits, earliest = _keyword_hits(state_text, keywords.get(option.key, []))
            scored.append((option.key, hits, earliest))
        best = max(scored, key=lambda item: (item[1], -item[2]))
        probabilities = _normalize({key: hits + 0.05 for key, hits, _earliest in scored})
        return ChoiceAnswer(
            id=question.id,
            value=best[0],
            probabilities=probabilities,
            confidence=_confidence(best[1]),
        )

    def _score(self, state_text: str, question: ScoreQuestion) -> ScoreAnswer:
        levels = self._taxonomy.severity_levels
        scored = []
        for index, level in enumerate(levels[: question.levels]):
            hits, earliest = _keyword_hits(state_text, level.keywords)
            scored.append((index, level.key, hits, earliest))
        best = max(scored, key=lambda item: (item[2], -item[3]))
        distribution = _normalize({key: hits + 0.05 for _index, key, hits, _earliest in scored})
        return ScoreAnswer(
            id=question.id,
            score=best[0],
            distribution=distribution,
            confidence=_confidence(best[2]),
        )

    def _noul(self, state_text: str, question: NoulQuestion) -> NoulAnswer:
        del state_text
        return NoulAnswer(id=question.id, probability=0.08, confidence=_confidence(0))
